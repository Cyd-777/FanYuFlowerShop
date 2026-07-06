const cloud = require('wx-server-sdk')
const { bumpCacheModule } = require('./common/cacheMeta')
const { bumpCacheEvent } = require('./common/cacheInvalidation')
const { isMerchant, ensureCollection, isCollectionMissingError } = require('./common/merchantGate')
const { resolveUserByWechatMp } = require('./common/account')
const {
  buildWikiAliasToCanonical,
  canonicalizeWikiKindName,
  goodsBelongsToWikiKind,
} = require('./common/wikiKindMatch')
const { resolveCanonicalVarietyName } = require('./common/flowerCatalogMerge')
const {
  buildWikiCategoryId,
  parseWikiKindNameFromCategoryId,
  isWikiCategoryId,
} = require('./common/flowerIdentity')
const {
  resolveFileUrls,
  enrichPublicGoodsList,
  enrichPublicGoods,
} = require('./common/fileUrls')
const { notifyStockMovement, safeFireAndForget } = require('./common/bizNotifyEmit')

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

/** 商品目录变更 — 见 cacheInvalidation INVALIDATION_MATRIX.goodsCatalog */
async function safeBumpGoodsRelatedCaches() {
  try {
    await bumpCacheEvent('goodsCatalog')
  } catch (err) {
    console.error('[goods] bump goodsCatalog cache failed:', err.message || err)
  }
}

async function safeBumpGoodsStockCache() {
  try {
    await bumpCacheEvent('goodsStock')
  } catch (err) {
    console.error('[goods] bump goodsStock cache failed:', err.message || err)
  }
}

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()
const _ = db.command

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

  safeFireAndForget(() =>
    notifyStockMovement({
      goodsId,
      goodsName: doc.name || '',
      stockBefore,
      stockAfter,
    }),
  )

  return { ok: true, stockBefore, stockAfter, goodsId, goodsName: doc.name || '' }
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
  if (!categoryName && isWikiCategoryId(categoryId)) {
    categoryName = parseWikiKindNameFromCategoryId(categoryId)
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
  if (isWikiCategoryId(categoryId)) {
    return {
      categoryId,
      categoryName: parseWikiKindNameFromCategoryId(categoryId),
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
  let flowerVarietyName = String(input.flowerVarietyName || '').trim()
  const needsFlowerPick = salesType === 'stem' || salesType === 'group'
  const unitsPerGroupRaw =
    salesType === 'group' ? parseInt(input.unitsPerGroup, 10) : undefined

  let resolvedCategoryId = String(input.categoryId || '').trim()
  const wikiAliasMap = buildWikiAliasToCanonical()
  if (needsFlowerPick && flowerKindName) {
    flowerKindName = canonicalizeWikiKindName(flowerKindName, wikiAliasMap)
    resolvedCategoryId = buildWikiCategoryId(flowerKindName)
  } else if (needsFlowerPick && isWikiCategoryId(resolvedCategoryId)) {
    const rawKind = parseWikiKindNameFromCategoryId(resolvedCategoryId)
    flowerKindName = canonicalizeWikiKindName(rawKind, wikiAliasMap)
    resolvedCategoryId = buildWikiCategoryId(flowerKindName)
  } else if (!needsFlowerPick && isWikiCategoryId(resolvedCategoryId)) {
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
  if (needsFlowerPick && flowerKindName && flowerVarietyName) {
    const canonicalVariety = resolveCanonicalVarietyName(flowerKindName, flowerVarietyName)
    if (canonicalVariety) flowerVarietyName = canonicalVariety
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

module.exports = {
  cloud,
  db,
  _,
  downloadProcessedAndUpload,
  safeBumpGoodsRelatedCaches,
  safeBumpGoodsStockCache,
  resolveOperatorProfile,
  appendWarehouseLedger,
  applyStockMovement,
  pickGoods,
  finalizeGoodsPayload,
  listOnSaleGoodsPaginated,
  listOnSaleGoods,
  searchPublicGoods,
  toGoodsListItem,
}
