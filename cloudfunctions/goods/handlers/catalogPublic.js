const shared = require('../shared')
const cloud = shared.cloud
const db = shared.db
const { ensureCollection } = require('../common/merchantGate')
const {
  resolveFileUrls: resolveCloudFileUrls,
  enrichPublicGoodsList,
  enrichPublicGoods,
} = require('../common/fileUrls')

const {
  pickGoods,
  listOnSaleGoodsPaginated,
  listOnSaleGoods,
  searchPublicGoods,
} = shared

async function publicList(event) {
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

async function publicSearch(event) {
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

async function publicGet(event) {
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

async function resolveFileUrls(event) {
  try {
    const urls = await resolveCloudFileUrls(event.fileList)
    return { success: true, urls }
  } catch (err) {
    return {
      success: false,
      errMsg: err.message || err.errMsg || '换取图片链接失败',
    }
  }
}

async function publicImage(event) {
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

module.exports = {
  publicList,
  publicSearch,
  publicGet,
  publicImage,
  resolveFileUrls,
}
