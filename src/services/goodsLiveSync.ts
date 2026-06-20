import type { Goods } from '@/types/goods'
import { fetchCacheVersions, getModuleVersion, peekCacheVersions } from '@/utils/cache/meta'
import { fetchPublicGoodsPatches } from '@/services/goodsLivePatch'

const POLL_INTERVAL_MS = 20_000

export interface GoodsLiveSyncRegistration {
  /** 需要 patch 的商品 id；返回空数组时跳过 patch */
  getTargetIds: () => string[]
  /** 将补丁合并进当前列表（含图片 attach 由调用方处理） */
  applyPatches: (result: { patches: Goods[]; missingIds: string[] }) => void | Promise<void>
  /** 整表刷新（推荐位等结构可能变化的场景） */
  refreshScope?: () => void | Promise<void>
  /** true 时版本变化只走 refreshScope，不走 patch */
  preferFullRefresh?: boolean
}

interface RegistrationEntry extends GoodsLiveSyncRegistration {
  id: number
}

let nextId = 1
let timer: ReturnType<typeof setInterval> | null = null
let ticking = false
let knownGoodsVersion: number | null = null
const registrations = new Map<number, RegistrationEntry>()

function readKnownGoodsVersion() {
  const peek = peekCacheVersions()
  if (peek) {
    knownGoodsVersion = getModuleVersion(peek, 'goods')
  }
}

async function runRegistration(entry: RegistrationEntry) {
  if (entry.preferFullRefresh && entry.refreshScope) {
    await entry.refreshScope()
    return
  }

  const ids = entry.getTargetIds().filter(Boolean)
  if (!ids.length) return

  const result = await fetchPublicGoodsPatches(ids)
  await entry.applyPatches(result)
}

async function tick() {
  if (ticking || !registrations.size) return

  ticking = true
  try {
    const versions = await fetchCacheVersions(true)
    const remoteVersion = getModuleVersion(versions, 'goods')

    if (knownGoodsVersion == null) {
      knownGoodsVersion = remoteVersion
      return
    }

    if (remoteVersion === knownGoodsVersion) return

    knownGoodsVersion = remoteVersion

    for (const entry of registrations.values()) {
      try {
        await runRegistration(entry)
      } catch (err) {
        console.warn('[goodsLiveSync] registration failed:', entry.id, err)
      }
    }
  } catch (err) {
    console.warn('[goodsLiveSync] tick failed:', err)
  } finally {
    ticking = false
  }
}

function ensureTimer() {
  if (timer) return
  readKnownGoodsVersion()
  timer = setInterval(() => {
    void tick()
  }, POLL_INTERVAL_MS)
}

function clearTimerIfIdle() {
  if (registrations.size || !timer) return
  clearInterval(timer)
  timer = null
}

export const goodsLiveSync = {
  register(options: GoodsLiveSyncRegistration) {
    const id = nextId++
    registrations.set(id, { id, ...options })
    ensureTimer()
    return id
  },

  unregister(id: number) {
    registrations.delete(id)
    clearTimerIfIdle()
  },

  /** 手动重置版本基线（如强制刷新后） */
  resetVersionBaseline() {
    readKnownGoodsVersion()
  },
}
