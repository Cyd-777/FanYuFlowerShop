import { getCloud, getCloudCallConfig, parseCloudResult } from './cloud'
import { loadWithCache } from '@/utils/cache'
import type { LoadWithCacheResult } from '@/utils/cache/loadWithCache'
import type {
  FlowerGoodsSuggestion,
  FlowerKindWithVarieties,
  FlowerVariety,
  FlowerKind,
} from '@/types/flower'

interface FlowerCloudResult {
  success: boolean
  errMsg?: string
  list?: FlowerKindWithVarieties[]
  variety?: FlowerVariety
  kind?: FlowerKind
  suggestion?: FlowerGoodsSuggestion
}

async function callFlower<T = FlowerCloudResult>(data: Record<string, unknown>): Promise<T> {
  const cloud = getCloud()
  const config = getCloudCallConfig()

  let res: WechatMiniprogram.Cloud.CallFunctionResult
  try {
    res = await cloud.callFunction({
      name: 'flower',
      data,
      ...(config ? { config } : {}),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('FUNCTION_NOT_FOUND') || msg.includes('FunctionName parameter could not be found')) {
      throw new Error('flower 云函数未部署，请先在云开发控制台部署')
    }
    throw new Error(`云函数调用失败: ${msg}`)
  }

  const result = parseCloudResult<T & FlowerCloudResult>(res.result)
  if (!result || typeof result !== 'object') {
    throw new Error('云函数返回格式异常')
  }

  return result as T
}

const FLOWER_CATALOG_CACHE_KEY = 'flower:catalog:list'

export async function listFlowerCatalog(): Promise<FlowerKindWithVarieties[]> {
  const result = await callFlower({ action: 'list' })
  if (result.success !== true) {
    throw new Error(result.errMsg || '获取花卉库失败')
  }
  return Array.isArray(result.list) ? result.list : []
}

export async function listFlowerCatalogCached(options?: {
  force?: boolean
  onUpdate?: (list: FlowerKindWithVarieties[]) => void
}): Promise<LoadWithCacheResult<FlowerKindWithVarieties[]>> {
  return loadWithCache({
    module: 'flower',
    cacheKey: FLOWER_CATALOG_CACHE_KEY,
    fetcher: () => listFlowerCatalog(),
    force: options?.force,
    onUpdate: options?.onUpdate,
  })
}

export async function searchFlowerCatalog(keyword: string): Promise<FlowerKindWithVarieties[]> {
  const result = await callFlower({ action: 'search', keyword })
  if (result.success !== true) {
    throw new Error(result.errMsg || '搜索花卉库失败')
  }
  return Array.isArray(result.list) ? result.list : []
}

export async function getFlowerVarietySuggestion(id: string): Promise<FlowerGoodsSuggestion> {
  const result = await callFlower({ action: 'getVariety', id })
  if (!result.success || !result.suggestion) {
    throw new Error(result.errMsg || '获取花材建议失败')
  }
  return result.suggestion
}

export function buildFlowerLabel(kindName: string, varietyName: string) {
  return `${varietyName} · ${kindName}`
}
