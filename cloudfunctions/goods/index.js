const cloud = require('wx-server-sdk')
const { bumpCacheModule } = require('./common/cacheMeta')
const { resolveUserByWechatMp } = require('./common/account')
const {
  buildWikiAliasToCanonical,
  canonicalizeWikiKindName,
  goodsBelongsToWikiKind,
} = require('./common/wikiKindMatch')
const {
  resolveFileUrls,
  enrichPublicGoodsList,
  enrichPublicGoods,
} = require('./common/fileUrls')

/**
 * 下载原图 → sharp 缩放+转 webp → 上传回云储存
 * @param {string} baseUrl - 原图 HTTPS URL
 * @param {number} width - 目标宽度（px）
 * @param {number} quality - WebP 质量（1-100）
 * @param {string} targetCloudPath - 上传路径
 * @returns {Promise<string>} 云存储 fileID
 */
async function downloadProcessedAndUpload(baseUrl, width, quality, targetCloudPath) {
  const https = require('https')
  const fs = require('fs')
  const path = require('path')

  const tmpSrc = path.join('/tmp', `src_${Date.now()}`)
  const tmpOut = path.join('/tmp', `out_${Date.now()}.webp`)

  // 下载原图
  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(tmpSrc)
    https.get(baseUrl, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`download failed: ${res.statusCode}`))
        return
      }
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
    }).on('error', (err) => {
      fs.unlink(tmpSrc, () => {})
      reject(err)
    })
  })

  // sharp 缩放 + webp（按需加载，不破坏其他 action）
  let sharp
  try {
    sharp = require('sharp')
  } catch (e) {
    throw new Error('sharp 未安装，请先部署依赖：npm install sharp')
  }
  try {
    const info = await sharp(tmpSrc)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality })
      .toFile(tmpOut)
    if (!info?.size || info.size === 0) throw new Error('sharp output empty')
  } catch (err) {
    try { fs.unlink(tmpSrc, () => {}) } catch {}
    try { fs.unlink(tmpOut, () => {}) } catch {}
    throw err
  }

  const { fileID } = await cloud.uploadFile({
    cloudPath: targetCloudPath,
    filePath: tmpOut,
  })

  try { fs.unlink(tmpSrc, () => {}) } catch {}
  try { fs.unlink(tmpOut, () => {}) } catch {}

  return fileID
}

async function safeBumpCacheModule(module) {
  try {
    await bumpCacheModule(module)
  } catch (err) {
    console.error('[goods] bump cache failed:', err.message || err)
  }
}

/** 商品变更会影响分类启用状态（goodsCount），一并刷新分类缓存版本 */
async function safeBumpGoodsRelatedCaches() {
  await safeBumpCacheModule('goods')
  await safeBumpCacheModule('categories')
}

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()
const _ = db.command

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

async function resolveOperatorProfile(openid) {
  if (!openid) {
    return { openid: '', userId: '', name: '未知', avatarUrl: '' }
  }

  let name = '工作人员'
  let userId = ''
  let avatarUrl = ''

  try {
    const user = await resolveUserByWechatMp(openid)
    userId = user?.userId || ''
    if (user?.nickName) name = user.nickName
    if (user?.avatarUrl) avatarUrl = user.avatarUrl
  } catch (err) {
    console.error('[goods] resolve operator user failed:', err.message || err)
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
    console.error('[goods] resolve operator merchant failed:', err.message || err)
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

async function applyStockMovement({
  goodsId,
  delta,
  direction,
  operatorOpenid,
  operator,
  batchId,
}) {
  const { data: doc } = await db.collection('goods').doc(goodsId).get()
  if (!doc) {
    return { ok: false, errMsg: '商品不存在' }
  }

  const stockBefore = Number(doc.stock) || 0
  const signedDelta = direction === 'in' ? delta : -delta
  const stockAfter = stockBefore + signedDelta

  if (delta <= 0) {
    return { ok: false, errMsg: '数量无效' }
  }
  if (direction === 'out' && stockAfter < 0) {
    return {
      ok: false,
      errMsg: `「${doc.name || '商品'}」可售数不足（当前 ${stockBefore}）`,
    }
  }

  await db.collection('goods').doc(goodsId).update({
    data: {
      stock: db.command.inc(signedDelta),
      updatedAt: db.serverDate(),
      updatedBy: operatorOpenid,
    },
  })

  await appendWarehouseLedger({
    type: direction === 'in' ? 'stock_in' : 'stock_out',
    batchId,
    goodsId,
    goodsName: doc.name || '',
    unit: doc.unit || '件',
    delta,
    stockBefore,
    stockAfter,
    operatorOpenid,
    operatorUserId: operator.userId || '',
    operatorName: operator.name || '工作人员',
    operatorAvatar: operator.avatarUrl || '',
  })

  return { ok: true }
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
  const categoryId = String(doc.categoryId || '').trim()
  let categoryName = String(doc.categoryName || doc.category || '').trim()
  if (!categoryName && categoryId.startsWith('wiki:')) {
    categoryName = categoryId.slice(5).trim()
  }
  if (!categoryName && (salesType === 'stem' || salesType === 'group')) {
    categoryName = String(doc.flowerKindName || '').trim()
  }
  return {
    _id: doc._id,
    name: doc.name || '',
    price: Number(doc.price) || 0,
    salesType,
    unit: normalizeUnit(doc.unit, salesType),
    stock: Number(doc.stock) || 0,
    description: doc.description || '',
    categoryId,
    categoryName,
    flowerKindId: doc.flowerKindId || '',
    flowerKindName: doc.flowerKindName || '',
    flowerVarietyId: doc.flowerVarietyId || '',
    flowerVarietyName: doc.flowerVarietyName || '',
    coverImage: doc.coverImage || (doc.images && doc.images[0]) || '',
    coverThumb: doc.coverThumb || doc.coverImage || (doc.images && doc.images[0]) || '', // 兼容字段，等同 coverImage
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

  // wiki 衍生分类：从 ID 中提取名称，无需查库
  if (categoryId.startsWith('wiki:')) {
    return {
      categoryId,
      categoryName: categoryId.replace(/^wiki:/, '').trim(),
      categoryType: '',
    }
  }

  await ensureCollection('categories')
  const { data } = await db.collection('categories').doc(categoryId).get()
  if (!data) {
    throw new Error('所选分类不存在')
  }

  const categoryType = ['bouquet', 'material'].includes(data.categoryType)
    ? data.categoryType
    : ''

  return {
    categoryId,
    categoryName: data.name || '',
    categoryType,
  }
}

function normalizeGoodsInput(input) {
  const name = String(input.name || '').trim()
  const price = Number(input.price)
  const salesType = normalizeSalesType(input.salesType) || inferSalesType(input)
  const unit = normalizeUnit(input.unit, salesType)
  const stockParsed = parseInt(input.stock, 10)
  const stock = Number.isNaN(stockParsed) ? 0 : stockParsed
  const description = String(input.description || '').trim()
  const coverImage = String(input.coverImage || '').trim()
  const images = Array.isArray(input.images) ? input.images.filter(Boolean) : []
  const onSale = input.onSale !== false
  const recommend = input.recommend === true
  const sort = Number(input.sort) || 0
  const flowerKindId = String(input.flowerKindId || '').trim()
  let flowerKindName = String(input.flowerKindName || '').trim()
  const flowerVarietyId = String(input.flowerVarietyId || '').trim()
  const flowerVarietyName = String(input.flowerVarietyName || '').trim()
  const needsFlowerPick = salesType === 'stem' || salesType === 'group'
  const unitsPerGroupRaw =
    salesType === 'group' ? parseInt(input.unitsPerGroup, 10) : undefined

  let resolvedCategoryId = String(input.categoryId || '').trim()
  const wikiAliasMap = buildWikiAliasToCanonical()
  if (needsFlowerPick && flowerKindName) {
    flowerKindName = canonicalizeWikiKindName(flowerKindName, wikiAliasMap)
    resolvedCategoryId = `wiki:${flowerKindName}`
  } else if (needsFlowerPick && resolvedCategoryId.startsWith('wiki:')) {
    const rawKind = resolvedCategoryId.slice(5).trim()
    flowerKindName = canonicalizeWikiKindName(rawKind, wikiAliasMap)
    resolvedCategoryId = `wiki:${flowerKindName}`
  } else if (!needsFlowerPick && resolvedCategoryId.startsWith('wiki:')) {
    throw new Error('束装/计件商品不能选择鲜花衍生分类，请重新选择分类')
  }

  if (!name) {
    throw new Error('商品名称不能为空')
  }
  if (!resolvedCategoryId) {
    throw new Error('请选择商品分类')
  }
  if (Number.isNaN(price) || price < 0) {
    throw new Error('请输入有效的商品价格')
  }
  if (Number.isNaN(stock) || stock < 0) {
    throw new Error('库存不能为负数')
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
    categoryId: resolvedCategoryId,
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

  if (payload.salesType === 'bouquet' && categoryMeta.categoryType === 'material') {
    throw new Error('捆扎成束商品请选择花束场景分类')
  }
  if (payload.salesType === 'other' && categoryMeta.categoryType === 'bouquet') {
    throw new Error('计件商品请选择物料品类')
  }
  if (payload.salesType === 'other' && categoryMeta.categoryType && categoryMeta.categoryType !== 'material') {
    throw new Error('计件商品请选择物料品类')
  }
  if (payload.salesType === 'bouquet' && categoryMeta.categoryType && categoryMeta.categoryType !== 'bouquet') {
    throw new Error('捆扎成束商品请选择花束场景分类')
  }

  return {
    ...payload,
    categoryId: categoryMeta.categoryId,
    categoryName: categoryMeta.categoryName,
  }
}

const {
  normalizeGoodsQuery,
  tokenizeQuery,
  filterPublicGoodsList,
} = require('./goodsPublicSearch')

function toGoodsListItem(item) {
  return {
    _id: item._id,
    name: item.name,
    price: item.price,
    salesType: item.salesType,
    unit: item.unit,
    stock: item.stock,
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    flowerKindId: item.flowerKindId,
    flowerKindName: item.flowerKindName,
    flowerVarietyId: item.flowerVarietyId,
    flowerVarietyName: item.flowerVarietyName,
    coverThumb: item.coverThumb || item.coverImage,
    coverImage: item.coverImage,
    onSale: item.onSale,
    recommend: item.recommend,
    sort: item.sort,
    listedAt: item.listedAt,
    unitsPerGroup: item.unitsPerGroup,
  }
}

function sortPublicGoodsList(list) {
  return [...list].sort((a, b) => {
    const sortDiff = (Number(b.sort) || 0) - (Number(a.sort) || 0)
    if (sortDiff) return sortDiff
    const ta = Date.parse(a.listedAt || a.createdAt || '') || 0
    const tb = Date.parse(b.listedAt || b.createdAt || '') || 0
    if (tb !== ta) return tb - ta
    return String(a._id).localeCompare(String(b._id))
  })
}

async function listOnSaleGoodsPaginated(options = {}) {
  const {
    cursor = 0,
    limit = 24,
    slim = false,
    keyword = '',
    categoryId = '',
    recommendOnly = false,
    inStockOnly = false,
    query,
  } = options

  const filtered = await listOnSaleGoods({
    keyword,
    categoryId,
    recommendOnly,
    inStockOnly,
    query,
  })
  const sorted = sortPublicGoodsList(filtered)
  const start = Math.max(0, Number(cursor) || 0)
  const pageLimit = Math.min(Math.max(Number(limit) || 24, 1), 100)
  const slice = sorted.slice(start, start + pageLimit)
  const nextCursor = start + slice.length < sorted.length ? start + slice.length : null
  const list = slim ? slice.map(toGoodsListItem) : slice

  return {
    list,
    hasMore: nextCursor != null,
    nextCursor,
    total: sorted.length,
  }
}

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
        cursor,
        limit,
        slim,
      } = event

      const usePagination =
        cursor != null || limit != null || slim === true || slim === 'true'

      if (usePagination) {
        const page = await listOnSaleGoodsPaginated({
          keyword,
          categoryId,
          recommendOnly,
          inStockOnly,
          query,
          cursor: cursor != null ? Number(cursor) : 0,
          limit: limit != null ? Number(limit) : 24,
          slim: slim !== false && slim !== 'false',
        })
        return {
          success: true,
          list: await enrichPublicGoodsList(page.list),
          hasMore: page.hasMore,
          nextCursor: page.nextCursor,
          total: page.total,
        }
      }

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
    await safeBumpGoodsRelatedCaches()
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
    await safeBumpGoodsRelatedCaches()
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
    await safeBumpGoodsRelatedCaches()
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
    const operator = await resolveOperatorProfile(operatorOpenid)
    const batchId = `stock_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    let applied = 0
    const errors = []

    for (const raw of items) {
      const id = String(raw?.goodsId || raw?.id || '').trim()
      const delta = parseInt(raw?.delta, 10)
      if (!id || Number.isNaN(delta) || delta <= 0) continue

      const result = await applyStockMovement({
        goodsId: id,
        delta,
        direction: 'in',
        operatorOpenid,
        operator,
        batchId,
      })
      if (result.ok) {
        applied += 1
      } else if (result.errMsg) {
        errors.push(result.errMsg)
      }
    }

    if (!applied) {
      return {
        success: false,
        errMsg: errors[0] || '没有有效的入库项',
      }
    }

    await safeBumpGoodsRelatedCaches()
    return { success: true, applied }
  }

  if (action === 'stockOut') {
    const canManage = await isMerchant(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限出库' }
    }

    const items = Array.isArray(event.items) ? event.items : []
    if (!items.length) {
      return { success: false, errMsg: '请填写出库数量' }
    }

    await ensureCollection('goods')
    const operator = await resolveOperatorProfile(operatorOpenid)
    const batchId = `stock_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    let applied = 0
    const errors = []

    for (const raw of items) {
      const id = String(raw?.goodsId || raw?.id || '').trim()
      const delta = parseInt(raw?.delta, 10)
      if (!id || Number.isNaN(delta) || delta <= 0) continue

      const result = await applyStockMovement({
        goodsId: id,
        delta,
        direction: 'out',
        operatorOpenid,
        operator,
        batchId,
      })
      if (result.ok) {
        applied += 1
      } else if (result.errMsg) {
        errors.push(result.errMsg)
      }
    }

    if (!applied) {
      return {
        success: false,
        errMsg: errors[0] || '没有有效的出库项',
      }
    }

    await safeBumpGoodsRelatedCaches()
    return { success: true, applied }
  }

  if (action === 'listWarehouseLedger') {
    const canManage = await isMerchant(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限查看仓储历史' }
    }

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
          batchId: bid,
          type: doc.type || 'stock_in',
          createdAt: doc.createdAt,
          operatorOpenid: doc.operatorOpenid || '',
          operatorUserId: doc.operatorUserId || '',
          operatorName: doc.operatorName || '',
          operatorAvatar: doc.operatorAvatar || '',
          orderId: doc.orderId || '',
          orderNo: doc.orderNo || '',
          items: [],
        })
      }
      const batch = batchMap.get(bid)
      batch.items.push({
        goodsId: doc.goodsId || '',
        goodsName: doc.goodsName || '',
        unit: doc.unit || '件',
        delta: Number(doc.delta) || 0,
        stockBefore: Number(doc.stockBefore) || 0,
        stockAfter: Number(doc.stockAfter) || 0,
      })
    }

    // 聚合批次类型和操作人
    const batches = []
    for (const batch of batchMap.values()) {
      // 取批次内最新一条的类型和操作人
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

    // 按时间排序取需要的数量
    batches.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return tb - ta
    })
    const paged = batches.slice(skip, skip + limit)

    // 解析操作员头像
    const avatarIds = []
    const missingAvatarBatches = []
    for (const batch of paged) {
      if (batch.operatorAvatar && String(batch.operatorAvatar).startsWith('cloud://')) {
        avatarIds.push(batch.operatorAvatar)
      } else if (!batch.operatorAvatar && batch.operatorOpenid) {
        missingAvatarBatches.push(batch)
      }
    }

    // 批量解析 cloud:// 头像
    if (avatarIds.length) {
      const avatarUrlMap = await resolveFileUrls(avatarIds)
      for (const batch of paged) {
        if (batch.operatorAvatar && avatarUrlMap[batch.operatorAvatar]) {
          batch.operatorAvatar = avatarUrlMap[batch.operatorAvatar]
        }
      }
    }

    // 兜底：没有头像的实时查用户资料
    if (missingAvatarBatches.length) {
      const db = cloud.database()
      await ensureCollection('users')
      for (const batch of missingAvatarBatches) {
        try {
          const profile = await resolveOperatorProfile(batch.operatorOpenid)
          if (profile.avatarUrl) {
            if (String(profile.avatarUrl).startsWith('cloud://')) {
              const map = await resolveFileUrls([profile.avatarUrl])
              batch.operatorAvatar = map[profile.avatarUrl] || profile.avatarUrl
            } else {
              batch.operatorAvatar = profile.avatarUrl
            }
          }
        } catch (err) {
          console.warn('[goods] resolve avatar failed:', batch.batchId, err.message || err)
        }
      }
    }

    return { success: true, list: paged }
  }

  if (action === 'processImageUpload') {
    const canManage = await isMerchant(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限上传素材' }
    }

    const fileId = String(event.fileId || '').trim()
    const rawName = String(event.name || '').trim()
    if (!fileId || !rawName) {
      return { success: false, errMsg: '缺少 fileId 或 name' }
    }
    if (!fileId.startsWith('cloud://')) {
      return { success: false, errMsg: 'fileId 格式错误' }
    }

    // 解析扩展名
    const extMatch = rawName.match(/\.(\w+)$/)
    const ext = extMatch?.[1] || 'jpg'

    // 构建云存储路径（去掉 cloud:// 前缀的环境部分）
    const nameBase = rawName.replace(/\.\w+$/, '').replace(/[^\w\u4e00-\u9fff_-]/g, '_')

    const assetType = String(event.type || 'goods').trim()
    const validTypes = ['goods', 'banner']
    const type = validTypes.includes(assetType) ? assetType : 'goods'
    const isBanner = type === 'banner'

    try {
      // 换链原图
      const urlMap = {}
      const resolved = await resolveFileUrls([fileId])
      const baseUrl = resolved[fileId]
      if (!baseUrl) throw new Error('换链失败')

      // 标准图 750px, q=80, webp（所有类型都需要）
      const standardPath = `assets/${nameBase}__standard.webp`
      let standardFileId = ''
      try {
        standardFileId = await downloadProcessedAndUpload(
          baseUrl,
          750,
          80,
          standardPath,
        )
      } catch (err) {
        console.warn('[goods] standard generation failed:', err.message || err)
      }

      // 预览图 160px, q=25, webp（仅商品图需要，Banner 不需要缩略图）
      let previewFileId = ''
      if (!isBanner) {
        const previewPath = `assets/${nameBase}__preview.webp`
        try {
          previewFileId = await downloadProcessedAndUpload(
            baseUrl,
            160,
            25,
            previewPath,
          )
        } catch (err) {
          console.warn('[goods] preview generation failed:', err.message || err)
        }
      }

      // 记录到 asset_meta
      await ensureCollection('asset_meta')
      const now = db.serverDate()
      await db.collection('asset_meta').add({
        data: {
          name: rawName,
          type,
          originalFileId: fileId,
          previewFileId: previewFileId || (isBanner ? '' : fileId),
          standardFileId: standardFileId || fileId,
          createdAt: now,
          updatedAt: now,
        },
      })

      return {
        success: true,
        previewFileId: previewFileId || (isBanner ? '' : fileId),
        standardFileId: standardFileId || fileId,
        originalFileId: fileId,
      }
    } catch (err) {
      console.error('[goods] processImageUpload failed:', err.message || err)
      // 降级：返回原图
      return {
        success: true,
        previewFileId: fileId,
        standardFileId: fileId,
        originalFileId: fileId,
        degraded: true,
      }
    }
  }

  if (action === 'assetList') {
    const canManage = await isMerchant(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限查看素材' }
    }

    await ensureCollection('asset_meta')

    const assetType = String(event.type || '').trim()
    let query = db.collection('asset_meta')
    if (assetType === 'goods' || assetType === 'banner') {
      query = query.where({ type: assetType })
    }
    const { data } = await query.orderBy('createdAt', 'desc').get()

    const list = (data || []).map((doc) => ({
      _id: doc._id,
      name: doc.name || '',
      type: doc.type || 'goods',
      originalFileId: doc.originalFileId || '',
      previewFileId: doc.previewFileId || '',
      standardFileId: doc.standardFileId || '',
      createdAt: doc.createdAt,
    }))

    // 批量换链显示 URL
    const allFileIds = []
    for (const item of list) {
      if (item.previewFileId) allFileIds.push(item.previewFileId)
      if (item.standardFileId) allFileIds.push(item.standardFileId)
    }
    const urlMap = allFileIds.length ? await resolveFileUrls(allFileIds) : {}

    for (const item of list) {
      item.previewUrl = item.previewFileId ? (urlMap[item.previewFileId] || '') : ''
      item.standardUrl = urlMap[item.standardFileId] || ''
    }

    return { success: true, list }
  }

  if (action === 'assetCleanup') {
    const canManage = await isMerchant(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限' }
    }

    await ensureCollection('asset_meta')
    const { data } = await db.collection('asset_meta').get()
    const toDelete = []
    for (const doc of data || []) {
      if (doc.originalFileId) toDelete.push(doc.originalFileId)
      if (doc.previewFileId && doc.previewFileId !== doc.originalFileId) toDelete.push(doc.previewFileId)
      if (doc.standardFileId && doc.standardFileId !== doc.originalFileId) toDelete.push(doc.standardFileId)
    }

    let deletedCount = 0
    if (toDelete.length) {
      try {
        const batchSize = 50
        for (let i = 0; i < toDelete.length; i += batchSize) {
          const batch = toDelete.slice(i, i + batchSize)
          await cloud.deleteFile({ fileList: batch })
          deletedCount += batch.length
        }
      } catch (err) {
        console.warn('[goods] cleanup delete files failed:', err.message || err)
      }
    }

    await db.collection('asset_meta').drop().catch(() => {})

    return { success: true, deletedFileCount: deletedCount, deletedMetaCount: (data || []).length }
  }

  if (action === 'assetRename') {
    const canManage = await isMerchant(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限修改素材' }
    }

    const assetId = String(event.assetId || '').trim()
    const newName = String(event.name || '').trim()
    if (!assetId || !newName) {
      return { success: false, errMsg: '缺少参数' }
    }

    await ensureCollection('asset_meta')

    const { data } = await db.collection('asset_meta').doc(assetId).get()
    if (!data) {
      return { success: false, errMsg: '素材不存在' }
    }

    await db.collection('asset_meta').doc(assetId).update({
      data: {
        name: newName,
        updatedAt: db.serverDate(),
      },
    })

    return { success: true }
  }

  if (action === 'assetDelete') {
    const canManage = await isMerchant(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限删除素材' }
    }

    const assetId = String(event.assetId || '').trim()
    if (!assetId) {
      return { success: false, errMsg: '缺少参数' }
    }

    await ensureCollection('asset_meta')

    const { data } = await db.collection('asset_meta').doc(assetId).get()
    if (!data) {
      return { success: false, errMsg: '素材不存在' }
    }

    // 删除云存储中的文件
    const toDelete = [data.originalFileId, data.previewFileId, data.standardFileId]
      .filter(Boolean)
    if (toDelete.length) {
      try {
        await cloud.deleteFile({ fileList: toDelete })
      } catch (err) {
        console.warn('[goods] asset delete files failed:', err.message || err)
      }
    }

    await db.collection('asset_meta').doc(assetId).remove()

    return { success: true }
  }

  if (action === 'seedWarehouseTestData') {
    const canManage = await isMerchant(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限' }
    }

    await ensureCollection('goods')
    const { data: goodsData } = await db.collection('goods').limit(5).get()
    const goodsNames = goodsData.map((g) => g.name || '商品')
    const goodsIds = goodsData.map((g) => g._id)

    if (!goodsIds.length) {
      return { success: false, errMsg: '请先创建商品' }
    }

    const { data: staffData } = await db.collection('merchants').limit(3).get()
    const staffNames = staffData.map((s) => s.name || s.nickName || '工作人员').filter(Boolean)
    if (!staffNames.length) staffNames.push('张店长', '李师傅', '王采购')

    // 生成测试数据
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
              batchId,
              type,
              goodsId: goodsIds[gIdx],
              goodsName: goodsNames[gIdx] || '商品',
              unit: '件',
              delta,
              stockBefore: Math.max(0, stockBefore),
              stockAfter: Math.max(0, stockAfter),
              operatorOpenid: operatorOpenid,
              operatorUserId: '',
              operatorName: operator,
              orderId: '',
              orderNo: '',
              createdAt: new Date(dayStart + o * 3600000 + i * 600000),
            },
          })
        }
      }
    }

    return { success: true, count: days.length }
  }

  if (action === 'cleanupWarehouseTestData') {
    const canManage = await isMerchant(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限' }
    }

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

  return { success: false, errMsg: '未知操作' }
}
