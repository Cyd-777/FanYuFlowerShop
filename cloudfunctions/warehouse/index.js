const cloud = require('wx-server-sdk')
const { bumpCacheEvent } = require('./common/cacheInvalidation')
const { isMerchant, ensureCollection } = require('./common/merchantGate')
const { resolveUserByWechatMp } = require('./common/account')
const { resolveFileUrls } = require('./common/fileUrls')
const { notifyStockMovement, safeFireAndForget } = require('./common/bizNotifyEmit')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// ── Shared Helpers ──

async function safeBumpGoodsStockCache() {
  try {
    await bumpCacheEvent('goodsStock')
  } catch (err) {
    console.error('[warehouse] bump goodsStock cache failed:', err.message || err)
  }
}

async function resolveOperatorProfile(openid) {
  if (!openid) return { openid: '', userId: '', name: '未知', avatarUrl: '' }

  let name = '工作人员'
  let userId = ''
  let avatarUrl = ''

  try {
    const user = await resolveUserByWechatMp(openid)
    userId = user?.userId || ''
    if (user?.nickName) name = user.nickName
    if (user?.avatarUrl) avatarUrl = user.avatarUrl
  } catch (err) {
    console.error('[warehouse] resolve operator user failed:', err.message || err)
  }

  try {
    await ensureCollection('merchants')
    const { data: byOpenid } = await db.collection('merchants').where({ openid }).limit(1).get()
    if (byOpenid[0]?.name) {
      name = byOpenid[0].name
    } else if (userId) {
      const { data: byUser } = await db.collection('merchants').where({ userId }).limit(1).get()
      if (byUser[0]?.name) name = byUser[0].name
    }
  } catch (err) {
    console.error('[warehouse] resolve operator merchant failed:', err.message || err)
  }

  return { openid, userId, name, avatarUrl }
}

async function appendWarehouseLedger(entry) {
  await ensureCollection('warehouse_ledger')
  await db.collection('warehouse_ledger').add({
    data: {
      ...entry,
      createdAt: db.serverDate(),
    },
  })
}

async function applyStockMovement({ goodsId, delta, direction, operatorOpenid, operator, batchId }) {
  const { data: doc } = await db.collection('goods').doc(goodsId).get()
  if (!doc) return { ok: false, errMsg: '商品不存在' }

  const stockBefore = Number(doc.stock) || 0
  const signedDelta = direction === 'in' ? delta : -delta
  const stockAfter = stockBefore + signedDelta

  if (delta <= 0) return { ok: false, errMsg: '数量无效' }
  if (direction === 'out' && stockAfter < 0) {
    return { ok: false, errMsg: `「${doc.name || '商品'}」可售数不足（当前 ${stockBefore}）` }
  }

  await db.collection('goods').doc(goodsId).update({
    data: { stock: _.inc(signedDelta), updatedAt: db.serverDate(), updatedBy: operatorOpenid },
  })

  await appendWarehouseLedger({
    type: direction === 'in' ? 'stock_in' : 'stock_out',
    batchId, goodsId,
    goodsName: doc.name || '', unit: doc.unit || '件',
    delta, stockBefore, stockAfter,
    operatorOpenid,
    operatorUserId: operator.userId || '',
    operatorName: operator.name || '工作人员',
    operatorAvatar: operator.avatarUrl || '',
  })

  safeFireAndForget(() =>
    notifyStockMovement({ goodsId, goodsName: doc.name || '', stockBefore, stockAfter }))

  return { ok: true, stockBefore, stockAfter, goodsId, goodsName: doc.name || '' }
}

// ── Actions ──

async function stockIn(event) {
  const items = Array.isArray(event.items) ? event.items : []
  if (!items.length) return { success: false, errMsg: '请填写入库数量' }

  await ensureCollection('goods')
  const operatorOpenid = event.operatorOpenid
  const operator = await resolveOperatorProfile(operatorOpenid)
  const batchId = `stock_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  let applied = 0
  const errors = []

  for (const raw of items) {
    const id = String(raw?.goodsId || raw?.id || '').trim()
    const delta = parseInt(raw?.delta, 10)
    if (!id || Number.isNaN(delta) || delta <= 0) continue

    const result = await applyStockMovement({ goodsId: id, delta, direction: 'in', operatorOpenid, operator, batchId })
    if (result.ok) applied += 1
    else if (result.errMsg) errors.push(result.errMsg)
  }

  if (!applied) return { success: false, errMsg: errors[0] || '没有有效的入库项' }
  await safeBumpGoodsStockCache()
  return { success: true, applied }
}

async function stockOut(event) {
  const items = Array.isArray(event.items) ? event.items : []
  if (!items.length) return { success: false, errMsg: '请填写出库数量' }

  await ensureCollection('goods')
  const operatorOpenid = event.operatorOpenid
  const operator = await resolveOperatorProfile(operatorOpenid)
  const batchId = `stock_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  let applied = 0
  const errors = []

  for (const raw of items) {
    const id = String(raw?.goodsId || raw?.id || '').trim()
    const delta = parseInt(raw?.delta, 10)
    if (!id || Number.isNaN(delta) || delta <= 0) continue

    const result = await applyStockMovement({ goodsId: id, delta, direction: 'out', operatorOpenid, operator, batchId })
    if (result.ok) applied += 1
    else if (result.errMsg) errors.push(result.errMsg)
  }

  if (!applied) return { success: false, errMsg: errors[0] || '没有有效的出库项' }
  await safeBumpGoodsStockCache()
  return { success: true, applied }
}

async function listWarehouseLedger(event) {
  const type = String(event.type || '').trim()
  const limit = Math.min(100, Math.max(1, parseInt(event.limit, 10) || 50))
  const skip = Math.max(0, parseInt(event.skip, 10) || 0)

  await ensureCollection('warehouse_ledger')

  let query = db.collection('warehouse_ledger')
  if (type === 'stock_in') {
    query = query.where({ type: _.in(['stock_in', 'order_rollback']) })
  } else if (type === 'stock_out') {
    query = query.where({ type: _.in(['stock_out', 'order_out']) })
  }

  const { data } = await query.orderBy('createdAt', 'desc').skip(skip).limit(limit * 3).get()

  // 按 batchId 分组
  const batchMap = new Map()
  for (const doc of data || []) {
    const bid = doc.batchId || doc._id
    if (!batchMap.has(bid)) {
      batchMap.set(bid, {
        batchId: bid, type: doc.type || 'stock_in',
        createdAt: doc.createdAt,
        operatorOpenid: doc.operatorOpenid || '',
        operatorUserId: doc.operatorUserId || '',
        operatorName: doc.operatorName || '',
        operatorAvatar: doc.operatorAvatar || '',
        orderId: doc.orderId || '', orderNo: doc.orderNo || '',
        items: [],
      })
    }
    batchMap.get(bid).items.push({
      goodsId: doc.goodsId || '', goodsName: doc.goodsName || '',
      unit: doc.unit || '件', delta: Number(doc.delta) || 0,
      stockBefore: Number(doc.stockBefore) || 0, stockAfter: Number(doc.stockAfter) || 0,
    })
  }

  const batches = []
  for (const batch of batchMap.values()) {
    const sorted = (data || []).filter((d) => (d.batchId || d._id) === batch.batchId)
    if (sorted.length) {
      const last = sorted[sorted.length - 1]
      batch.type = last.type
      batch.operatorName = last.operatorName || ''
      batch.operatorAvatar = last.operatorAvatar || ''
      batch.orderId = last.orderId || ''
      batch.orderNo = last.orderNo || ''
    }
    batches.push(batch)
  }

  batches.sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return tb - ta
  })
  const paged = batches.slice(skip, skip + limit)

  // 解析 cloud:// 头像
  const avatarIds = paged
    .map((b) => b.operatorAvatar)
    .filter((a) => a && String(a).startsWith('cloud://'))
  if (avatarIds.length) {
    const avatarUrlMap = await resolveFileUrls(avatarIds)
    for (const batch of paged) {
      if (batch.operatorAvatar && avatarUrlMap[batch.operatorAvatar]) {
        batch.operatorAvatar = avatarUrlMap[batch.operatorAvatar]
      }
    }
  }

  return { success: true, list: paged }
}

async function seedWarehouseTestData(event) {
  const operatorOpenid = event.operatorOpenid

  await ensureCollection('goods')
  const { data: goodsData } = await db.collection('goods').limit(5).get()
  const goodsNames = goodsData.map((g) => g.name || '商品')
  const goodsIds = goodsData.map((g) => g._id)

  if (!goodsIds.length) return { success: false, errMsg: '请先创建商品' }

  const { data: staffData } = await db.collection('merchants').limit(3).get()
  const staffNames = staffData.map((s) => s.name || s.nickName || '工作人员').filter(Boolean)
  if (!staffNames.length) staffNames.push('张店长', '李师傅', '王采购')

  await ensureCollection('warehouse_ledger')
  const now = Date.now()
  const days = [20, 21, 22, 23, 24, 25, 26, 27, 28]

  for (const dayOffset of days) {
    const dayStart = now - (28 - dayOffset) * 86400000
    const opsCount = 1 + Math.floor(Math.random() * 3)
    for (let o = 0; o < opsCount; o++) {
      const batchId = `test_${dayStart + o * 3600000}_${Math.random().toString(36).slice(2, 6)}`
      const isIn = Math.random() > 0.4
      const itemCount = 1 + Math.floor(Math.random() * 3)
      const operator = staffNames[Math.floor(Math.random() * staffNames.length)]

      for (let i = 0; i < itemCount; i++) {
        const gIdx = Math.floor(Math.random() * goodsIds.length)
        const delta = 5 + Math.floor(Math.random() * 50)
        const stockBefore = 30 + Math.floor(Math.random() * 200)
        const stockAfter = isIn ? stockBefore + delta : stockBefore - delta
        const type = isIn ? 'stock_in' : 'stock_out'

        await db.collection('warehouse_ledger').add({
          data: {
            batchId, type,
            goodsId: goodsIds[gIdx], goodsName: goodsNames[gIdx] || '商品', unit: '件',
            delta, stockBefore: Math.max(0, stockBefore), stockAfter: Math.max(0, stockAfter),
            operatorOpenid, operatorUserId: '', operatorName: operator,
            orderId: '', orderNo: '',
            createdAt: new Date(dayStart + o * 3600000 + i * 600000),
          },
        })
      }
    }
  }

  return { success: true, count: days.length }
}

async function cleanupWarehouseTestData() {
  await ensureCollection('warehouse_ledger')
  let more = true
  let deleted = 0
  while (more) {
    const { data } = await db.collection('warehouse_ledger').where({
      batchId: _.gte('test_'),
    }).limit(100).get()
    if (!data.length) { more = false; break }
    const ids = data.map((d) => d._id)
    for (const id of ids) {
      await db.collection('warehouse_ledger').doc(id).remove()
      deleted += 1
    }
  }
  return { success: true, deleted }
}

// ── Entry Point ──

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const operatorOpenid = wxContext.OPENID

  if (!operatorOpenid) {
    return { success: false, errMsg: '无法获取操作者身份' }
  }

  const canManage = await isMerchant(operatorOpenid)
  if (!canManage) {
    return { success: false, errMsg: '无权限操作' }
  }

  try {
    const { action } = event
    const ctx = { operatorOpenid, wxContext }

    if (action === 'stockIn') return stockIn({ ...event, operatorOpenid })
    if (action === 'stockOut') return stockOut({ ...event, operatorOpenid })
    if (action === 'listWarehouseLedger') return listWarehouseLedger(event)
    if (action === 'seedWarehouseTestData') return seedWarehouseTestData({ ...event, operatorOpenid })
    if (action === 'cleanupWarehouseTestData') return cleanupWarehouseTestData()

    return { success: false, errMsg: '未知操作' }
  } catch (err) {
    return { success: false, errMsg: err.message || err.errMsg || '仓储服务异常' }
  }
}
