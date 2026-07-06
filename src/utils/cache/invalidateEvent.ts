import { CACHE_INVALIDATION_MATRIX } from '@/data/cacheInvalidationMatrix'
import { invalidateCacheModule } from './loadWithCache'

export type CacheInvalidationEventKey = keyof typeof CACHE_INVALIDATION_MATRIX

/** 按云端 INVALIDATION_MATRIX 事件批量失效客户端缓存模块 */
export function invalidateCacheEvent(eventKey: CacheInvalidationEventKey) {
  const entry = CACHE_INVALIDATION_MATRIX[eventKey]
  if (!entry?.modules?.length) return
  for (const module of entry.modules) {
    invalidateCacheModule(module)
  }
}
