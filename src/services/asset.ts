import { getCloud, getCloudCallConfig, parseCloudResult } from './cloud'
import { showToast } from '@/utils/feedback'

export interface AssetItem {
  _id: string
  name: string
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

/**
 * 上传本地图片到云存储并触发多分辨率处理。
 * 返回 { originalFileId, previewFileId, standardFileId }。
 */
export async function uploadAndProcessImage(
  localPath: string,
  name: string,
): Promise<{
  originalFileId: string
  previewFileId: string
  standardFileId: string
}> {
  const ext = (localPath.match(/\.(\w+)(?:\?|$)/)?.[1] || 'jpg').replace(/[^a-zA-Z0-9]/, '')
  const cloudPath = `assets/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { fileID: originalFileId } = await getCloud().uploadFile({
    cloudPath,
    filePath: localPath,
  })

  const res = await getCloud().callFunction({
    name: 'goods',
    data: { action: 'processImageUpload', fileId: originalFileId, name },
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

/** 获取素材列表（含已换链的显示 URL） */
export async function fetchAssetList(): Promise<AssetItem[]> {
  const res = await getCloud().callFunction({
    name: 'goods',
    data: { action: 'assetList' },
    ...(getCloudCallConfig() ? { config: getCloudCallConfig() } : {}),
  })

  const result = parseCloudResult<AssetListResult>(res.result)
  if (!result.success) {
    throw new Error(result.err_msg || '获取素材列表失败')
  }

  return result.list || []
}

/** 重命名素材 */
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

/** 删除素材（云端三份文件 + 元数据） */
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
