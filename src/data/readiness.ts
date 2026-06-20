import type { CacheModule } from '@/types/cache'
import { hasCacheEntry, readCacheEntry } from '@/utils/cache'
import { fetchCacheVersions, getModuleVersion } from '@/utils/cache/meta'
import type { LoadReadiness } from './types'

/** 无缓存 → L2；有缓存 → L1（版本校验异步进行） */
export function getCacheReadiness(cacheKey: string): LoadReadiness {
  return hasCacheEntry(cacheKey) ? 'l1' : 'l2'
}

/** 有缓存且与当前 meta 版本一致 → L3 */
export async function getCacheReadinessWithVersion(
  cacheKey: string,
  module: CacheModule,
): Promise<LoadReadiness> {
  const entry = readCacheEntry<unknown>(cacheKey)
  if (!entry) return 'l2'

  try {
    const versions = await fetchCacheVersions()
    if (entry.serverVersion === getModuleVersion(versions, module)) {
      return 'l3'
    }
  } catch {
    // 版本拉取失败时仍可按 L1 展示
  }
  return 'l1'
}

/** L2 或 force 时需要抢占后台队列 */
export function shouldPreemptBackground(cacheKey: string, force?: boolean): boolean {
  if (force) return true
  return !hasCacheEntry(cacheKey)
}
