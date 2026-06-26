export const ASSET_PICK_KEY = 'merchant_asset_pick_ctx'

export interface AssetPickContext {
  /** 所选素材的三个 fileID */
  originalFileId: string
  previewFileId: string
  standardFileId: string
  consumed?: boolean
}

export function readAssetPick(): AssetPickContext | null {
  const raw = wx.getStorageSync(ASSET_PICK_KEY) as AssetPickContext | ''
  if (!raw || typeof raw !== 'object') return null
  return {
    originalFileId: String(raw.originalFileId || ''),
    previewFileId: String(raw.previewFileId || ''),
    standardFileId: String(raw.standardFileId || ''),
    consumed: raw.consumed === true,
  }
}

export function writeAssetPick(ctx: AssetPickContext) {
  wx.setStorageSync(ASSET_PICK_KEY, ctx)
}

export function markAssetPickConsumed() {
  const ctx = readAssetPick()
  if (!ctx) return
  writeAssetPick({ ...ctx, consumed: true })
}
