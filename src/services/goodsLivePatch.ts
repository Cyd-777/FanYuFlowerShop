import type { Goods } from '@/types/goods'
import { getPublicGoods } from '@/services/goods'

export interface PublicGoodsPatchResult {
  patches: Goods[]
  missingIds: string[]
}

/** 批量拉取公开商品详情，用于局部热更新 */
export async function fetchPublicGoodsPatches(ids: string[]): Promise<PublicGoodsPatchResult> {
  const uniqueIds = [...new Set(ids.filter(Boolean))]
  if (!uniqueIds.length) {
    return { patches: [], missingIds: [] }
  }

  const patches: Goods[] = []
  const missingIds: string[] = []

  await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        patches.push(await getPublicGoods(id))
      } catch {
        missingIds.push(id)
      }
    }),
  )

  return { patches, missingIds }
}
