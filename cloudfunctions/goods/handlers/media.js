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

async function processImageUpload(event, ctx) {
  const { operatorOpenid } = ctx
  if (!operatorOpenid) {
    return { success: false, errMsg: '无法获取操作者身份' }
  }
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

async function assetList(event, ctx) {
  const { operatorOpenid } = ctx
  if (!operatorOpenid) {
    return { success: false, errMsg: '无法获取操作者身份' }
  }
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

async function assetCleanup(event, ctx) {
  const { operatorOpenid } = ctx
  if (!operatorOpenid) {
    return { success: false, errMsg: '无法获取操作者身份' }
  }
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

async function assetRename(event, ctx) {
  const { operatorOpenid } = ctx
  if (!operatorOpenid) {
    return { success: false, errMsg: '无法获取操作者身份' }
  }
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

async function assetDelete(event, ctx) {
  const { operatorOpenid } = ctx
  if (!operatorOpenid) {
    return { success: false, errMsg: '无法获取操作者身份' }
  }
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

module.exports = {
  processImageUpload,
  assetList,
  assetCleanup,
  assetRename,
  assetDelete,
}
