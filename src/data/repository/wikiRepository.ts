import type { WikiQuery, WikiSearchResult } from '@/types/search'
import type { LoadWithCacheResult } from '@/utils/cache/loadWithCache'
import {
  listPublicWiki,
  listPublicWikiCached,
  searchPublicWiki,
  getPublicWikiCached,
  matchPublicWikiCached,
} from '@/services/wiki'
import { shouldPreemptBackground } from '../readiness'
import { CACHE_KEYS, wikiPublicDetailKey, wikiPublicMatchKey } from '../cacheKeys'
import { cacheSyncScheduler } from '../scheduler/CacheSyncScheduler'
import type { EnsureOptions } from '../types'
import type { FlowerWiki, FlowerWikiListItem } from '@/types/wiki'

export const wikiRepository = {
  async ensurePublicList(
    options?: EnsureOptions & { onUpdate?: (list: FlowerWikiListItem[]) => void },
  ): Promise<LoadWithCacheResult<FlowerWikiListItem[]>> {
    const run = () =>
      listPublicWikiCached({
        force: options?.force,
        onUpdate: options?.onUpdate,
      })

    if (shouldPreemptBackground(CACHE_KEYS.wikiList, options?.force)) {
      return cacheSyncScheduler.runExclusive(run)
    }
    return run()
  },

  /** 搜索不走缓存，始终抢占后台 */
  async searchPublicList(keyword: string): Promise<FlowerWikiListItem[]> {
    return cacheSyncScheduler.runExclusive(() => listPublicWiki(keyword))
  },

  async search(query: WikiQuery): Promise<WikiSearchResult> {
    return cacheSyncScheduler.runExclusive(() => searchPublicWiki(query))
  },

  async ensureDetail(
    id: string,
    options?: EnsureOptions & { onUpdate?: (wiki: FlowerWiki) => void },
  ): Promise<LoadWithCacheResult<FlowerWiki>> {
    const cacheKey = wikiPublicDetailKey(id)
    const run = () =>
      getPublicWikiCached(id, {
        force: options?.force,
        onUpdate: options?.onUpdate,
      })

    if (shouldPreemptBackground(cacheKey, options?.force)) {
      return cacheSyncScheduler.runExclusive(run)
    }
    return run()
  },

  async ensureMatch(
    kindId: string,
    varietyId: string,
    options?: EnsureOptions & { onUpdate?: (wiki: FlowerWiki | null) => void },
  ): Promise<LoadWithCacheResult<FlowerWiki | null>> {
    const cacheKey = wikiPublicMatchKey(kindId, varietyId)
    const run = () =>
      matchPublicWikiCached(kindId, varietyId, {
        force: options?.force,
        onUpdate: options?.onUpdate,
      })

    if (shouldPreemptBackground(cacheKey, options?.force)) {
      return cacheSyncScheduler.runExclusive(run)
    }
    return run()
  },

  afterListLoaded(list: FlowerWikiListItem[]) {
    cacheSyncScheduler.scheduleWikiDetailPrefetch(list.map((item) => item._id))
  },

  resetDetailPrefetch() {
    cacheSyncScheduler.resetModuleDetails('wiki')
  },
}
