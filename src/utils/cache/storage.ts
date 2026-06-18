import type { CacheEntry } from '@/types/cache'
import { CACHE_STORAGE_PREFIX } from './constants'

function fullKey(key: string) {
  return `${CACHE_STORAGE_PREFIX}${key}`
}

export function readCacheEntry<T>(key: string): CacheEntry<T> | null {
  try {
    const raw = wx.getStorageSync(fullKey(key))
    if (!raw || typeof raw !== 'object' || !('data' in raw)) return null
    return raw as CacheEntry<T>
  } catch {
    return null
  }
}

export function writeCacheEntry<T>(key: string, entry: CacheEntry<T>) {
  try {
    wx.setStorageSync(fullKey(key), entry)
  } catch (err) {
    console.warn('[cache] write failed:', key, err)
  }
}

export function removeCacheEntry(key: string) {
  try {
    wx.removeStorageSync(fullKey(key))
  } catch {
    // ignore
  }
}

export function removeCacheByPrefix(prefix: string) {
  try {
    const { keys } = wx.getStorageInfoSync()
    const fullPrefix = fullKey(prefix)
    for (const storageKey of keys) {
      if (storageKey.startsWith(fullPrefix)) {
        wx.removeStorageSync(storageKey)
      }
    }
  } catch (err) {
    console.warn('[cache] clear prefix failed:', prefix, err)
  }
}

export function hasCacheEntry(key: string) {
  return !!readCacheEntry(key)
}
