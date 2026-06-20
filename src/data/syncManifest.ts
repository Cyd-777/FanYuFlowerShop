import type { SyncManifest, SyncModule, SyncPhase } from './types'

const MANIFEST_STORAGE_PREFIX = 'fyfs:sync:manifest:v1:'

function storageKey(module: SyncModule, phase: SyncPhase) {
  return `${MANIFEST_STORAGE_PREFIX}${module}:${phase}`
}

export function createEmptyManifest(
  module: SyncModule,
  phase: SyncPhase,
  pendingIds: string[] = [],
): SyncManifest {
  return {
    module,
    phase,
    status: pendingIds.length ? 'idle' : 'complete',
    serverVersion: 0,
    generation: 0,
    cursor: 0,
    pendingIds,
    doneIds: [],
    updatedAt: Date.now(),
  }
}

export function readSyncManifest(module: SyncModule, phase: SyncPhase): SyncManifest | null {
  try {
    const raw = wx.getStorageSync(storageKey(module, phase))
    if (!raw || typeof raw !== 'object') return null
    return raw as SyncManifest
  } catch {
    return null
  }
}

export function writeSyncManifest(manifest: SyncManifest) {
  try {
    wx.setStorageSync(storageKey(manifest.module, manifest.phase), {
      ...manifest,
      updatedAt: Date.now(),
    })
  } catch (err) {
    console.warn('[syncManifest] write failed:', manifest.module, err)
  }
}

export function clearSyncManifest(module: SyncModule, phase: SyncPhase) {
  try {
    wx.removeStorageSync(storageKey(module, phase))
  } catch {
    // ignore
  }
}
