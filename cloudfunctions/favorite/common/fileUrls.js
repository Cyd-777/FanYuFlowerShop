/**
 * 云存储 fileID → 临时 HTTPS（云函数侧，不受「仅创建者可读」限制）
 * 供顾客端公开读接口使用；部署前由 scripts/sync-cloud-common.js 同步到各云函数目录
 *
 * 图片处理默认 imageMogr2 URL 参数（与 src/config/imageProcessing.ts 一致，无需控制台建样式）
 * @see https://docs.cloudbase.net/storage/ci-cos-processing
 */
const cloud = require('wx-server-sdk')

const FILE_URL_BATCH_SIZE = 50

/** 与 src/config/imageProcessing.ts 保持一致 */
const CLOUD_IMAGE_PROCESS_MODE = process.env.CLOUD_IMAGE_PROCESS_MODE || 'url'
const GOODS_IMAGE_PREVIEW_RULE =
  process.env.GOODS_IMAGE_PREVIEW_RULE || 'imageMogr2/thumbnail/240x/quality/75'
const GOODS_IMAGE_FULL_RULE = process.env.GOODS_IMAGE_FULL_RULE || ''
const GOODS_IMAGE_PREVIEW_STYLE = process.env.GOODS_IMAGE_PREVIEW_STYLE || 'goods-preview'
const GOODS_IMAGE_FULL_STYLE = process.env.GOODS_IMAGE_FULL_STYLE || 'goods-full'

const RULE_BY_TIER = {
  preview: GOODS_IMAGE_PREVIEW_RULE,
  full: GOODS_IMAGE_FULL_RULE,
}

const STYLE_BY_TIER = {
  preview: GOODS_IMAGE_PREVIEW_STYLE,
  full: GOODS_IMAGE_FULL_STYLE,
}

function configuredStyles() {
  return [GOODS_IMAGE_PREVIEW_STYLE, GOODS_IMAGE_FULL_STYLE].filter(Boolean)
}

function normalizeCloudFileIds(fileList) {
  return [
    ...new Set(
      (Array.isArray(fileList) ? fileList : [])
        .map((id) => String(id || '').trim())
        .filter((id) => id.startsWith('cloud://')),
    ),
  ]
}

function stripImageMogr2Params(url) {
  const qIndex = url.indexOf('?')
  if (qIndex === -1) return url

  const path = url.slice(0, qIndex)
  const query = url.slice(qIndex + 1)
  const kept = query
    .split('&')
    .map((part) => part.trim())
    .filter((part) => part && !part.startsWith('imageMogr2/'))

  return kept.length ? `${path}?${kept.join('&')}` : path
}

function stripImageStyle(url) {
  if (!url || !/^https?:\/\//.test(url)) return url
  let result = stripImageMogr2Params(String(url).trim()).replace(/\/$/, '')
  for (const style of configuredStyles()) {
    const suffix = `/${style}`
    if (result.endsWith(suffix)) {
      result = result.slice(0, -suffix.length)
      break
    }
  }
  return result
}

function appendImageProcessRule(baseUrl, rule) {
  const trimmed = String(rule || '').trim()
  if (!trimmed) return baseUrl
  const separator = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}${separator}${trimmed}`
}

function applyStyleSuffix(baseUrl, tier) {
  const styleName = STYLE_BY_TIER[tier]
  if (!styleName) return baseUrl
  if (baseUrl.endsWith(`/${styleName}`)) return baseUrl
  return `${baseUrl.replace(/\/$/, '')}/${styleName}`
}

function applyImageStyle(baseUrl, tier = 'preview') {
  const trimmed = stripImageStyle(String(baseUrl || '').trim())
  if (!trimmed || !/^https?:\/\//.test(trimmed)) return trimmed

  if (CLOUD_IMAGE_PROCESS_MODE === 'style') {
    return applyStyleSuffix(trimmed, tier)
  }

  return appendImageProcessRule(trimmed, RULE_BY_TIER[tier] || '')
}

async function resolveFileUrls(fileList) {
  const ids = normalizeCloudFileIds(fileList)
  const urls = {}

  for (let i = 0; i < ids.length; i += FILE_URL_BATCH_SIZE) {
    const batch = ids.slice(i, i + FILE_URL_BATCH_SIZE)
    const res = await cloud.getTempFileURL({ fileList: batch })

    for (const item of res.fileList || []) {
      if (item.fileID && item.tempFileURL) {
        urls[item.fileID] = stripImageStyle(item.tempFileURL)
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

function toPublicImageUrl(fileId, urlMap, tier = 'preview') {
  if (!fileId) return ''
  const base = urlMap[fileId] || (/^https?:\/\//.test(fileId) ? stripImageStyle(fileId) : '')
  if (!base) return ''
  return applyImageStyle(base, tier)
}

function applyPublicImageUrls(goods, urlMap, options = {}) {
  const tier = options.tier || 'preview'
  const listSlim = options.listSlim === true
  const imageIds = Array.isArray(goods.images) ? goods.images : []

  const result = {
    ...goods,
    coverImageUrl: toPublicImageUrl(goods.coverImage || '', urlMap, tier),
  }

  if (!listSlim) {
    result.imageUrls = imageIds.map((id) => toPublicImageUrl(id, urlMap, tier))
  }

  return result
}

async function enrichPublicGoodsList(list, options = {}) {
  if (!Array.isArray(list) || !list.length) return list
  const tier = options.tier || 'preview'
  const urlMap = await resolveFileUrls(collectGoodsImageIds(list))
  return list.map((goods) => applyPublicImageUrls(goods, urlMap, { ...options, tier }))
}

async function enrichPublicGoods(goods) {
  const [item] = await enrichPublicGoodsList([goods], { tier: 'full', listSlim: false })
  return item
}

module.exports = {
  resolveFileUrls,
  applyImageStyle,
  enrichPublicGoodsList,
  enrichPublicGoods,
}
