/**
 * 云存储 fileID → 临时 HTTPS（云函数侧，不受「仅创建者可读」限制）
 * 供顾客端公开读接口使用；部署前由 scripts/sync-cloud-common.js 同步到各云函数目录
 */
const cloud = require('wx-server-sdk')

const FILE_URL_BATCH_SIZE = 50

function normalizeCloudFileIds(fileList) {
  return [
    ...new Set(
      (Array.isArray(fileList) ? fileList : [])
        .map((id) => String(id || '').trim())
        .filter((id) => id.startsWith('cloud://')),
    ),
  ]
}

async function resolveFileUrls(fileList) {
  const ids = normalizeCloudFileIds(fileList)
  const urls = {}

  for (let i = 0; i < ids.length; i += FILE_URL_BATCH_SIZE) {
    const batch = ids.slice(i, i + FILE_URL_BATCH_SIZE)
    const res = await cloud.getTempFileURL({ fileList: batch })

    for (const item of res.fileList || []) {
      if (item.fileID && item.tempFileURL) {
        urls[item.fileID] = item.tempFileURL
        continue
      }
      if (item.fileID) {
        console.warn('[fileUrls] resolve failed:', item.fileID, item.errMsg || item.status)
      }
    }
  }

  return urls
}

function collectGoodsImageIds(goodsList) {
  const ids = new Set()

  for (const goods of goodsList) {
    const cover = goods?.coverImage
    if (typeof cover === 'string' && cover.startsWith('cloud://')) {
      ids.add(cover)
    }
    for (const img of goods?.images || []) {
      if (typeof img === 'string' && img.startsWith('cloud://')) {
        ids.add(img)
      }
    }
  }

  return [...ids]
}

function toPublicImageUrl(fileId, urlMap) {
  if (!fileId) return ''
  if (urlMap[fileId]) return urlMap[fileId]
  if (/^https?:\/\//.test(fileId)) return fileId
  return ''
}

function applyPublicImageUrls(goods, urlMap) {
  const imageIds = Array.isArray(goods.images) ? goods.images : []

  return {
    ...goods,
    coverImageUrl: toPublicImageUrl(goods.coverImage || '', urlMap),
    imageUrls: imageIds.map((id) => toPublicImageUrl(id, urlMap)),
  }
}

async function enrichPublicGoodsList(list) {
  if (!Array.isArray(list) || !list.length) return list
  const urlMap = await resolveFileUrls(collectGoodsImageIds(list))
  return list.map((goods) => applyPublicImageUrls(goods, urlMap))
}

async function enrichPublicGoods(goods) {
  const [item] = await enrichPublicGoodsList([goods])
  return item
}

module.exports = {
  resolveFileUrls,
  enrichPublicGoodsList,
  enrichPublicGoods,
}
