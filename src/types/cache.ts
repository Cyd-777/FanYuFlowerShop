export type CacheModule = 'categories' | 'goods' | 'wiki' | 'flower' | 'shop'

export interface CacheEntry<T> {
  data: T
  serverVersion: number
  cachedAt: number
}

export type CacheVersions = Record<CacheModule, number>
