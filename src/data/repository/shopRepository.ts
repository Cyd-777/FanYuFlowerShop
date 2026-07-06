import { fetchShopSettingsCached } from '@/modules/shop'
import { shouldPreemptBackground } from '../readiness'
import { CACHE_KEYS } from '../cacheKeys'
import { cacheSyncScheduler } from '../scheduler/CacheSyncScheduler'
import type { EnsureOptions } from '../types'
import type { ShopSettings } from '@/types/shop'
import type { LoadWithCacheResult } from '@/utils/cache/loadWithCache'

export const shopRepository = {
  async ensureSettings(
    options?: EnsureOptions & { onUpdate?: (settings: ShopSettings) => void },
  ): Promise<LoadWithCacheResult<ShopSettings>> {
    const run = () =>
      fetchShopSettingsCached({
        force: options?.force,
        onUpdate: options?.onUpdate,
      })

    if (shouldPreemptBackground(CACHE_KEYS.shopSettings, options?.force)) {
      return cacheSyncScheduler.runExclusive(run)
    }
    return run()
  },
}
