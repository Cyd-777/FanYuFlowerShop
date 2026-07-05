const cloud = require('wx-server-sdk')
const { bumpCacheModule } = require('./common/cacheMeta')

async function safeBumpCacheModule(module) {
  try {
    await bumpCacheModule(module)
  } catch (err) {
    console.error('[order] bump cache failed:', err.message || err)
  }
}

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()
const _ = db.command

const OWNER_OPENIDS = ['oiDICxmmuGHJTKQzDsG9X32n2fAs']

function isCollectionMissingError(err) {
  const msg = [err.errMsg, err.message, String(err.errCode), String(err.code)]
    .filter(Boolean)
    .join(' ')
  return (
    msg.includes('DATABASE_COLLECTION_NOT_EXIST') ||
    msg.includes('collection not exists') ||
    msg.includes('Db or Table not exist') ||
    msg.includes('-502005') ||
    msg.includes('50200')
  )
}

async function ensureCollection(name) {
  try {
    await db.createCollection(name)
  } catch (err) {
    const msg = [err.errMsg, err.message].filter(Boolean).join(' ')
    const alreadyExists =
      msg.includes('already exist') ||
      msg.includes('已存在') ||
      msg.includes('ResourceExist') ||
      msg.includes('Table exist')
    if (!alreadyExists && !msg.includes('createCollection is not a function')) {
      throw err
    }
  }
}

async function isMerchant(openid) {
  if (OWNER_OPENIDS.includes(openid)) return true

  try {
    const { data } = await db.collection('merchants').where({ openid }).limit(1).get()
    return data.length > 0
  } catch (err) {
    if (isCollectionMissingError(err)) return OWNER_OPENIDS.includes(openid)
    throw err
  }
}

function pickGoods(doc) {
  return {
    _id: doc._id,
    name: doc.name || '',
    price: Number(doc.price) || 0,
    unit: doc.unit || '束',
    stock: Number(doc.stock) || 0,
    coverImage: doc.coverImage || (doc.images && doc.images[0]) || '',
    onSale: doc.onSale !== false,
  }
}

function pickOrder(doc) {
  const rawStatus = doc.status || 'pending'
  const status = rawStatus === 'processing' ? 'preparing' : rawStatus
  const riderStatus = doc.riderStatus || 'none'

  return {
    _id: doc._id,
    orderNo: doc.orderNo || '',
    customerOpenid: doc.customerOpenid || '',
    status,
    riderStatus,
    deliveryMethod: doc.deliveryMethod || 'home_delivery',
    merchantDelivery: doc.merchantDelivery || '',
    verifyToken: doc.verifyToken || '',
    items: Array.isArray(doc.items) ? doc.items : [],
    totalAmount: Number(doc.totalAmount) || 0,
    remark: doc.remark || '',
    address: doc.address || {},
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    completedAt: doc.completedAt,
    acceptedAt: doc.acceptedAt,
    preparingAt: doc.preparingAt,
    prepDoneAt: doc.prepDoneAt,
    readyAt: doc.readyAt,
    deliveringAt: doc.deliveringAt,
    riderCalledAt: doc.riderCalledAt,
  }
}

function generateOrderNo() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `FY${y}${m}${day}${rand}`
}

function normalizeAddress(input) {
  const name = String(input?.name || '').trim()
  const phone = String(input?.phone || '').trim()
  const province = String(input?.province || '').trim()
  const city = String(input?.city || '').trim()
  const district = String(input?.district || '').trim()
  const detail = String(input?.detail || '').trim()
  const fullText =
    String(input?.fullText || '').trim() ||
    [province, city, district, detail].filter(Boolean).join('')

  if (!name) throw new Error('请填写收货人姓名')
  if (!phone) throw new Error('请填写联系电话')
  if (!fullText) throw new Error('请填写收货地址')

  return { name, phone, province, city, district, detail, fullText }
}

function calcCustomDraftPrice(draft) {
  const flowers = Array.isArray(draft?.flowers) ? draft.flowers : []
  const flowerTotal = flowers.reduce((sum, item) => sum + (Number(item.price) || 0), 0)
  const packagingTotal = Number(draft?.packaging?.price) || 0
  const cardTotal = Number(draft?.card?.price) || 0
  return flowerTotal + packagingTotal + cardTotal
}

function isValidCustomDraft(draft) {
  const flowers = Array.isArray(draft?.flowers) ? draft.flowers : []
  return flowers.length > 0 && draft?.packaging && draft.packaging.goodsId
}

function collectDeductionsFromCustomDraft(draft) {
  const map = new Map()
  const flowers = Array.isArray(draft?.flowers) ? draft.flowers : []

  for (const item of flowers) {
    const goodsId = String(item?.goodsId || '').trim()
    if (!goodsId) throw new Error('定制花束花材数据不完整')
    map.set(goodsId, (map.get(goodsId) || 0) + 1)
  }

  if (draft.packaging?.goodsId) {
    const id = String(draft.packaging.goodsId).trim()
    map.set(id, (map.get(id) || 0) + 1)
  }

  if (draft.card?.goodsId) {
    const id = String(draft.card.goodsId).trim()
    map.set(id, (map.get(id) || 0) + 1)
  }

  return map
}

function mergeDeductionMaps(target, source) {
  for (const [goodsId, count] of source.entries()) {
    target.set(goodsId, (target.get(goodsId) || 0) + count)
  }
}

async function loadGoodsMap(goodsIds) {
  await ensureCollection('goods')
  const map = new Map()

  for (const id of goodsIds) {
    const { data } = await db.collection('goods').doc(id).get()
    if (!data) {
      throw new Error(`商品不存在：${id}`)
    }
    map.set(id, pickGoods(data))
  }

  return map
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

async function writeOrderOutLedgers(entries, orderId, orderNo, batchId) {
  for (const entry of entries) {
    await appendWarehouseLedger({
      type: 'order_out',
      batchId,
      goodsId: entry.goodsId,
      goodsName: entry.goodsName || '',
      unit: entry.unit || '件',
      delta: entry.count,
      stockBefore: entry.stockBefore,
      stockAfter: entry.stockAfter,
      operatorOpenid: '',
      operatorUserId: '',
      operatorName: '',
      orderId: orderId || '',
      orderNo: orderNo || '',
    })
  }
}

async function applyStockDeductions(deductionMap) {
  const applied = []

  for (const [goodsId, count] of deductionMap.entries()) {
    const { data: doc } = await db.collection('goods').doc(goodsId).get()
    if (!doc) {
      throw new Error(`商品不存在：${goodsId}`)
    }

    const stockBefore = Number(doc.stock) || 0
    const stockAfter = stockBefore - count
    if (stockAfter < 0) {
      throw new Error(`「${doc.name || goodsId}」库存不足，剩余 ${stockBefore}${doc.unit || ''}`)
    }

    await db.collection('goods').doc(goodsId).update({
      data: {
        stock: _.inc(-count),
        updatedAt: db.serverDate(),
      },
    })

    applied.push({
      goodsId,
      count,
      stockBefore,
      stockAfter,
      goodsName: doc.name || '',
      unit: doc.unit || '件',
    })
  }

  return applied
}

/** 下单失败回滚：只恢复库存，不写流水（订单未成立） */
async function rollbackStock(applied) {
  for (const { goodsId, count } of applied) {
    try {
      await db.collection('goods').doc(goodsId).update({
        data: {
          stock: _.inc(count),
          updatedAt: db.serverDate(),
        },
      })
    } catch (err) {
      console.error('[order] rollback stock failed:', goodsId, err.message || err)
    }
  }
}

/** 取消订单：恢复库存并记 order_rollback 流水 */
async function rollbackStockWithLedger(deductions, orderDoc, batchId) {
  for (const { goodsId, count } of deductions) {
    if (!goodsId || !count) continue
    try {
      const { data: doc } = await db.collection('goods').doc(goodsId).get()
      if (!doc) continue

      const stockBefore = Number(doc.stock) || 0
      const stockAfter = stockBefore + count

      await db.collection('goods').doc(goodsId).update({
        data: {
          stock: _.inc(count),
          updatedAt: db.serverDate(),
        },
      })

      await appendWarehouseLedger({
        type: 'order_rollback',
        batchId,
        goodsId,
        goodsName: doc.name || '',
        unit: doc.unit || '件',
        delta: count,
        stockBefore,
        stockAfter,
        operatorOpenid: '',
        operatorUserId: '',
        operatorName: '',
        orderId: orderDoc._id || '',
        orderNo: orderDoc.orderNo || '',
      })
    } catch (err) {
      console.error('[order] rollback stock failed:', goodsId, err.message || err)
    }
  }
}

async function buildOrderItems(rawItems, goodsMap) {
  const orderItems = []
  let totalAmount = 0
  const deductionMap = new Map()

  if (!Array.isArray(rawItems) || !rawItems.length) {
    throw new Error('请选择要结算的商品')
  }

  for (const raw of rawItems) {
    const kind = raw?.kind === 'custom' ? 'custom' : 'goods'
    const lineKey = String(raw?.lineKey || '').trim()
    const count = Math.max(1, parseInt(raw?.count, 10) || 1)

    if (!lineKey) {
      throw new Error('购物车行数据无效')
    }

    if (kind === 'goods') {
      const goodsId = String(raw?.goodsId || '').trim()
      if (!goodsId) throw new Error('商品 ID 无效')

      const goods = goodsMap.get(goodsId)
      if (!goods) throw new Error(`商品不存在：${goods.name || goodsId}`)
      if (goods.onSale === false) throw new Error(`「${goods.name}」已下架`)
      if (goods.stock < count) {
        throw new Error(`「${goods.name}」库存不足，剩余 ${goods.stock}${goods.unit}`)
      }

      const lineTotal = goods.price * count
      totalAmount += lineTotal
      mergeDeductionMaps(deductionMap, new Map([[goodsId, count]]))

      orderItems.push({
        lineKey,
        kind: 'goods',
        goodsId,
        name: goods.name,
        price: goods.price,
        unit: goods.unit,
        count,
        image: goods.coverImage || String(raw?.image || '').trim(),
      })
      continue
    }

    const customDraft = raw?.customDraft
    if (!isValidCustomDraft(customDraft)) {
      throw new Error('定制花束数据不完整，请重新选择花材和包装')
    }

    const customDeductions = collectDeductionsFromCustomDraft(customDraft)
    for (const [goodsId, needCount] of customDeductions.entries()) {
      const goods = goodsMap.get(goodsId)
      if (!goods) throw new Error(`定制花束包含无效商品：${goodsId}`)
      if (goods.onSale === false) throw new Error(`「${goods.name}」已下架，无法定制`)
      if (goods.stock < needCount) {
        throw new Error(`「${goods.name}」库存不足，剩余 ${goods.stock}${goods.unit}`)
      }
    }
    mergeDeductionMaps(deductionMap, customDeductions)

    const price = calcCustomDraftPrice(customDraft)
    totalAmount += price

    orderItems.push({
      lineKey,
      kind: 'custom',
      goodsId: String(raw?.goodsId || 'custom-bouquet').trim(),
      name: String(raw?.name || '定制花束').trim(),
      price,
      unit: String(raw?.unit || '束').trim(),
      count: 1,
      image: String(raw?.image || '').trim(),
      customSummary: String(raw?.customSummary || '').trim(),
    })
  }

  return { orderItems, totalAmount, deductionMap }
}

async function createOrder(event, customerOpenid) {
  const deliveryMethod = String(event.deliveryMethod || 'home_delivery').trim()
  if (deliveryMethod !== 'pickup' && deliveryMethod !== 'home_delivery') {
    throw new Error('无效的配送方式')
  }

  const address = deliveryMethod === 'pickup' ? {} : normalizeAddress(event.address)

  // 自提订单生成核销令牌
  let verifyToken = ''
  if (deliveryMethod === 'pickup') {
    verifyToken = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  }

  const remark = String(event.remark || '').trim()

  const rawItems = event.items
  const preliminaryIds = new Set()

  if (!Array.isArray(rawItems) || !rawItems.length) {
    throw new Error('请选择要结算的商品')
  }

  for (const raw of rawItems) {
    if (raw?.kind === 'custom' && isValidCustomDraft(raw.customDraft)) {
      for (const id of collectDeductionsFromCustomDraft(raw.customDraft).keys()) {
        preliminaryIds.add(id)
      }
    } else if (raw?.kind !== 'custom') {
      const goodsId = String(raw?.goodsId || '').trim()
      if (goodsId) preliminaryIds.add(goodsId)
    }
  }

  const goodsMap = await loadGoodsMap([...preliminaryIds])
  const { orderItems, totalAmount, deductionMap } = await buildOrderItems(rawItems, goodsMap)

  let applied = []
  try {
    await ensureCollection('orders')
    const orderNo = generateOrderNo()
    applied = await applyStockDeductions(deductionMap)

    const addRes = await db.collection('orders').add({
      data: {
        orderNo,
        customerOpenid,
        status: 'pending',
        riderStatus: 'none',
        deliveryMethod,
        verifyToken: verifyToken || '',
        items: orderItems,
        totalAmount: Math.round(totalAmount * 100) / 100,
        remark,
        address,
        stockDeductions: applied.map(({ goodsId, count }) => ({ goodsId, count })),
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })

    const batchId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

    await writeOrderOutLedgers(applied, addRes._id, orderNo, batchId)

    const { data } = await db.collection('orders').doc(addRes._id).get()
    await safeBumpCacheModule('goods')
    return { success: true, orderId: addRes._id, order: pickOrder(data) }
  } catch (err) {
    if (applied.length) {
      await rollbackStock(applied)
    }
    throw err
  }
}

const CUSTOM_BOUQUET_GOODS_ID = 'custom-bouquet'

function resolveStockDeductions(orderDoc) {
  if (Array.isArray(orderDoc.stockDeductions) && orderDoc.stockDeductions.length) {
    return orderDoc.stockDeductions
      .map((item) => ({
        goodsId: String(item?.goodsId || '').trim(),
        count: Math.max(0, parseInt(item?.count, 10) || 0),
      }))
      .filter((item) => item.goodsId && item.count > 0)
  }

  const list = []
  for (const item of orderDoc.items || []) {
    if (item.kind !== 'goods') continue
    const goodsId = String(item.goodsId || '').trim()
    if (!goodsId || goodsId === CUSTOM_BOUQUET_GOODS_ID) continue
    list.push({ goodsId, count: Math.max(1, parseInt(item.count, 10) || 1) })
  }
  return list
}

async function fetchOrderDoc(id) {
  await ensureCollection('orders')
  const { data } = await db.collection('orders').doc(id).get()
  if (!data) {
    throw new Error('订单不存在')
  }
  return data
}

async function callRider(orderDoc) {
  // TODO: 对接配送平台 API，当前仅记录呼叫时间
  console.log('[order] call rider for', orderDoc.orderNo)
  return { success: true }
}

const IN_PROGRESS_STATUSES = ['accepted', 'preparing', 'prep_done', 'processing']

function normalizeStoredStatus(status) {
  return status === 'processing' ? 'preparing' : status
}

async function updateOrderStatus(event, operatorOpenid) {
  const id = String(event.id || '').trim()
  const nextStatus = String(event.status || '').trim()
  const nextRiderStatus = String(event.riderStatus || '').trim()

  if (!id) {
    throw new Error('缺少订单 ID')
  }

  const orderDoc = await fetchOrderDoc(id)
  const current = normalizeStoredStatus(orderDoc.status || 'pending')
  const currentRider = orderDoc.riderStatus || 'none'
  const merchant = await isMerchant(operatorOpenid)
  const isCustomer = orderDoc.customerOpenid === operatorOpenid

  if (nextStatus === 'cancelled') {
    if (current === 'cancelled') {
      throw new Error('订单已取消')
    }
    if (current === 'completed') {
      throw new Error('订单已完成，无法取消')
    }

    if (isCustomer) {
      if (current !== 'pending') {
        throw new Error('商家已接单，无法取消订单')
      }
    } else if (!merchant) {
      throw new Error('无权操作该订单')
    } else if (!['pending', 'accepted', 'preparing'].includes(current)) {
      throw new Error('当前状态无法取消订单')
    }

    await rollbackStockWithLedger(resolveStockDeductions(orderDoc), orderDoc, `rollback_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`)
    await db.collection('orders').doc(id).update({
      data: {
        status: 'cancelled',
        updatedAt: db.serverDate(),
      },
    })
    await safeBumpCacheModule('goods')

    const { data } = await db.collection('orders').doc(id).get()
    return { success: true, order: pickOrder(data) }
  }

  if (!merchant) {
    throw new Error('无权限更新订单状态')
  }
  if (current === 'cancelled' || current === 'completed') {
    throw new Error('订单已结束，无法变更状态')
  }

  const patch = {
    updatedAt: db.serverDate(),
  }

  if (nextRiderStatus) {
    const riderFlow = ['waiting', 'picked_up', 'on_way', 'delivered']
    const riderIndex = riderFlow.indexOf(nextRiderStatus)
    const currentRiderIndex = riderFlow.indexOf(currentRider)

    if (riderIndex < 0) {
      throw new Error('无效的配送状态')
    }
    if (!['preparing', 'prep_done'].includes(current)) {
      throw new Error('当前门店状态无法更新配送进度')
    }
    if (currentRider === 'none' && nextRiderStatus !== 'waiting') {
      throw new Error('请先等待骑手接单')
    }
    if (currentRider !== 'none' && riderIndex !== currentRiderIndex + 1) {
      throw new Error('配送状态只能按顺序推进')
    }

    patch.riderStatus = nextRiderStatus
    if (nextRiderStatus === 'delivered') {
      patch.status = 'completed'
      patch.completedAt = db.serverDate()
    }
  } else if (nextStatus === 'accepted' && current === 'pending') {
    patch.status = 'accepted'
    patch.acceptedAt = db.serverDate()
  } else if (nextStatus === 'preparing' && current === 'accepted') {
    patch.status = 'preparing'
    patch.preparingAt = db.serverDate()
    // 不再自动呼叫骑手，由商户在「制作完成」后手动选择配送方式
  } else if (nextStatus === 'prep_done' && current === 'preparing') {
    patch.status = 'prep_done'
    patch.prepDoneAt = db.serverDate()
    // 自提订单：准备完成等待取货
    if (orderDoc.deliveryMethod === 'pickup') {
      patch.status = 'ready'
      patch.readyAt = db.serverDate()
    } else if (currentRider === 'none') {
      patch.riderStatus = 'waiting'
      patch.riderCalledAt = db.serverDate()
      await callRider(orderDoc)
    }
  } else if (nextStatus === 'completed' && current === 'preparing') {
    // 兼容旧客户端：processing → completed 视为制作完成
    if (orderDoc.deliveryMethod === 'pickup') {
      patch.status = 'ready'
      patch.readyAt = db.serverDate()
    } else {
      patch.status = 'prep_done'
      patch.prepDoneAt = db.serverDate()
      if (currentRider === 'none') {
        patch.riderStatus = 'waiting'
        patch.riderCalledAt = db.serverDate()
        await callRider(orderDoc)
      }
    }
  } else if (nextStatus === 'delivering' && (current === 'prep_done' || current === 'preparing')) {
    // 自配送：商家自己送（可从 preparing 或 prep_done 进入）
    patch.status = 'delivering'
    patch.merchantDelivery = 'self'
    patch.deliveringAt = db.serverDate()
  } else if (nextStatus === 'ready' && current === 'preparing' && orderDoc.deliveryMethod === 'pickup') {
    // 自提：备货中直接到已备好
    patch.status = 'ready'
    patch.readyAt = db.serverDate()
  } else if (nextStatus === 'completed' && current === 'delivering') {
    // 自配送：确认送达
    patch.status = 'completed'
    patch.completedAt = db.serverDate()
  } else {
    throw new Error('无效的状态变更')
  }

  await db.collection('orders').doc(id).update({ data: patch })

  const { data } = await db.collection('orders').doc(id).get()
  return { success: true, order: pickOrder(data) }
}

function normalizeCloudDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'object' && value.$date) {
    return new Date(value.$date)
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function getChinaDayRange() {
  const offsetMs = 8 * 60 * 60 * 1000
  const now = Date.now()
  const chinaDayIndex = Math.floor((now + offsetMs) / (24 * 60 * 60 * 1000))
  const startMs = chinaDayIndex * 24 * 60 * 60 * 1000 - offsetMs
  return {
    start: new Date(startMs),
    end: new Date(startMs + 24 * 60 * 60 * 1000),
  }
}

async function getOrderStats(operatorOpenid) {
  const merchant = await isMerchant(operatorOpenid)
  if (!merchant) {
    throw new Error('无权限查看订单统计')
  }

  await ensureCollection('orders')

  const pendingCount = await db.collection('orders').where({ status: 'pending' }).count()
  const { data } = await db.collection('orders').orderBy('createdAt', 'desc').limit(200).get()

  const { start, end } = getChinaDayRange()
  let todayOrders = 0
  let todayRevenue = 0

  for (const doc of data) {
    const createdAt = normalizeCloudDate(doc.createdAt)
    if (!createdAt || createdAt < start || createdAt >= end) continue

    todayOrders += 1
    if (doc.status === 'completed') {
      todayRevenue += Number(doc.totalAmount) || 0
    }
  }

  return {
    success: true,
    stats: {
      todayOrders,
      pendingOrders: pendingCount.total || 0,
      todayRevenue: Math.round(todayRevenue * 100) / 100,
    },
  }
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action } = event

  if (!openid) {
    return { success: false, errMsg: '无法获取用户身份' }
  }

  if (action === 'create') {
    try {
      return await createOrder(event, openid)
    } catch (err) {
      return {
        success: false,
        errMsg: err.message || err.errMsg || '创建订单失败',
      }
    }
  }

  if (action === 'get') {
    try {
      const { id } = event
      if (!id) {
        return { success: false, errMsg: '缺少订单 ID' }
      }

      await ensureCollection('orders')
      const { data } = await db.collection('orders').doc(id).get()
      if (!data) {
        return { success: false, errMsg: '订单不存在' }
      }

      const merchant = await isMerchant(openid)
      if (data.customerOpenid !== openid && !merchant) {
        return { success: false, errMsg: '无权查看该订单' }
      }

      return { success: true, order: pickOrder(data) }
    } catch (err) {
      return {
        success: false,
        errMsg: err.message || err.errMsg || '获取订单失败',
      }
    }
  }

  if (action === 'list') {
    try {
      const status = String(event.status || '').trim()
      const limit = Math.min(100, Math.max(1, parseInt(event.limit, 10) || 50))
      const merchantView = event.scope === 'merchant'

      await ensureCollection('orders')

      if (merchantView) {
        const merchant = await isMerchant(openid)
        if (!merchant) {
          return { success: false, errMsg: '无权限查看商家订单' }
        }
      }

      const where = merchantView ? {} : { customerOpenid: openid }
      if (status && status !== 'all') {
        if (status === 'processing') {
          where.status = _.in(IN_PROGRESS_STATUSES)
        } else {
          where.status = status
        }
      }

      const { data } = await db
        .collection('orders')
        .where(where)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get()

      return { success: true, list: data.map(pickOrder) }
    } catch (err) {
      return {
        success: false,
        errMsg: err.message || err.errMsg || '获取订单列表失败',
      }
    }
  }

  if (action === 'updateStatus') {
    try {
      return await updateOrderStatus(event, openid)
    } catch (err) {
      return {
        success: false,
        errMsg: err.message || err.errMsg || '更新订单状态失败',
      }
    }
  }

  if (action === 'stats') {
    try {
      return await getOrderStats(openid)
    } catch (err) {
      return {
        success: false,
        errMsg: err.message || err.errMsg || '获取订单统计失败',
      }
    }
  }

  if (action === 'verifyPickup') {
    try {
      const merchant = await isMerchant(openid)
      if (!merchant) {
        return { success: false, errMsg: '无权限核销自提订单' }
      }

      const id = String(event.id || '').trim()
      const token = String(event.token || '').trim()
      if (!id || !token) {
        return { success: false, errMsg: '缺少订单信息' }
      }

      await ensureCollection('orders')
      const { data } = await db.collection('orders').doc(id).get()
      if (!data) {
        return { success: false, errMsg: '订单不存在' }
      }
      if (data.verifyToken !== token) {
        return { success: false, errMsg: '核销码无效' }
      }
      if (data.deliveryMethod !== 'pickup') {
        return { success: false, errMsg: '非自提订单，无法核销' }
      }
      if (data.status === 'completed') {
        return { success: false, errMsg: '订单已完成，请勿重复核销' }
      }
      if (data.status !== 'ready') {
        return { success: false, errMsg: '订单尚未备好，暂无法核销' }
      }

      await db.collection('orders').doc(id).update({
        data: {
          status: 'completed',
          completedAt: db.serverDate(),
          updatedAt: db.serverDate(),
        },
      })

      await safeBumpCacheModule('goods')
      const { data: updated } = await db.collection('orders').doc(id).get()
      return { success: true, order: pickOrder(updated) }
    } catch (err) {
      return {
        success: false,
        errMsg: err.message || err.errMsg || '核销失败',
      }
    }
  }

  return { success: false, errMsg: '未知操作' }
}
