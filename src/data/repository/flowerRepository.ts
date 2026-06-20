import type { LoadWithCacheResult } from '@/utils/cache/loadWithCache'
import { listFlowerCatalogCached } from '@/services/flower'
import { CACHE_KEYS } from '../cacheKeys'
import { shouldPreemptBackground } from '../readiness'
import { cacheSyncScheduler } from '../scheduler/CacheSyncScheduler'
import type { EnsureOptions } from '../types'
import type { FlowerKindWithVarieties } from '@/types/flower'

export const flowerRepository = {
  async ensureCatalog(
    options?: EnsureOptions & { onUpdate?: (list: FlowerKindWithVarieties[]) => void },
  ): Promise<LoadWithCacheResult<FlowerKindWithVarieties[]>> {
    const run = () =>
      listFlowerCatalogCached({
        force: options?.force,
        onUpdate: options?.onUpdate,
      })

    if (shouldPreemptBackground(CACHE_KEYS.flowerCatalog, options?.force)) {
      return cacheSyncScheduler.runExclusive(run)
    }
    return run()
  },
}
