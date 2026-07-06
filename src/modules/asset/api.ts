/**
 * 素材管理模块 · 公开 API
 * @see docs/素材管理模块-API.md
 */

export type { AssetItem } from './client'

export {
  cleanupAllAssets,
  deleteAsset,
  fetchAssetList,
  renameAsset,
  uploadAndProcessImage,
} from './client'
