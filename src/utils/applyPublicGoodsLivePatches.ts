import type { Goods } from '@/types/goods'
import { attachGoodsCoverImages } from '@/utils/goodsImage'
import { filterChangedGoodsPatches } from '@/utils/goodsLiveMerge'
import { mergeGoodsListById } from '@/utils/goodsListSnapshot'
import type { PublicGoodsPatchResult } from '@/services/goodsLivePatch'

type GoodsCard = Goods & { imageUrl?: string; discountPrice?: number }

/**
 * 将云端 patch 合并进列表：无 meta 版本差异时不应调用；有差异时也仅更新变了的卡片/字段。
 */
export async function applyPublicGoodsLivePatches<T extends GoodsCard>(
  current: T[],
  result: PublicGoodsPatchResult,
): Promise<T[]> {
  if (!current.length && !result.patches.length && !result.missingIds.length) {
    return current
  }

  const changedRemotes = filterChangedGoodsPatches(current, result.patches)
  if (!changedRemotes.length && !result.missingIds.length) {
    return current
  }

  const withImages = changedRemotes.length
    ? await attachGoodsCoverImages(changedRemotes, current)
    : []

  return mergeGoodsListById(current, withImages, { missingIds: result.missingIds })
}
