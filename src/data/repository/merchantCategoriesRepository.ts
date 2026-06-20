import type { LoadWithCacheResult } from '@/utils/cache/loadWithCache'
import { listMerchantCategoriesCached } from '@/services/category'
import { CACHE_KEYS } from '../cacheKeys'
import { shouldPreemptBackground } from '../readiness'
import { cacheSyncScheduler } from '../scheduler/CacheSyncScheduler'
import type { EnsureOptions } from '../types'
import type { Category } from '@/types/category'

export const merchantCategoriesRepository = {
  async ensureList(
    options?: EnsureOptions & { onUpdate?: (list: Category[]) => void },
  ): Promise<LoadWithCacheResult<Category[]>> {
    const run = () =>
      listMerchantCategoriesCached({
        force: options?.force,
        onUpdate: options?.onUpdate,
      })

    if (shouldPreemptBackground(CACHE_KEYS.categoriesMerchant, options?.force)) {
      return cacheSyncScheduler.runExclusive(run)
    }
    return run()
  },
}
