/** 养护指南三图统一视觉尺寸（rpx） */
export const WIKI_CARE_VISUAL = {
  width: 160,
  height: 160,
  vaseWidth: 64,
  vaseHeight: 96,
  vaseBottom: 12,
  vaseLeft: 48,
  stemWidth: 8,
  stemHeight: 112,
  stemLeft: 76,
  stemBottom: 28,
} as const

function clampWaterRatio(ratio: number): number {
  return Math.min(1, Math.max(0.08, ratio))
}

/** 水位线距 visual 底部的 rpx */
export function wikiCareWaterBottomRpx(ratio: number): number {
  const v = WIKI_CARE_VISUAL
  return v.vaseBottom + Math.round(v.vaseHeight * clampWaterRatio(ratio))
}

/** 水位线相对花瓶内部高度百分比（CSS height/bottom %） */
export function wikiCareWaterLineBottom(ratio: number): string {
  return `${Math.round(clampWaterRatio(ratio) * 100)}%`
}

/** 切口标记距 visual 底部的 rpx（略高于水面） */
export function wikiCareCutBottomRpx(ratio: number, offset = 6): number {
  return wikiCareWaterBottomRpx(ratio) + offset
}
