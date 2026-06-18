import type { CacheModule } from '@/types/cache'

export const CACHE_STORAGE_PREFIX = 'fyfs:cache:v1:'

/** 模块级 TTL 兜底（毫秒），版本号一致时仍可后台刷新 */
export const MODULE_TTL_MS: Record<CacheModule, number> = {
  categories: 24 * 60 * 60 * 1000,
  goods: 10 * 60 * 1000,
  wiki: 24 * 60 * 60 * 1000,
  flower: 24 * 60 * 60 * 1000,
  shop: 24 * 60 * 60 * 1000,
}

/** 云端版本号内存缓存，避免每次进页都打 meta */
export const META_THROTTLE_MS = 60 * 1000

export function moduleKeyPrefix(module: CacheModule): string {
  return `${module}:`
}
