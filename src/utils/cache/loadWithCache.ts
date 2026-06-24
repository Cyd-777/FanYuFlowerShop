import type { CacheModule } from '@/types/cache'
import { MODULE_TTL_MS, moduleKeyPrefix } from './constants'
import { fetchCacheVersions, getModuleVersion } from './meta'
import { readCacheEntry, removeCacheByPrefix, writeCacheEntry } from './storage'

export interface LoadWithCacheOptions<T> {
  module: CacheModule
  /** 模块内唯一键，如 goods:public:all */
  cacheKey: string
  fetcher: () => Promise<T>
  /** 下拉刷新等场景强制拉云端 */
  force?: boolean
  ttlMs?: number
  /** 后台更新完成后回调（用于 SWR 静默刷新 UI） */
  onUpdate?: (data: T) => void
}

export interface LoadWithCacheResult<T> {
  data: T
  fromCache: boolean
}

function isTtlExpired(cachedAt: number, ttlMs: number) {
  return Date.now() - cachedAt > ttlMs
}

async function fetchAndStore<T>(
  module: CacheModule,
  cacheKey: string,
  fetcher: () => Promise<T>,
  forceMeta = false,
): Promise<T> {
  const versions = await fetchCacheVersions(forceMeta)
  const data = await fetcher()
  writeCacheEntry(cacheKey, {
    data,
    serverVersion: getModuleVersion(versions, module),
    cachedAt: Date.now(),
  })
  return data
}

async function revalidateInBackground<T>(
  module: CacheModule,
  cacheKey: string,
  fetcher: () => Promise<T>,
  entry: { serverVersion: number; cachedAt: number },
  ttlMs: number,
  onUpdate?: (data: T) => void,
) {
  try {
    const versions = await fetchCacheVersions(true)
    const remoteVersion = getModuleVersion(versions, module)
    const versionChanged = entry.serverVersion !== remoteVersion
    const ttlExpired = isTtlExpired(entry.cachedAt, ttlMs)

    if (!versionChanged && !ttlExpired) return

    const data = await fetcher()
    writeCacheEntry(cacheKey, {
      data,
      serverVersion: remoteVersion,
      cachedAt: Date.now(),
    })
    onUpdate?.(data)
  } catch (err) {
    console.warn('[cache] background revalidate failed:', cacheKey, err)
  }
}

/**
 * Stale-While-Revalidate：
 * - 有缓存：立即返回缓存，后台比对版本号 / TTL，有变再拉取
 * - 无缓存或 force：等待云端后返回
 */
export async function loadWithCache<T>(
  options: LoadWithCacheOptions<T>,
): Promise<LoadWithCacheResult<T>> {
  const {
    module,
    cacheKey,
    fetcher,
    force = false,
    ttlMs = MODULE_TTL_MS[module],
    onUpdate,
  } = options

  const cached = force ? null : readCacheEntry<T>(cacheKey)

  if (cached) {
    void revalidateInBackground(module, cacheKey, fetcher, cached, ttlMs, onUpdate)
    return { data: cached.data, fromCache: true }
  }

  const data = await fetchAndStore(module, cacheKey, fetcher, force)
  return { data, fromCache: false }
}

export function invalidateCacheModule(module: CacheModule) {
  removeCacheByPrefix(moduleKeyPrefix(module))
}
