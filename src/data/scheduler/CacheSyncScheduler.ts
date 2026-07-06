import { hasCacheEntry } from '@/utils/cache'
import { getModuleVersion, fetchCacheVersions } from '@/utils/cache/meta'
import { getPublicWikiCached } from '@/modules/wiki'
import { wikiPublicDetailKey } from '../cacheKeys'
import {
  createEmptyManifest,
  readSyncManifest,
  writeSyncManifest,
} from '../syncManifest'
import type { SyncManifest } from '../types'

/** 预加载一张图片到微信缓存中 */
function warmImageCache(url: string) {
  if (!url || !/^https?:\/\//.test(url)) return
  wx.getImageInfo({ src: url }).catch(() => {/* ignore */})
}

const IDLE_START_DELAY_MS = 2000

type BackgroundKind = 'wiki-details' | 'goods-recommend-details'

/**
 * 全局数据同步调度器：P0 抢占、generation 取消、断点 manifest、空闲预取。
 * 单 worker，避免与 loadWithCache 竞态。
 */
class CacheSyncScheduler {
  private generation = 0

  private preemptDepth = 0

  private appInBackground = false

  private idleTimer: ReturnType<typeof setTimeout> | null = null

  private workerRunning = false

  private pendingBackground: BackgroundKind[] = []

  getGeneration() {
    return this.generation
  }

  /** P0：当前页缺数据时抢占后台 */
  async runExclusive<T>(task: () => Promise<T>): Promise<T> {
    this.preemptDepth += 1
    this.generation += 1
    try {
      return await task()
    } finally {
      this.preemptDepth -= 1
      if (this.preemptDepth === 0) {
        this.scheduleIdleWork(IDLE_START_DELAY_MS)
      }
    }
  }

  isBackgroundAllowed() {
    return this.preemptDepth === 0 && !this.appInBackground && !this.workerRunning
  }

  onAppShow() {
    this.appInBackground = false
    this.checkpointRunningManifests()
    this.scheduleIdleWork(IDLE_START_DELAY_MS)
  }

  onAppHide() {
    this.appInBackground = true
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
      this.idleTimer = null
    }
    this.checkpointRunningManifests()
  }

  /** 百科 list 就绪后，排队预取全部 detail */
  scheduleWikiDetailPrefetch(ids: string[]) {
    const unique = [...new Set(ids.filter(Boolean))]
    if (!unique.length) return

    const existing = readSyncManifest('wiki', 'details')
    const manifest = this.mergeDetailManifest(existing, unique)
    writeSyncManifest(manifest)
    this.enqueueBackground('wiki-details')
  }

  /** 首页空闲时预取推荐商品详情（低优） */
  scheduleRecommendGoodsDetailPrefetch(ids: string[]) {
    const unique = [...new Set(ids.filter(Boolean))]
    if (!unique.length) return

    const existing = readSyncManifest('goods', 'details')
    const manifest = this.mergeDetailManifest(existing, unique, 'goods')
    writeSyncManifest(manifest)
    this.enqueueBackground('goods-recommend-details')
  }

  /** 用户 force 刷新时重置模块 manifest */
  resetModuleDetails(module: 'wiki' | 'goods') {
    writeSyncManifest(createEmptyManifest(module, 'details', []))
  }

  private mergeDetailManifest(
    existing: SyncManifest | null,
    ids: string[],
    module: 'wiki' | 'goods' = 'wiki',
  ): SyncManifest {
    const doneSet = new Set(existing?.doneIds ?? [])
    const pending = ids.filter((id) => !doneSet.has(id) && !hasCacheEntry(this.detailKey(module, id)))

    if (!pending.length && (existing?.status === 'complete' || doneSet.size >= ids.length)) {
      return {
        ...(existing ?? createEmptyManifest(module, 'details')),
        module,
        phase: 'details',
        status: 'complete',
        pendingIds: [],
        cursor: 0,
        doneIds: [...doneSet],
      }
    }

    const mergedPending = [...new Set([...(existing?.pendingIds ?? []), ...pending])]
    const cursor = Math.min(existing?.cursor ?? 0, mergedPending.length)

    return {
      module,
      phase: 'details',
      status: mergedPending.length ? 'idle' : 'complete',
      serverVersion: existing?.serverVersion ?? 0,
      generation: this.generation,
      cursor,
      pendingIds: mergedPending,
      doneIds: [...doneSet],
      updatedAt: Date.now(),
    }
  }

  private detailKey(module: 'wiki' | 'goods', id: string) {
    return module === 'wiki' ? wikiPublicDetailKey(id) : `goods:public:detail:${id}`
  }

  /** P0 完成后立即启动 idle worker（拉满模式，不等默认 2s） */
  kickIdleWorkerNow() {
    this.scheduleIdleWork(0)
  }

  private enqueueBackground(kind: BackgroundKind) {
    if (!this.pendingBackground.includes(kind)) {
      this.pendingBackground.push(kind)
    }
    this.scheduleIdleWork(IDLE_START_DELAY_MS)
  }

  private resumePausedManifests() {
    const kinds: Array<['wiki' | 'goods', BackgroundKind]> = [
      ['wiki', 'wiki-details'],
      ['goods', 'goods-recommend-details'],
    ]
    for (const [module, kind] of kinds) {
      const manifest = readSyncManifest(module, 'details')
      if (
        manifest
        && manifest.pendingIds.length
        && manifest.cursor < manifest.pendingIds.length
        && manifest.status !== 'complete'
        && manifest.status !== 'running'
        && !this.pendingBackground.includes(kind)
      ) {
        this.pendingBackground.push(kind)
      }
    }
  }

  private scheduleIdleWork(delayMs: number) {
    if (this.appInBackground || this.preemptDepth > 0) return
    if (this.idleTimer) clearTimeout(this.idleTimer)
    this.idleTimer = setTimeout(() => {
      this.idleTimer = null
      void this.runBackgroundWorker()
    }, delayMs)
  }

  private checkpointRunningManifests() {
    for (const module of ['wiki', 'goods'] as const) {
      const manifest = readSyncManifest(module, 'details')
      if (manifest?.status === 'running') {
        writeSyncManifest({ ...manifest, status: 'paused' })
      }
    }
  }

  private async runBackgroundWorker() {
    if (!this.isBackgroundAllowed()) return

    this.resumePausedManifests()
    if (!this.pendingBackground.length) return

    this.workerRunning = true
    const startGeneration = this.generation

    try {
      while (this.pendingBackground.length && this.preemptDepth === 0 && !this.appInBackground) {
        const kind = this.pendingBackground[0]
        const done = await this.runBackgroundKind(kind, startGeneration)
        if (done) {
          this.pendingBackground.shift()
        } else {
          break
        }
      }
    } finally {
      this.workerRunning = false
      if (
        this.pendingBackground.length
        && this.preemptDepth === 0
        && !this.appInBackground
      ) {
        this.scheduleIdleWork(IDLE_START_DELAY_MS)
      }
    }
  }

  private async runBackgroundKind(kind: BackgroundKind, startGeneration: number): Promise<boolean> {
    if (kind === 'wiki-details') {
      return this.runDetailPrefetch('wiki', startGeneration, (id) =>
        getPublicWikiCached(id),
      )
    }
    return this.runDetailPrefetch('goods', startGeneration, async (id) => {
      const { getPublicGoodsCached } = await import('@/services/goods')
      const result = await getPublicGoodsCached(id)

      // 预取详情页封面图到微信缓存
      const goods = result?.data as { coverImage?: string; coverImageUrl?: string } | undefined
      if (goods?.coverImage || goods?.coverImageUrl) {
        const { isCloudFileId, resolveCloudImageUrl } = await import('@/utils/goodsImage')
        if (goods.coverImageUrl) {
          warmImageCache(goods.coverImageUrl)
        } else if (goods.coverImage && isCloudFileId(goods.coverImage)) {
          resolveCloudImageUrl(goods.coverImage).then((url) => {
            if (url) warmImageCache(url)
          })
        }
      }

      return result
    })
  }

  private async runDetailPrefetch(
    module: 'wiki' | 'goods',
    startGeneration: number,
    fetcher: (id: string) => Promise<unknown>,
  ): Promise<boolean> {
    let manifest = readSyncManifest(module, 'details')
    if (!manifest?.pendingIds.length) {
      if (manifest) {
        writeSyncManifest({ ...manifest, status: 'complete' })
      }
      return true
    }

    try {
      const versions = await fetchCacheVersions()
      manifest = {
        ...manifest,
        serverVersion: getModuleVersion(versions, module),
        status: 'running',
        generation: startGeneration,
      }
      writeSyncManifest(manifest)

      while (manifest.cursor < manifest.pendingIds.length) {
        if (this.generation !== startGeneration || this.preemptDepth > 0 || this.appInBackground) {
          writeSyncManifest({ ...manifest, status: 'paused' })
          return false
        }

        const id = manifest.pendingIds[manifest.cursor]
        const key = this.detailKey(module, id)

        if (!hasCacheEntry(key)) {
          const taskGeneration = this.generation
          await fetcher(id)
          if (this.generation !== taskGeneration) {
            writeSyncManifest({ ...manifest, status: 'paused' })
            return false
          }
        }

        if (!manifest.doneIds.includes(id)) {
          manifest.doneIds.push(id)
        }
        manifest.cursor += 1
        manifest.status = manifest.cursor >= manifest.pendingIds.length ? 'complete' : 'partial'
        writeSyncManifest(manifest)
      }

      writeSyncManifest({ ...manifest, status: 'complete' })
      return true
    } catch (err) {
      console.warn('[scheduler] detail prefetch failed:', module, err)
      if (manifest) {
        writeSyncManifest({ ...manifest, status: 'paused' })
      }
      return false
    }
  }
}

export const cacheSyncScheduler = new CacheSyncScheduler()
