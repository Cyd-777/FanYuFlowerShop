/**
 * 读路径已迁移至 `@/modules/wiki`，本文件仅保留写 API 与 deprecated 读 re-export。
 */
export {
  getPublicWiki,
  getPublicWikiCached,
  listPublicWiki,
  listPublicWikiCached,
  matchPublicWiki,
  matchPublicWikiCached,
  searchPublicWiki,
} from '@/modules/wiki'

export type { FlowerWiki, FlowerWikiListItem, LoadWithCacheResult, WikiQuery, WikiSearchResult } from '@/modules/wiki'

// ========== 商户端词条管理（写路径，产品暂停） ==========

import { getCloud, getCloudCallConfig, parseCloudResult } from './cloud'
import { invalidateCacheEvent, loadWithCache } from '@/utils/cache'
import type { LoadWithCacheResult } from '@/utils/cache/loadWithCache'
import type { FlowerWiki, FlowerWikiListItem } from '@/types/wiki'

const MERCHANT_WIKI_LIST_KEY = 'wiki:merchant:list:v2'

interface WikiCloudResult {
  success: boolean
  errMsg?: string
  list?: FlowerWikiListItem[]
  wiki?: FlowerWiki | FlowerWikiListItem | null
}

async function callWiki<T = WikiCloudResult>(data: Record<string, unknown>): Promise<T> {
  const cloud = getCloud()
  const config = getCloudCallConfig()

  let res: WechatMiniprogram.Cloud.CallFunctionResult
  try {
    res = await cloud.callFunction({
      name: 'wiki',
      data,
      ...(config ? { config } : {}),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('FUNCTION_NOT_FOUND') || msg.includes('FunctionName parameter could not be found')) {
      throw new Error('wiki 云函数未部署，请先在云开发控制台部署')
    }
    throw new Error(`云函数调用失败: ${msg}`)
  }

  const result = parseCloudResult<T & WikiCloudResult>(res.result)
  if (!result || typeof result !== 'object') {
    throw new Error('云函数返回格式异常')
  }

  return result as T
}

function invalidateWikiRelatedCaches() {
  invalidateCacheEvent('wikiContent')
}

/** 商户端获取全部词条（含未启用的） */
export async function listMerchantWikis(): Promise<FlowerWikiListItem[]> {
  const result = await callWiki({ action: 'list' })
  if (result.success !== true) {
    throw new Error(result.errMsg || '获取词条失败')
  }
  return Array.isArray(result.list) ? result.list : []
}

export async function listMerchantWikisCached(options?: {
  force?: boolean
  onUpdate?: (list: FlowerWikiListItem[]) => void
}): Promise<LoadWithCacheResult<FlowerWikiListItem[]>> {
  return loadWithCache({
    module: 'wiki',
    cacheKey: MERCHANT_WIKI_LIST_KEY,
    fetcher: () => listMerchantWikis(),
    force: options?.force,
    onUpdate: options?.onUpdate,
  })
}

/** 获取单个词条详情（商户端，含图鉴/花语/养护字段） */
export async function getMerchantWiki(id: string): Promise<FlowerWiki> {
  const result = await callWiki({ action: 'get', id })
  if (!result.success || !result.wiki) {
    throw new Error(result.errMsg || '获取词条失败')
  }
  return result.wiki as FlowerWiki
}

export interface WikiWritePayload {
  kindName?: string
  varietyName?: string
  icon?: string
  enabled?: boolean
  sort?: number
  plantForm?: FlowerWiki['plantForm']
  careBaseRef?: string
  aliases?: string[]
  tags?: string[]
  keywords?: string[]
  occasions?: string[]
  names?: FlowerWiki['names']
  bloom?: Partial<FlowerWiki['bloom']>
  atlas?: Partial<FlowerWiki['atlas']> & {
    intro?: FlowerWiki['atlas']['intro']
    featureRefs?: string[]
  }
  language?: Partial<FlowerWiki['language']>
  careVase?: Partial<FlowerWiki['careVase']>
}

/** 新建词条 */
export async function createWiki(data: WikiWritePayload & { kindName: string }): Promise<FlowerWikiListItem> {
  const result = await callWiki({ action: 'add', wiki: data })
  if (!result.success || !result.wiki) {
    throw new Error(result.errMsg || '创建词条失败')
  }
  invalidateWikiRelatedCaches()
  return result.wiki as FlowerWikiListItem
}

/** 更新词条 */
export async function updateWiki(id: string, data: WikiWritePayload): Promise<FlowerWikiListItem> {
  const result = await callWiki({ action: 'update', id, wiki: data })
  if (!result.success || !result.wiki) {
    throw new Error(result.errMsg || '更新词条失败')
  }
  invalidateWikiRelatedCaches()
  return result.wiki as FlowerWikiListItem
}

/** 删除词条 */
export async function removeWiki(id: string): Promise<void> {
  const result = await callWiki({ action: 'remove', id })
  if (!result.success) {
    throw new Error(result.errMsg || '删除词条失败')
  }
  invalidateWikiRelatedCaches()
}

/** 外部数据源预填充（维基 + GBIF，经云函数代理） */
export async function fetchWikiExternalPrefill(query: string): Promise<any> {
  const result = await callWiki<any & WikiCloudResult>({
    action: 'externalPrefill',
    query: query.trim(),
  })
  if (result.success !== true) {
    throw new Error(result.errMsg || '外部数据拉取失败')
  }
  return result
}
