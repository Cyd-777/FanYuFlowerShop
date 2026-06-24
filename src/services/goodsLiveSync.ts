import type { Goods } from '@/types/goods'
import { fetchCacheVersions, getModuleVersion } from '@/utils/cache/meta'
import { fetchPublicGoodsPatches } from '@/services/goodsLivePatch'

/** 页面可见后首次轮询延迟 */
const FIRST_POLL_MS = 5_000

/** 定时轮询间隔（与手势触发互补，填补空档） */
export const POLL_INTERVAL_MS = 20_000

export interface GoodsLiveSyncRegistration {
  /** 当前屏上需要 patch 的商品 id */
  getTargetIds: () => string[]
  /** 将补丁合并进当前列表（含图片 attach 由调用方处理） */
  applyPatches: (result: { patches: Goods[]; missingIds: string[] }) => void | Promise<void>
  /** 推荐位增删等结构变化时的静默全量刷新（可选，仅 meta 版本变化时调用） */
  refreshScope?: () => void | Promise<void>
}

export interface GoodsLiveSyncTriggerOptions {
  source?: 'poll' | 'gesture' | 'manual'
}

interface RegistrationEntry extends GoodsLiveSyncRegistration {
  id: number
}

let nextId = 1
let timer: ReturnType<typeof setInterval> | null = null
let firstPollTimer: ReturnType<typeof setTimeout> | null = null
let ticking = false
let knownGoodsVersion: number | null = null
const registrations = new Map<number, RegistrationEntry>()

async function syncKnownGoodsVersion() {
  const versions = await fetchCacheVersions(true)
  knownGoodsVersion = getModuleVersion(versions, 'goods')
}

async function runRegistration(entry: RegistrationEntry) {
  const ids = entry.getTargetIds().filter(Boolean)
  if (!ids.length) return

  const result = await fetchPublicGoodsPatches(ids)
  await entry.applyPatches(result)
}

async function runAllRegistrations() {
  for (const entry of registrations.values()) {
    try {
      await runRegistration(entry)
    } catch (err) {
      console.warn('[goodsLiveSync] registration failed:', entry.id, err)
    }
  }
}

async function runScopeRefreshes() {
  for (const entry of registrations.values()) {
    if (!entry.refreshScope) continue
    try {
      await entry.refreshScope()
    } catch (err) {
      console.warn('[goodsLiveSync] refreshScope failed:', entry.id, err)
    }
  }
}

function scheduleFirstPoll() {
  if (firstPollTimer) return
  firstPollTimer = setTimeout(() => {
    firstPollTimer = null
    void goodsLiveSync.triggerSync({ source: 'poll' })
  }, FIRST_POLL_MS)
}

function ensurePollTimer() {
  if (timer) return
  void syncKnownGoodsVersion()
  scheduleFirstPoll()
  timer = setInterval(() => {
    void goodsLiveSync.triggerSync({ source: 'poll' })
  }, POLL_INTERVAL_MS)
}

function clearPollTimerIfIdle() {
  if (registrations.size) return
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  if (firstPollTimer) {
    clearTimeout(firstPollTimer)
    firstPollTimer = null
  }
}

/**
 * 顾客端商品局部热更新：
 * - 仅当 meta.goods 版本与本地基线不一致时，才对齐一次
 * - 轮询（20s）与浏览手势共用同一套版本判断；手势不 force 全量 patch
 * - 具体卡片只更新有差异的字段（见 applyPublicGoodsLivePatches）
 */
export const goodsLiveSync = {
  register(options: GoodsLiveSyncRegistration) {
    const id = nextId++
    registrations.set(id, { id, ...options })
    ensurePollTimer()
    return id
  },

  unregister(id: number) {
    registrations.delete(id)
    clearPollTimerIfIdle()
  },

  async resetVersionBaseline() {
    await syncKnownGoodsVersion()
  },

  async triggerSync(options: GoodsLiveSyncTriggerOptions = {}) {
    if (ticking || !registrations.size) return

    ticking = true
    try {
      const versions = await fetchCacheVersions(true)
      const remoteVersion = getModuleVersion(versions, 'goods')

      if (knownGoodsVersion == null) {
        knownGoodsVersion = remoteVersion
        return
      }

      if (remoteVersion === knownGoodsVersion) {
        return
      }

      console.info(
        `[goodsLiveSync] ${options.source || 'manual'} goods version ${knownGoodsVersion} → ${remoteVersion}`,
      )
      knownGoodsVersion = remoteVersion

      await runAllRegistrations()
      await runScopeRefreshes()
    } catch (err) {
      console.warn('[goodsLiveSync] trigger failed:', err)
    } finally {
      ticking = false
    }
  },
}
