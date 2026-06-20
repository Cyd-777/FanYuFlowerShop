import type { LoadWithCacheResult } from '@/utils/cache/loadWithCache'
import {
  listMerchantGoodsCached,
  MERCHANT_GOODS_LIST_CACHE_KEY,
} from '@/services/goods'
import { shouldPreemptBackground } from '../readiness'
import { cacheSyncScheduler } from '../scheduler/CacheSyncScheduler'
import type { EnsureOptions } from '../types'
import type { Goods } from '@/types/goods'

export const merchantGoodsRepository = {
  async ensureList(
    options?: EnsureOptions & { onUpdate?: (list: Goods[]) => void },
  ): Promise<LoadWithCacheResult<Goods[]>> {
    const run = () =>
      listMerchantGoodsCached({
        force: options?.force,
        onUpdate: options?.onUpdate,
      })

    if (shouldPreemptBackground(MERCHANT_GOODS_LIST_CACHE_KEY, options?.force)) {
      return cacheSyncScheduler.runExclusive(run)
    }
    return run()
  },
}
