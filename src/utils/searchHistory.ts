import { STORAGE_KEYS } from '@/utils/constants'

/** 搜索历史分区（不同搜索框互不混用） */
export type SearchHistoryProfile = 'customer-unified' | 'wiki' | 'merchant-goods'

const MAX_ITEMS = 10

const KEY_BY_PROFILE: Record<SearchHistoryProfile, string> = {
  'customer-unified': STORAGE_KEYS.SearchHistoryCustomerUnified,
  wiki: STORAGE_KEYS.SearchHistoryWiki,
  'merchant-goods': STORAGE_KEYS.SearchHistoryMerchantGoods,
}

function normalizeList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const list: string[] = []
  for (const item of raw) {
    const text = String(item).trim()
    if (!text) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    list.push(text)
    if (list.length >= MAX_ITEMS) break
  }
  return list
}

export function readSearchHistory(profile: SearchHistoryProfile): string[] {
  try {
    return normalizeList(wx.getStorageSync(KEY_BY_PROFILE[profile]))
  } catch {
    return []
  }
}

export function pushSearchHistory(profile: SearchHistoryProfile, keyword: string): string[] {
  const text = keyword.trim()
  if (!text) return readSearchHistory(profile)
  const lower = text.toLowerCase()
  const prev = readSearchHistory(profile).filter((item) => item.toLowerCase() !== lower)
  const next = [text, ...prev].slice(0, MAX_ITEMS)
  try {
    wx.setStorageSync(KEY_BY_PROFILE[profile], next)
  } catch {
    /* 存储失败时仍返回内存列表 */
  }
  return next
}

export function clearSearchHistory(profile: SearchHistoryProfile): void {
  try {
    wx.removeStorageSync(KEY_BY_PROFILE[profile])
  } catch {
    /* ignore */
  }
}
