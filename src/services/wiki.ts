import { getCloud, getCloudCallConfig, parseCloudResult } from './cloud'
import { loadWithCache } from '@/utils/cache'
import type { LoadWithCacheResult } from '@/utils/cache/loadWithCache'
import type { FlowerWiki, FlowerWikiListItem } from '@/types/wiki'

const PUBLIC_WIKI_LIST_KEY = 'wiki:public:list'

interface WikiCloudResult {
  success: boolean
  errMsg?: string
  list?: FlowerWikiListItem[]
  wiki?: FlowerWiki | null
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

export async function listPublicWiki(keyword = ''): Promise<FlowerWikiListItem[]> {
  const result = await callWiki({ action: 'publicList', keyword })
  if (result.success !== true) {
    throw new Error(result.errMsg || '获取花卉百科失败')
  }
  return Array.isArray(result.list) ? result.list : []
}

export async function listPublicWikiCached(options?: {
  force?: boolean
  onUpdate?: (list: FlowerWikiListItem[]) => void
}): Promise<LoadWithCacheResult<FlowerWikiListItem[]>> {
  return loadWithCache({
    module: 'wiki',
    cacheKey: PUBLIC_WIKI_LIST_KEY,
    fetcher: () => listPublicWiki(),
    force: options?.force,
    onUpdate: options?.onUpdate,
  })
}

function publicWikiDetailCacheKey(id: string) {
  return `wiki:public:detail:${id}`
}

function publicWikiMatchCacheKey(kindId = '', varietyId = '') {
  return `wiki:public:match:${kindId || '_'}:${varietyId || '_'}`
}

export async function getPublicWiki(id: string): Promise<FlowerWiki> {
  const result = await callWiki({ action: 'publicGet', id })
  if (!result.success || !result.wiki) {
    throw new Error(result.errMsg || '获取百科详情失败')
  }
  return result.wiki
}

export async function getPublicWikiCached(
  id: string,
  options?: { force?: boolean; onUpdate?: (wiki: FlowerWiki) => void },
): Promise<LoadWithCacheResult<FlowerWiki>> {
  return loadWithCache({
    module: 'wiki',
    cacheKey: publicWikiDetailCacheKey(id),
    fetcher: () => getPublicWiki(id),
    force: options?.force,
    onUpdate: options?.onUpdate,
  })
}

export async function matchPublicWiki(kindId = '', varietyId = ''): Promise<FlowerWiki | null> {
  const result = await callWiki({ action: 'publicMatch', kindId, varietyId })
  if (!result.success) {
    throw new Error(result.errMsg || '匹配智库失败')
  }
  return result.wiki || null
}

export async function matchPublicWikiCached(
  kindId = '',
  varietyId = '',
  options?: { force?: boolean; onUpdate?: (wiki: FlowerWiki | null) => void },
): Promise<LoadWithCacheResult<FlowerWiki | null>> {
  return loadWithCache({
    module: 'wiki',
    cacheKey: publicWikiMatchCacheKey(kindId, varietyId),
    fetcher: () => matchPublicWiki(kindId, varietyId),
    force: options?.force,
    onUpdate: options?.onUpdate,
  })
}
