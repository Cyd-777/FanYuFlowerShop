import type { LoadWithCacheResult } from '@/utils/cache/loadWithCache'
import { listPublicCategoriesCached } from '@/services/category'
import { shouldPreemptBackground } from '../readiness'
import { CACHE_KEYS } from '../cacheKeys'
import { cacheSyncScheduler } from '../scheduler/CacheSyncScheduler'
import type { EnsureOptions } from '../types'
import type { Category } from '@/types/category'

export const categoriesRepository = {
  async ensurePublicList(
    options?: EnsureOptions & { onUpdate?: (list: Category[]) => void },
  ): Promise<LoadWithCacheResult<Category[]>> {
    const run = () =>
      listPublicCategoriesCached({
        force: options?.force,
        onUpdate: options?.onUpdate,
      })

    if (shouldPreemptBackground(CACHE_KEYS.categoriesPublic, options?.force)) {
      return cacheSyncScheduler.runExclusive(run)
    }
    return run()
  },
}
