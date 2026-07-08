const shared = require('../shared')
const cloud = shared.cloud
const db = shared.db
const _ = shared._
const { isMerchant, ensureCollection } = require('../common/merchantGate')
const { resolveFileUrls, enrichPublicGoodsList, enrichPublicGoods } = require('../common/fileUrls')

const {
  downloadProcessedAndUpload,
  safeBumpGoodsRelatedCaches,
  safeBumpGoodsStockCache,
  resolveOperatorProfile,
  applyStockMovement,
  pickGoods,
  finalizeGoodsPayload,
  listOnSaleGoodsPaginated,
  listOnSaleGoods,
  searchPublicGoods,
} = shared

async function list(event, ctx) {
  const { operatorOpenid } = ctx
  if (!operatorOpenid) {
    return { success: false, errMsg: '无法获取操作者身份' }
  }
  const canManage = await isMerchant(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限查看商品列表' }
    }
  
    await ensureCollection('goods')
  
    const { keyword = '', filter = 'all' } = event
    let query = db.collection('goods')
  
    if (filter === 'onSale') {
      query = query.where({ onSale: true })
    } else if (filter === 'offSale') {
      query = query.where({ onSale: false })
    }
  
    const { data } = await query.get()
    const text = String(keyword).trim().toLowerCase()
    const list = data
      .map(pickGoods)
      .filter((item) => {
        if (!text) return true
        return item.name.toLowerCase().includes(text)
      })
      .sort((a, b) => b.sort - a.sort)
  
    return { success: true, list }
  }

async function get(event, ctx) {
  const { operatorOpenid } = ctx
  if (!operatorOpenid) {
    return { success: false, errMsg: '无法获取操作者身份' }
  }
  const canManage = await isMerchant(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限查看商品' }
    }
  
    const { id } = event
    if (!id) {
      return { success: false, errMsg: '缺少商品 ID' }
    }
  
    await ensureCollection('goods')
    const { data } = await db.collection('goods').doc(id).get()
    if (!data) {
      return { success: false, errMsg: '商品不存在' }
    }
  
    return { success: true, goods: pickGoods(data) }
  }

async function add(event, ctx) {
  const { operatorOpenid } = ctx
  if (!operatorOpenid) {
    return { success: false, errMsg: '无法获取操作者身份' }
  }
  const canManage = await isMerchant(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限操作商品' }
    }
  
    await ensureCollection('goods')
  
    try {
      const payload = await finalizeGoodsPayload(event.goods || {})
  
      if (event.action === 'add') {
        const addRes = await db.collection('goods').add({
          data: {
            ...payload,
            listedAt: payload.onSale !== false ? db.serverDate() : null,
            createdBy: operatorOpenid,
            createdAt: db.serverDate(),
            updatedAt: db.serverDate(),
          },
        })
  
        const { data } = await db.collection('goods').doc(addRes._id).get()
        await safeBumpGoodsRelatedCaches()
        return { success: true, goods: pickGoods(data) }
      }
  
      const { id } = event
      if (!id) {
        return { success: false, errMsg: '缺少商品 ID' }
      }
  
      const { data: beforeDoc } = await db.collection('goods').doc(id).get()
      const listedAtPatch =
        beforeDoc && beforeDoc.onSale === false && payload.onSale !== false
          ? { listedAt: db.serverDate() }
          : {}
  
      await db.collection('goods').doc(id).update({
        data: {
          ...payload,
          ...listedAtPatch,
          updatedAt: db.serverDate(),
          updatedBy: operatorOpenid,
        },
      })
  
      const { data } = await db.collection('goods').doc(id).get()
      await safeBumpGoodsRelatedCaches()
      return { success: true, goods: pickGoods(data) }
    } catch (err) {
      return {
        success: false,
        errMsg: err.message || err.errMsg || '保存商品失败',
      }
    }
  }

async function update(event, ctx) {
  const { operatorOpenid } = ctx
  if (!operatorOpenid) {
    return { success: false, errMsg: '无法获取操作者身份' }
  }
  const canManage = await isMerchant(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限操作商品' }
    }
  
    await ensureCollection('goods')
  
    try {
      const payload = await finalizeGoodsPayload(event.goods || {})
  
      if (event.action === 'add') {
        const addRes = await db.collection('goods').add({
          data: {
            ...payload,
            listedAt: payload.onSale !== false ? db.serverDate() : null,
            createdBy: operatorOpenid,
            createdAt: db.serverDate(),
            updatedAt: db.serverDate(),
          },
        })
  
        const { data } = await db.collection('goods').doc(addRes._id).get()
        await safeBumpGoodsRelatedCaches()
        return { success: true, goods: pickGoods(data) }
      }
  
      const { id } = event
      if (!id) {
        return { success: false, errMsg: '缺少商品 ID' }
      }
  
      const { data: beforeDoc } = await db.collection('goods').doc(id).get()
      const listedAtPatch =
        beforeDoc && beforeDoc.onSale === false && payload.onSale !== false
          ? { listedAt: db.serverDate() }
          : {}
  
      await db.collection('goods').doc(id).update({
        data: {
          ...payload,
          ...listedAtPatch,
          updatedAt: db.serverDate(),
          updatedBy: operatorOpenid,
        },
      })
  
      const { data } = await db.collection('goods').doc(id).get()
      await safeBumpGoodsRelatedCaches()
      return { success: true, goods: pickGoods(data) }
    } catch (err) {
      return {
        success: false,
        errMsg: err.message || err.errMsg || '保存商品失败',
      }
    }
  }

async function remove(event, ctx) {
  const { operatorOpenid } = ctx
  if (!operatorOpenid) {
    return { success: false, errMsg: '无法获取操作者身份' }
  }
  const canManage = await isMerchant(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限删除商品' }
    }
  
    const { id } = event
    if (!id) {
      return { success: false, errMsg: '缺少商品 ID' }
    }
  
    await ensureCollection('goods')
    await db.collection('goods').doc(id).remove()
    await safeBumpGoodsRelatedCaches()
    return { success: true }
  }

async function batchRemove(event, ctx) {
  const { operatorOpenid } = ctx
  if (!operatorOpenid) {
    return { success: false, errMsg: '无法获取操作者身份' }
  }
  const canManage = await isMerchant(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限删除商品' }
    }
  
    const ids = Array.isArray(event.ids) ? event.ids.map((id) => String(id).trim()).filter(Boolean) : []
    if (!ids.length) {
      return { success: false, errMsg: '请选择要删除的商品' }
    }
  
    await ensureCollection('goods')
    for (const id of ids) {
      try {
        await db.collection('goods').doc(id).remove()
      } catch (err) {
        console.error('[goods] batch remove failed:', id, err.message || err)
      }
    }
    await safeBumpGoodsRelatedCaches()
    return { success: true, removed: ids.length }
  }

async function batchUpdate(event, ctx) {
  const { operatorOpenid } = ctx
  if (!operatorOpenid) {
    return { success: false, errMsg: '无法获取操作者身份' }
  }
  const canManage = await isMerchant(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限批量修改商品' }
    }
  
    const ids = Array.isArray(event.ids) ? event.ids.map((id) => String(id).trim()).filter(Boolean) : []
    const patch = event.patch && typeof event.patch === 'object' ? event.patch : {}
  
    if (!ids.length) {
      return { success: false, errMsg: '请选择要修改的商品' }
    }
  
    const data = {}
    if (patch.onSale != null) data.onSale = patch.onSale !== false
    if (patch.recommend != null) data.recommend = patch.recommend === true
    if (patch.price != null) {
      const price = Number(patch.price)
      if (Number.isNaN(price) || price < 0) {
        return { success: false, errMsg: '价格无效' }
      }
      data.price = price
    }
    if (patch.description != null) data.description = String(patch.description || '').trim()
    if (patch.sort != null) {
      const sort = parseInt(patch.sort, 10)
      if (Number.isNaN(sort)) {
        return { success: false, errMsg: '排序无效' }
      }
      data.sort = sort
    }
    if (patch.unitsPerGroup != null) {
      const unitsPerGroup = parseInt(patch.unitsPerGroup, 10)
      if (Number.isNaN(unitsPerGroup) || unitsPerGroup <= 0) {
        return { success: false, errMsg: '每组数量无效' }
      }
      data.unitsPerGroup = unitsPerGroup
    }
  
    if (!Object.keys(data).length) {
      return { success: false, errMsg: '没有可更新的字段' }
    }
  
    data.updatedAt = db.serverDate()
    data.updatedBy = operatorOpenid
  
    await ensureCollection('goods')
    for (const id of ids) {
      try {
        const updateData = { ...data }
        if (patch.onSale === true) {
          const { data: doc } = await db.collection('goods').doc(id).get()
          if (doc && doc.onSale === false) {
            updateData.listedAt = db.serverDate()
          }
        }
        await db.collection('goods').doc(id).update({ data: updateData })
      } catch (err) {
        console.error('[goods] batch update failed:', id, err.message || err)
      }
    }
    await safeBumpGoodsRelatedCaches()
    return { success: true, updated: ids.length }
  }

module.exports = {
  list,
  get,
  add,
  update,
  remove,
  batchRemove,
  batchUpdate,
}
