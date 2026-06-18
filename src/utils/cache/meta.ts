import { getCloud, getCloudCallConfig, parseCloudResult } from '@/services/cloud'
import type { CacheModule, CacheVersions } from '@/types/cache'
import { META_THROTTLE_MS } from './constants'

interface MetaCloudResult {
  success: boolean
  errMsg?: string
  versions?: Partial<CacheVersions>
}

let memoryMeta: { versions: CacheVersions; fetchedAt: number } | null = null

const DEFAULT_VERSIONS: CacheVersions = {
  categories: 1,
  goods: 1,
  wiki: 1,
  flower: 1,
  shop: 1,
}

function normalizeVersions(raw?: Partial<CacheVersions>): CacheVersions {
  return {
    categories: Number(raw?.categories) || DEFAULT_VERSIONS.categories,
    goods: Number(raw?.goods) || DEFAULT_VERSIONS.goods,
    wiki: Number(raw?.wiki) || DEFAULT_VERSIONS.wiki,
    flower: Number(raw?.flower) || DEFAULT_VERSIONS.flower,
    shop: Number(raw?.shop) || DEFAULT_VERSIONS.shop,
  }
}

export async function fetchCacheVersions(force = false): Promise<CacheVersions> {
  if (!force && memoryMeta && Date.now() - memoryMeta.fetchedAt < META_THROTTLE_MS) {
    return memoryMeta.versions
  }

  try {
    const res = await getCloud().callFunction({
      name: 'meta',
      ...(getCloudCallConfig() ? { config: getCloudCallConfig() } : {}),
    })
    const result = parseCloudResult<MetaCloudResult>(res.result)
    if (!result.success) {
      throw new Error(result.errMsg || '获取缓存版本失败')
    }
    const versions = normalizeVersions(result.versions)
    memoryMeta = { versions, fetchedAt: Date.now() }
    return versions
  } catch (err) {
    if (memoryMeta) return memoryMeta.versions
    console.warn('[cache] meta fetch failed:', err)
    return DEFAULT_VERSIONS
  }
}

export function peekCacheVersions(): CacheVersions | null {
  return memoryMeta?.versions ?? null
}

export function resetCacheVersionsMemory() {
  memoryMeta = null
}

export function getModuleVersion(versions: CacheVersions, module: CacheModule) {
  return versions[module] ?? 1
}
