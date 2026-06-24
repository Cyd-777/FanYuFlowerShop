const cloud = require('wx-server-sdk')
const { bumpCacheModule } = require('./common/cacheMeta')
const {
  resolveFileUrls,
  enrichPublicGoodsList,
  enrichPublicGoods,
} = require('./common/fileUrls')

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
    listedAt: doc.listedAt || doc.createdAt || '',
    unitsPerGroup:
      doc.unitsPerGroup != null && Number(doc.unitsPerGroup) > 0
        ? Number(doc.unitsPerGroup)
        : undefined,
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
  const unitsPerGroupRaw =
    salesType === 'group' ? parseInt(input.unitsPerGroup, 10) : undefined

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
  if (salesType === 'group') {
    if (Number.isNaN(unitsPerGroupRaw) || unitsPerGroupRaw <= 0) {
      throw new Error('成组售卖请填写每组数量')
    }
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
    ...(salesType === 'group' ? { unitsPerGroup: unitsPerGroupRaw } : {}),
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

const {
  normalizeGoodsQuery,
  tokenizeQuery,
  filterPublicGoodsList,
} = require('./goodsPublicSearch')

async function listOnSaleGoods(options = {}) {
  const {
    keyword = '',
    categoryId = '',
    recommendOnly = false,
    inStockOnly = false,
    query,
  } = options

  await ensureCollection('goods')
  const { data } = await db.collection('goods').get()

  const searchInput =
    query && typeof query === 'object'
      ? query
      : {
          text: keyword,
          textTokens: tokenizeQuery(keyword),
          categoryId,
          recommendOnly,
          inStockOnly,
        }

  return filterPublicGoodsList(data.map(pickGoods), searchInput)
}

async function searchPublicGoods(queryInput = {}) {
  return listOnSaleGoods({ query: queryInput })
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
        query,
      } = event
      const list = await listOnSaleGoods({
        keyword,
        categoryId,
        recommendOnly,
        inStockOnly,
        query,
      })
      return { success: true, list: await enrichPublicGoodsList(list) }
    } catch (err) {
      return {
        success: false,
        errMsg: err.message || err.errMsg || '获取商品列表失败',
      }
    }
  }

  if (action === 'publicSearch') {
    try {
      const { query = {} } = event
      const list = await searchPublicGoods(query)
      return { success: true, list: await enrichPublicGoodsList(list) }
    } catch (err) {
      return {
        success: false,
        errMsg: err.message || err.errMsg || '搜索商品失败',
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

      return { success: true, goods: await enrichPublicGoods(pickGoods(data)) }
    } catch (err) {
      return {
        success: false,
        errMsg: err.message || err.errMsg || '获取商品详情失败',
      }
    }
  }

  if (action === 'resolveFileUrls') {
    try {
      const urls = await resolveFileUrls(event.fileList)
      return { success: true, urls }
    } catch (err) {
      return {
        success: false,
        errMsg: err.message || err.errMsg || '换取图片链接失败',
      }
    }
  }

  /** 云函数侧读取存储文件（管理员权限），供顾客端在「仅创建者可读」时使用 */
  if (action === 'publicImage') {
    try {
      const fileId = String(event.fileId || '').trim()
      if (!fileId.startsWith('cloud://')) {
        return { success: false, errMsg: '无效的文件 ID' }
      }

      const res = await cloud.downloadFile({ fileID: fileId })
      if (!res.fileContent) {
        return { success: false, errMsg: '读取图片失败' }
      }

      const lower = fileId.toLowerCase()
      let mime = 'image/jpeg'
      if (lower.endsWith('.png')) mime = 'image/png'
      else if (lower.endsWith('.webp')) mime = 'image/webp'
      else if (lower.endsWith('.gif')) mime = 'image/gif'

      return {
        success: true,
        mime,
        base64: res.fileContent.toString('base64'),
      }
    } catch (err) {
      return {
        success: false,
        errMsg: err.message || err.errMsg || '读取图片失败',
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
            listedAt: payload.onSale !== false ? db.serverDate() : null,
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

  if (action === 'batchRemove') {
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
    await safeBumpCacheModule('goods')
    return { success: true, removed: ids.length }
  }

  if (action === 'batchUpdate') {
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
    await safeBumpCacheModule('goods')
    return { success: true, updated: ids.length }
  }

  if (action === 'stockIn') {
    const canManage = await isMerchant(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限入库' }
    }

    const items = Array.isArray(event.items) ? event.items : []
    if (!items.length) {
      return { success: false, errMsg: '请填写入库数量' }
    }

    await ensureCollection('goods')
    let applied = 0

    for (const raw of items) {
      const id = String(raw?.goodsId || raw?.id || '').trim()
      const delta = parseInt(raw?.delta, 10)
      if (!id || Number.isNaN(delta) || delta <= 0) continue

      await db.collection('goods').doc(id).update({
        data: {
          stock: db.command.inc(delta),
          updatedAt: db.serverDate(),
          updatedBy: operatorOpenid,
        },
      })
      applied += 1
    }

    if (!applied) {
      return { success: false, errMsg: '没有有效的入库项' }
    }

    await safeBumpCacheModule('goods')
    return { success: true, applied }
  }

  return { success: false, errMsg: '未知操作' }
}
