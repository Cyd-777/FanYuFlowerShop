import type { LoadWithCacheResult } from '@/utils/cache/loadWithCache'
import {
  listPublicGoodsCached,
  listPublicRecommendGoodsCached,
  getPublicGoodsCached,
  PUBLIC_RECOMMEND_CACHE_KEY,
} from '@/services/goods'
import { shouldPreemptBackground } from '../readiness'
import { CACHE_KEYS, goodsPublicDetailKey } from '../cacheKeys'
import { cacheSyncScheduler } from '../scheduler/CacheSyncScheduler'
import type { EnsureOptions } from '../types'
import type { Goods } from '@/types/goods'

export const goodsRepository = {
  async ensureRecommendList(
    options?: EnsureOptions & { onUpdate?: (list: Goods[]) => void },
  ): Promise<LoadWithCacheResult<Goods[]>> {
    const run = () =>
      listPublicRecommendGoodsCached({
        force: options?.force,
        onUpdate: options?.onUpdate,
      })

    if (shouldPreemptBackground(PUBLIC_RECOMMEND_CACHE_KEY, options?.force)) {
      return cacheSyncScheduler.runExclusive(run)
    }
    return run()
  },

  async ensurePublicList(
    options?: EnsureOptions & { onUpdate?: (list: Goods[]) => void },
  ): Promise<LoadWithCacheResult<Goods[]>> {
    const run = () =>
      listPublicGoodsCached({
        force: options?.force,
        onUpdate: options?.onUpdate,
      })

    if (shouldPreemptBackground(CACHE_KEYS.goodsPublicAll, options?.force)) {
      return cacheSyncScheduler.runExclusive(run)
    }
    return run()
  },

  async ensurePublicDetail(
    id: string,
    options?: EnsureOptions & { onUpdate?: (goods: Goods) => void },
  ): Promise<LoadWithCacheResult<Goods>> {
    const cacheKey = goodsPublicDetailKey(id)
    const run = () =>
      getPublicGoodsCached(id, {
        force: options?.force,
        onUpdate: options?.onUpdate,
      })

    if (shouldPreemptBackground(cacheKey, options?.force)) {
      return cacheSyncScheduler.runExclusive(run)
    }
    return run()
  },

  scheduleRecommendDetailPrefetch(goodsIds: string[]) {
    cacheSyncScheduler.scheduleRecommendGoodsDetailPrefetch(goodsIds)
  },
}
