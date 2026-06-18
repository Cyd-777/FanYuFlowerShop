const cloud = require('wx-server-sdk')
const { bumpCacheModule } = require('./common/cacheMeta')

async function safeBumpCacheModule(module) {
  try {
    await bumpCacheModule(module)
  } catch (err) {
    console.error('[goods] bump cache failed:', err.message || err)
  }
}

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()

const OWNER_OPENIDS = [
  'oiDICxmmuGHJTKQzDsG9X32n2fAs',
]

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

const VALID_SALES_TYPES = new Set(['stem', 'group', 'bouquet', 'other'])
const VALID_UNITS = ['支', '组', '束', '件']

function normalizeSalesType(value) {
  const id = String(value || '').trim()
  return VALID_SALES_TYPES.has(id) ? id : ''
}

function unitFromSalesType(salesType) {
  const map = {
    stem: '支',
    group: '组',
    bouquet: '束',
    other: '件',
  }
  return map[salesType] || '束'
}

function normalizeUnit(unit, salesType) {
  const type = normalizeSalesType(salesType)
  if (type) return unitFromSalesType(type)

  const value = String(unit || '束').trim()
  return VALID_UNITS.includes(value) ? value : '束'
}

function inferSalesType(doc) {
  const explicit = normalizeSalesType(doc.salesType)
  if (explicit) return explicit
  const unit = String(doc.unit || '').trim()
  if (unit === '支') return 'stem'
  if (unit === '组') return 'group'
  if (unit === '件') return 'other'
  if (doc.flowerVarietyId || doc.flowerKindId) return 'stem'
  return 'bouquet'
}

function pickGoods(doc) {
  const salesType = inferSalesType(doc)
  return {
    _id: doc._id,
    name: doc.name || '',
    price: Number(doc.price) || 0,
    salesType,
    unit: normalizeUnit(doc.unit, salesType),
    stock: Number(doc.stock) || 0,
    description: doc.description || '',
    categoryId: doc.categoryId || '',
    categoryName: doc.categoryName || doc.category || '',
    flowerKindId: doc.flowerKindId || '',
    flowerKindName: doc.flowerKindName || '',
    flowerVarietyId: doc.flowerVarietyId || '',
    flowerVarietyName: doc.flowerVarietyName || '',
    coverImage: doc.coverImage || (doc.images && doc.images[0]) || '',
    images: Array.isArray(doc.images) ? doc.images : [],
    onSale: doc.onSale !== false,
    recommend: doc.recommend === true,
    sort: Number(doc.sort) || 0,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

async function resolveCategoryMeta(categoryId) {
  if (!categoryId) {
    throw new Error('请选择商品分类')
  }

  await ensureCollection('categories')
  const { data } = await db.collection('categories').doc(categoryId).get()
  if (!data) {
    throw new Error('所选分类不存在')
  }

  return {
    categoryId,
    categoryName: data.name || '',
  }
}

function normalizeGoodsInput(input) {
  const name = String(input.name || '').trim()
  const price = Number(input.price)
  const salesType = normalizeSalesType(input.salesType) || inferSalesType(input)
  const unit = normalizeUnit(input.unit, salesType)
  const stock = parseInt(input.stock, 10)
  const description = String(input.description || '').trim()
  const categoryId = String(input.categoryId || '').trim()
  const coverImage = String(input.coverImage || '').trim()
  const images = Array.isArray(input.images) ? input.images.filter(Boolean) : []
  const onSale = input.onSale !== false
  const recommend = input.recommend === true
  const sort = Number(input.sort) || 0
  const flowerKindId = String(input.flowerKindId || '').trim()
  const flowerKindName = String(input.flowerKindName || '').trim()
  const flowerVarietyId = String(input.flowerVarietyId || '').trim()
  const flowerVarietyName = String(input.flowerVarietyName || '').trim()
  const needsFlowerPick = salesType === 'stem' || salesType === 'group'

  if (!name) {
    throw new Error('商品名称不能为空')
  }
  if (!categoryId) {
    throw new Error('请选择商品分类')
  }
  if (Number.isNaN(price) || price < 0) {
    throw new Error('请输入有效的商品价格')
  }
  if (Number.isNaN(stock) || stock < 0) {
    throw new Error('请输入有效的库存数量')
  }
  if (needsFlowerPick && !flowerVarietyId) {
    throw new Error('单支或成组花材请选择花卉品种')
  }

  const finalCover = coverImage || images[0] || ''
  const finalImages = finalCover
    ? [finalCover, ...images.filter((item) => item !== finalCover)]
    : images

  return {
    name,
    price,
    salesType,
    unit,
    stock,
    description,
    categoryId,
    flowerKindId: needsFlowerPick ? flowerKindId : '',
    flowerKindName: needsFlowerPick ? flowerKindName : '',
    flowerVarietyId: needsFlowerPick ? flowerVarietyId : '',
    flowerVarietyName: needsFlowerPick ? flowerVarietyName : '',
    coverImage: finalCover,
    images: finalImages,
    onSale,
    recommend,
    sort,
  }
}

async function finalizeGoodsPayload(input) {
  const payload = normalizeGoodsInput(input)
  const categoryMeta = await resolveCategoryMeta(payload.categoryId)
  return {
    ...payload,
    ...categoryMeta,
  }
}

async function listOnSaleGoods(options = {}) {
  const {
    keyword = '',
    categoryId = '',
    recommendOnly = false,
    inStockOnly = false,
  } = options

  await ensureCollection('goods')

  const { data } = await db.collection('goods').get()
  const text = String(keyword).trim().toLowerCase()
  const catId = String(categoryId).trim()

  return data
    .map(pickGoods)
    .filter((item) => {
      if (item.onSale === false) return false
      if (recommendOnly && !item.recommend) return false
      if (inStockOnly && item.stock <= 0) return false
      if (catId && item.categoryId !== catId) return false
      if (!text) return true
      return item.name.toLowerCase().includes(text)
    })
    .sort((a, b) => b.sort - a.sort)
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const operatorOpenid = wxContext.OPENID
  const { action } = event

  if (action === 'publicList') {
    try {
      const {
        keyword = '',
        categoryId = '',
        recommendOnly = false,
        inStockOnly = false,
      } = event
      const list = await listOnSaleGoods({
        keyword,
        categoryId,
        recommendOnly,
        inStockOnly,
      })
      return { success: true, list }
    } catch (err) {
      return {
        success: false,
        errMsg: err.message || err.errMsg || '获取商品列表失败',
      }
    }
  }

  if (action === 'publicGet') {
    try {
      const { id } = event
      if (!id) {
        return { success: false, errMsg: '缺少商品 ID' }
      }

      await ensureCollection('goods')
      const { data } = await db.collection('goods').doc(id).get()
      if (!data || data.onSale === false) {
        return { success: false, errMsg: '商品不存在或已下架' }
      }

      return { success: true, goods: pickGoods(data) }
    } catch (err) {
      return {
        success: false,
        errMsg: err.message || err.errMsg || '获取商品详情失败',
      }
    }
  }

  if (!operatorOpenid) {
    return { success: false, errMsg: '无法获取操作者身份' }
  }

  if (action === 'list') {
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

  if (action === 'get') {
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

  if (action === 'add' || action === 'update') {
    const canManage = await isMerchant(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限操作商品' }
    }

    await ensureCollection('goods')

    try {
      const payload = await finalizeGoodsPayload(event.goods || {})

      if (action === 'add') {
        const addRes = await db.collection('goods').add({
          data: {
            ...payload,
            createdBy: operatorOpenid,
            createdAt: db.serverDate(),
            updatedAt: db.serverDate(),
          },
        })

        const { data } = await db.collection('goods').doc(addRes._id).get()
        await safeBumpCacheModule('goods')
        return { success: true, goods: pickGoods(data) }
      }

      const { id } = event
      if (!id) {
        return { success: false, errMsg: '缺少商品 ID' }
      }

      await db.collection('goods').doc(id).update({
        data: {
          ...payload,
          updatedAt: db.serverDate(),
          updatedBy: operatorOpenid,
        },
      })

      const { data } = await db.collection('goods').doc(id).get()
      await safeBumpCacheModule('goods')
      return { success: true, goods: pickGoods(data) }
    } catch (err) {
      return {
        success: false,
        errMsg: err.message || err.errMsg || '保存商品失败',
      }
    }
  }

  if (action === 'remove') {
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
    await safeBumpCacheModule('goods')
    return { success: true }
  }

  return { success: false, errMsg: '未知操作' }
}
