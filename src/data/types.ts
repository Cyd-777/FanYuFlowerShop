import type { CacheModule } from '@/types/cache'

/** 加载优先级：P0 当前页必须；P2 后台预取 */
export type LoadPriority = 'p0' | 'p1' | 'p2' | 'p3'

/** 就绪档位（见 docs/data-loading.md §5.2） */
export type LoadReadiness = 'l1' | 'l2' | 'l3'

export type SyncModule = Extract<CacheModule, 'wiki' | 'goods' | 'categories' | 'flower'>

export type SyncPhase = 'index' | 'details'

export type SyncStatus = 'idle' | 'running' | 'paused' | 'complete' | 'partial'

export interface SyncManifest {
  module: SyncModule
  phase: SyncPhase
  status: SyncStatus
  serverVersion: number
  generation: number
  cursor: number
  pendingIds: string[]
  doneIds: string[]
  updatedAt: number
}

export interface PageEnsureContext {
  force?: boolean
  query: Record<string, string | undefined>
}

export interface EnsureOptions {
  force?: boolean
  onUpdate?: (data: unknown) => void
}
