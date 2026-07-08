const cloud = require('wx-server-sdk')
const { isMerchant, ensureCollection } = require('./common/merchantGate')
const { resolveFileUrls } = require('./common/fileUrls')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const VALID_TYPES = new Set(['goods', 'banner'])

/**
 * 下载原图 → sharp 缩放+转 webp → 上传回云储存
 */
async function downloadProcessedAndUpload(baseUrl, width, quality, targetCloudPath) {
  const https = require('https')
  const fs = require('fs')
  const path = require('path')

  const tmpSrc = path.join('/tmp', `src_${Date.now()}`)
  const tmpOut = path.join('/tmp', `out_${Date.now()}.webp`)

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

async function processImageUpload(event) {
  const fileId = String(event.fileId || '').trim()
  const rawName = String(event.name || '').trim()
  if (!fileId || !rawName) return { success: false, errMsg: '缺少 fileId 或 name' }
  if (!fileId.startsWith('cloud://')) return { success: false, errMsg: 'fileId 格式错误' }

  const extMatch = rawName.match(/\.(\w+)$/)
  const ext = extMatch?.[1] || 'jpg'
  const nameBase = rawName.replace(/\.\w+$/, '').replace(/[^\w\u4e00-\u9fff_-]/g, '_')

  const assetType = String(event.type || 'goods').trim()
  const type = VALID_TYPES.has(assetType) ? assetType : 'goods'
  const isBanner = type === 'banner'

  try {
    const resolved = await resolveFileUrls([fileId])
    const baseUrl = resolved[fileId]
    if (!baseUrl) throw new Error('换链失败')

    const standardPath = `assets/${nameBase}__standard.webp`
    let standardFileId = ''
    try {
      standardFileId = await downloadProcessedAndUpload(baseUrl, 750, 80, standardPath)
    } catch (err) {
      console.warn('[asset] standard generation failed:', err.message || err)
    }

    let previewFileId = ''
    if (!isBanner) {
      const previewPath = `assets/${nameBase}__preview.webp`
      try {
        previewFileId = await downloadProcessedAndUpload(baseUrl, 160, 25, previewPath)
      } catch (err) {
        console.warn('[asset] preview generation failed:', err.message || err)
      }
    }

    await ensureCollection('asset_meta')
    const now = db.serverDate()
    await db.collection('asset_meta').add({
      data: {
        name: rawName, type,
        originalFileId: fileId,
        previewFileId: previewFileId || (isBanner ? '' : fileId),
        standardFileId: standardFileId || fileId,
        createdAt: now, updatedAt: now,
      },
    })

    return {
      success: true,
      previewFileId: previewFileId || (isBanner ? '' : fileId),
      standardFileId: standardFileId || fileId,
      originalFileId: fileId,
    }
  } catch (err) {
    console.error('[asset] processImageUpload failed:', err.message || err)
    return {
      success: true,
      previewFileId: fileId, standardFileId: fileId, originalFileId: fileId,
      degraded: true,
    }
  }
}

async function assetList(event) {
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

async function assetCleanup() {
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
      console.warn('[asset] cleanup delete files failed:', err.message || err)
    }
  }

  await db.collection('asset_meta').drop().catch(() => {})

  return { success: true, deletedFileCount: deletedCount, deletedMetaCount: (data || []).length }
}

async function assetRename(event) {
  const assetId = String(event.assetId || '').trim()
  const newName = String(event.name || '').trim()
  if (!assetId || !newName) return { success: false, errMsg: '缺少参数' }

  await ensureCollection('asset_meta')
  const { data } = await db.collection('asset_meta').doc(assetId).get()
  if (!data) return { success: false, errMsg: '素材不存在' }

  await db.collection('asset_meta').doc(assetId).update({
    data: { name: newName, updatedAt: db.serverDate() },
  })
  return { success: true }
}

async function assetDelete(event) {
  const assetId = String(event.assetId || '').trim()
  if (!assetId) return { success: false, errMsg: '缺少参数' }

  await ensureCollection('asset_meta')
  const { data } = await db.collection('asset_meta').doc(assetId).get()
  if (!data) return { success: false, errMsg: '素材不存在' }

  const toDelete = [data.originalFileId, data.previewFileId, data.standardFileId].filter(Boolean)
  if (toDelete.length) {
    try {
      await cloud.deleteFile({ fileList: toDelete })
    } catch (err) {
      console.warn('[asset] delete files failed:', err.message || err)
    }
  }

  await db.collection('asset_meta').doc(assetId).remove()
  return { success: true }
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const operatorOpenid = wxContext.OPENID

  if (!operatorOpenid) return { success: false, errMsg: '无法获取操作者身份' }

  const canManage = await isMerchant(operatorOpenid)
  if (!canManage) return { success: false, errMsg: '无权限操作' }

  try {
    const { action } = event

    if (action === 'processImageUpload') return processImageUpload(event)
    if (action === 'assetList') return assetList(event)
    if (action === 'assetCleanup') return assetCleanup()
    if (action === 'assetRename') return assetRename(event)
    if (action === 'assetDelete') return assetDelete(event)

    return { success: false, errMsg: '未知操作' }
  } catch (err) {
    return { success: false, errMsg: err.message || err.errMsg || '素材服务异常' }
  }
}
