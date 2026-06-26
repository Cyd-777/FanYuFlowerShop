import { listPublicGoodsPage, PUBLIC_GOODS_INDEX_PAGE_SIZE } from '@/services/goods'
import { writeCacheEntry } from '@/utils/cache/storage'
import { fetchCacheVersions, getModuleVersion } from '@/utils/cache/meta'
import { CACHE_KEYS } from '@/data/cacheKeys'
import { appendPublicGoodsIndexPage } from '@/utils/goodsListSnapshot'
import type { Goods } from '@/types/goods'

export { PUBLIC_GOODS_INDEX_PAGE_SIZE }

/**
 * 连续 cursor 拉取全量商品索引（瘦字段 + coverImage），合并去重后写 L1。
 */
export async function fetchAllPublicGoodsIndexPages(
  options?: {
    onPage?: (merged: Goods[], info: { cursor: number; total?: number }) => void
  },
): Promise<Goods[]> {
  let cursor = 0
  let merged: Goods[] = []
  let total: number | undefined

  while (true) {
    const page = await listPublicGoodsPage({ cursor, limit: PUBLIC_GOODS_INDEX_PAGE_SIZE })
    merged = appendPublicGoodsIndexPage(merged, page.list)
    total = page.total ?? total
    options?.onPage?.(merged, { cursor, total })

    if (!page.hasMore || page.nextCursor == null) break
    cursor = page.nextCursor
  }

  if (merged.length) {
    const versions = await fetchCacheVersions(true)
    writeCacheEntry(CACHE_KEYS.goodsPublicAll, {
      data: merged,
      serverVersion: getModuleVersion(versions, 'goods'),
      cachedAt: Date.now(),
    })
  }

  return merged
}

/** 从指定 cursor 起拉剩余页（不含起始页） */
export async function fetchRemainingPublicGoodsIndexPages(
  startCursor: number,
  existing: Goods[],
  onPage?: (merged: Goods[]) => void,
): Promise<Goods[]> {
  let cursor = startCursor
  let merged = existing

  while (cursor != null) {
    const page = await listPublicGoodsPage({ cursor, limit: PUBLIC_GOODS_INDEX_PAGE_SIZE })
    merged = appendPublicGoodsIndexPage(merged, page.list)
    onPage?.(merged)

    if (!page.hasMore || page.nextCursor == null) break
    cursor = page.nextCursor
  }

  return merged
}
