import { getCloud, getCloudCallConfig, parseCloudResult } from '@/services/cloud'
import { showToast } from '@/utils/feedback'
import { assertLocalImageWithinLimit } from '@/utils/uploadImageLimit'

export interface AssetItem {
  _id: string
  name: string
  type: string
  originalFileId: string
  previewFileId: string
  standardFileId: string
  previewUrl: string
  standardUrl: string
  createdAt?: unknown
}

interface ProcessImageUploadResult {
  success: boolean
  previewFileId: string
  standardFileId: string
  originalFileId: string
  degraded?: boolean
}

interface AssetListResult {
  success: boolean
  list: AssetItem[]
}

export async function uploadAndProcessImage(
  localPath: string,
  name: string,
  type = 'goods',
): Promise<{
  originalFileId: string
  previewFileId: string
  standardFileId: string
}> {
  await assertLocalImageWithinLimit(localPath)

  const ext = (localPath.match(/\.(\w+)(?:\?|$)/)?.[1] || 'jpg').replace(/[^a-zA-Z0-9]/, '')
  const cloudPath = `assets/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { fileID: originalFileId } = await getCloud().uploadFile({
    cloudPath,
    filePath: localPath,
  })

  const res = await getCloud().callFunction({
    name: 'goods',
    data: { action: 'processImageUpload', fileId: originalFileId, name, type },
    ...(getCloudCallConfig() ? { config: getCloudCallConfig() } : {}),
  })

  const result = parseCloudResult<ProcessImageUploadResult>(res.result)
  if (!result.success) {
    throw new Error(result.err_msg || '图片处理失败')
  }

  if (result.degraded) {
    showToast({ title: '图片处理降级', icon: 'none' })
  }

  return {
    originalFileId: result.originalFileId,
    previewFileId: result.previewFileId,
    standardFileId: result.standardFileId,
  }
}

export async function fetchAssetList(type?: string): Promise<AssetItem[]> {
  const data: Record<string, string> = { action: 'assetList' }
  if (type) data.type = type

  const res = await getCloud().callFunction({
    name: 'goods',
    data,
    ...(getCloudCallConfig() ? { config: getCloudCallConfig() } : {}),
  })

  const result = parseCloudResult<AssetListResult>(res.result)
  if (!result.success) {
    throw new Error(result.err_msg || '获取素材列表失败')
  }

  return result.list || []
}

export async function renameAsset(assetId: string, name: string): Promise<void> {
  const res = await getCloud().callFunction({
    name: 'goods',
    data: { action: 'assetRename', assetId, name },
    ...(getCloudCallConfig() ? { config: getCloudCallConfig() } : {}),
  })

  const result = parseCloudResult<{ success: boolean }>(res.result)
  if (!result.success) {
    throw new Error(result.err_msg || '重命名失败')
  }
}

export async function deleteAsset(assetId: string): Promise<void> {
  const res = await getCloud().callFunction({
    name: 'goods',
    data: { action: 'assetDelete', assetId },
    ...(getCloudCallConfig() ? { config: getCloudCallConfig() } : {}),
  })

  const result = parseCloudResult<{ success: boolean }>(res.result)
  if (!result.success) {
    throw new Error(result.err_msg || '删除失败')
  }
}

export async function cleanupAllAssets(): Promise<{ deletedFileCount: number; deletedMetaCount: number }> {
  const res = await getCloud().callFunction({
    name: 'goods',
    data: { action: 'assetCleanup' },
    ...(getCloudCallConfig() ? { config: getCloudCallConfig() } : {}),
  })

  const result = parseCloudResult<{ success: boolean; deletedFileCount: number; deletedMetaCount: number }>(res.result)
  if (!result.success) {
    throw new Error(result.err_msg || '清理失败')
  }

  return {
    deletedFileCount: result.deletedFileCount || 0,
    deletedMetaCount: result.deletedMetaCount || 0,
  }
}
