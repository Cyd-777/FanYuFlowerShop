import type { LoadWithCacheResult } from '@/utils/cache/loadWithCache'
import { buildFlowerCatalogFromWiki } from '@/utils/wikiFlowerCatalog'
import { wikiRepository } from './wikiRepository'
import { CACHE_KEYS } from '../cacheKeys'
import { shouldPreemptBackground } from '../readiness'
import { cacheSyncScheduler } from '../scheduler/CacheSyncScheduler'
import type { EnsureOptions } from '../types'
import type { FlowerKindWithVarieties } from '@/types/flower'
import type { FlowerWikiListItem } from '@/types/wiki'

function mapWikiCatalog(list: FlowerWikiListItem[]) {
  return buildFlowerCatalogFromWiki(list)
}

export const flowerRepository = {
  async ensureCatalog(
    options?: EnsureOptions & { onUpdate?: (list: FlowerKindWithVarieties[]) => void },
  ): Promise<LoadWithCacheResult<FlowerKindWithVarieties[]>> {
    const run = async () => {
      const result = await wikiRepository.ensurePublicList({
        force: options?.force,
        onUpdate: options?.onUpdate
          ? (wikiList) => options.onUpdate?.(mapWikiCatalog(wikiList))
          : undefined,
      })
      return {
        ...result,
        data: mapWikiCatalog(result.data),
      }
    }

    if (shouldPreemptBackground(CACHE_KEYS.wikiList, options?.force)) {
      return cacheSyncScheduler.runExclusive(run)
    }
    return run()
  },
}
