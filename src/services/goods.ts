import { getCloud, getCloudCallConfig, parseCloudResult, formatCloudError } from './cloud'
import { invalidateCacheModule, loadWithCache } from '@/utils/cache'
import { fetchCacheVersions, getModuleVersion } from '@/utils/cache/meta'
import { writeCacheEntry } from '@/utils/cache/storage'
import type { LoadWithCacheResult } from '@/utils/cache/loadWithCache'
import type { GoodsQuery } from '@/types/search'
import type { Goods, GoodsForm, GoodsListFilter } from '@/types/goods'
import { goodsListMissingPublicImageUrls } from '@/utils/goodsImage'
import type { GoodsBatchPatch } from '@/types/goodsBatch'
import type { StockInSubmitItem } from '@/types/stockIn'
import { unitFromSalesType } from '@/types/goods'
import { CACHE_KEYS, goodsPublicDetailKey } from '@/data/cacheKeys'

function publicGoodsCacheKey() {
  return CACHE_KEYS.goodsPublicAll
}

interface GoodsCloudResult {
  success: boolean
  errMsg?: string
  list?: Goods[]
  goods?: Goods
}

async function callGoods<T = GoodsCloudResult>(data: Record<string, unknown>): Promise<T> {
  const cloud = getCloud()
  const config = getCloudCallConfig()

  let res: WechatMiniprogram.Cloud.CallFunctionResult
  try {
    res = await cloud.callFunction({
      name: 'goods',
      data,
      ...(config ? { config } : {}),
    })
  } catch (err) {
    const msg = formatCloudError(err)
    if (msg.includes('FUNCTION_NOT_FOUND') || msg.includes('FunctionName parameter could not be found')) {
      throw new Error('goods 云函数未部署，请先在云开发控制台部署')
    }
    if (msg.includes('Cannot find module') || msg.includes('MODULE_NOT_FOUND')) {
      throw new Error('goods 云函数依赖缺失，请先运行 npm run sync:cloud 后重新上传部署')
    }
    throw new Error(`云函数调用失败: ${msg}`)
  }

  const result = parseCloudResult<T & GoodsCloudResult>(res.result)
  if (!result || typeof result !== 'object') {
    throw new Error('云函数返回格式异常')
  }
  if (result.success === false && result.errMsg === '未知操作') {
    throw new Error('goods 云函数版本过旧，请重新部署后重试')
  }

  return result as T
}

export async function listPublicGoods(keyword = '', categoryId = ''): Promise<Goods[]> {
  const result = await callGoods({
    action: 'publicList',
    keyword,
    categoryId,
  })

  if (result.success !== true) {
    throw new Error(result.errMsg || '获取商品列表失败')
  }

  return Array.isArray(result.list) ? result.list : []
}

/** 结构化顾客端商品搜索 */
export async function searchPublicGoods(query: GoodsQuery): Promise<Goods[]> {
  const result = await callGoods({
    action: 'publicSearch',
    query,
  })

  if (result.success !== true) {
    throw new Error(result.errMsg || '搜索商品失败')
  }

  return Array.isArray(result.list) ? result.list : []
}

export const PUBLIC_RECOMMEND_CACHE_KEY = CACHE_KEYS.goodsRecommend

export async function listPublicRecommendGoods(): Promise<Goods[]> {
  const result = await callGoods({
    action: 'publicList',
    recommendOnly: true,
    inStockOnly: true,
  })

  if (result.success !== true) {
    throw new Error(result.errMsg || '获取推荐商品失败')
  }

  return Array.isArray(result.list) ? result.list : []
}

/** live sync / 静默对齐：直拉云端并写回本地缓存（不走 SWR 立即返回旧数据的路径） */
export async function syncRecommendListFromCloud(): Promise<Goods[]> {
  const [versions, data] = await Promise.all([
    fetchCacheVersions(true),
    listPublicRecommendGoods(),
  ])
  writeCacheEntry(PUBLIC_RECOMMEND_CACHE_KEY, {
    data,
    serverVersion: getModuleVersion(versions, 'goods'),
    cachedAt: Date.now(),
  })
  return data
}

export async function syncPublicGoodsListFromCloud(): Promise<Goods[]> {
  const [versions, data] = await Promise.all([
    fetchCacheVersions(true),
    listPublicGoods('', ''),
  ])
  writeCacheEntry(publicGoodsCacheKey(), {
    data,
    serverVersion: getModuleVersion(versions, 'goods'),
    cachedAt: Date.now(),
  })
  return data
}

export async function listPublicRecommendGoodsCached(
  options?: { force?: boolean; onUpdate?: (list: Goods[]) => void },
): Promise<LoadWithCacheResult<Goods[]>> {
  const run = (force?: boolean) =>
    loadWithCache({
      module: 'goods',
      cacheKey: PUBLIC_RECOMMEND_CACHE_KEY,
      fetcher: () => listPublicRecommendGoods(),
      force: force ?? options?.force,
      onUpdate: options?.onUpdate,
    })

  const result = await run()
  if (!options?.force && goodsListMissingPublicImageUrls(result.data)) {
    return run(true)
  }
  return result
}

export async function listPublicGoodsCached(
  options?: { force?: boolean; onUpdate?: (list: Goods[]) => void },
): Promise<LoadWithCacheResult<Goods[]>> {
  const run = (force?: boolean) =>
    loadWithCache({
      module: 'goods',
      cacheKey: publicGoodsCacheKey(),
      fetcher: () => listPublicGoods('', ''),
      force: force ?? options?.force,
      onUpdate: options?.onUpdate,
    })

  const result = await run()
  if (!options?.force && goodsListMissingPublicImageUrls(result.data)) {
    return run(true)
  }
  return result
}

export async function getPublicGoods(id: string): Promise<Goods> {
  const result = await callGoods({ action: 'publicGet', id })
  if (!result.success || !result.goods) {
    throw new Error(result.errMsg || '获取商品详情失败')
  }
  return result.goods
}

/** 加购/下单前强刷云端，校验可售与库存 */
export async function validateGoodsForPurchase(id: string): Promise<Goods> {
  const goods = await getPublicGoods(id)
  if (!goods.onSale) {
    throw new Error('商品已下架')
  }
  if (goods.stock <= 0) {
    throw new Error('商品已售罄，暂时无法购买')
  }
  return goods
}

export async function getPublicGoodsCached(
  id: string,
  options?: { force?: boolean; onUpdate?: (goods: Goods) => void },
): Promise<LoadWithCacheResult<Goods>> {
  const run = (force?: boolean) =>
    loadWithCache({
      module: 'goods',
      cacheKey: goodsPublicDetailKey(id),
      fetcher: () => getPublicGoods(id),
      force: force ?? options?.force,
      onUpdate: options?.onUpdate,
    })

  const result = await run()
  if (!options?.force && goodsListMissingPublicImageUrls([result.data])) {
    return run(true)
  }
  return result
}

export const MERCHANT_GOODS_LIST_CACHE_KEY = 'goods:merchant:all'

export async function listMerchantGoods(
  keyword = '',
  filter: GoodsListFilter = 'all',
): Promise<Goods[]> {
  const result = await callGoods({
    action: 'list',
    keyword,
    filter,
  })

  if (!result.success) {
    throw new Error(result.errMsg || '获取商品列表失败')
  }

  return result.list || []
}

export async function listMerchantGoodsCached(
  options?: { force?: boolean; onUpdate?: (list: Goods[]) => void },
): Promise<LoadWithCacheResult<Goods[]>> {
  return loadWithCache({
    module: 'goods',
    cacheKey: MERCHANT_GOODS_LIST_CACHE_KEY,
    fetcher: () => listMerchantGoods('', 'all'),
    force: options?.force,
    onUpdate: options?.onUpdate,
  })
}

export async function getMerchantGoods(id: string): Promise<Goods> {
  const result = await callGoods({ action: 'get', id })
  if (!result.success || !result.goods) {
    throw new Error(result.errMsg || '获取商品详情失败')
  }
  return result.goods
}

export function toGoodsPayload(form: GoodsForm) {
  const salesType = form.salesType
  const unitsPerGroup =
    salesType === 'group' ? parseInt(form.unitsPerGroup, 10) : undefined
  return {
    name: form.name.trim(),
    price: Number(form.price),
    salesType,
    unit: unitFromSalesType(salesType),
    stock: parseInt(form.stock, 10),
    description: form.description.trim(),
    categoryId: form.categoryId.trim(),
    flowerKindId: form.flowerKindId.trim(),
    flowerKindName: form.flowerKindName.trim(),
    flowerVarietyId: form.flowerVarietyId.trim(),
    flowerVarietyName: form.flowerVarietyName.trim(),
    coverImage: form.coverImage,
    images: form.images,
    onSale: form.onSale,
    recommend: form.recommend,
    sort: parseInt(form.sort, 10) || 0,
    ...(unitsPerGroup != null && !Number.isNaN(unitsPerGroup) ? { unitsPerGroup } : {}),
  }
}

export async function createGoods(form: GoodsForm): Promise<Goods> {
  const result = await callGoods({
    action: 'add',
    goods: toGoodsPayload(form),
  })

  if (!result.success || !result.goods) {
    throw new Error(result.errMsg || '创建商品失败')
  }
  invalidateCacheModule('goods')
  return result.goods
}

export async function updateGoods(id: string, form: GoodsForm): Promise<Goods> {
  const result = await callGoods({
    action: 'update',
    id,
    goods: toGoodsPayload(form),
  })

  if (!result.success || !result.goods) {
    throw new Error(result.errMsg || '更新商品失败')
  }
  invalidateCacheModule('goods')
  return result.goods
}

export async function removeGoods(id: string): Promise<void> {
  const result = await callGoods({ action: 'remove', id })
  if (!result.success) {
    throw new Error(result.errMsg || '删除商品失败')
  }
  invalidateCacheModule('goods')
}

export async function batchRemoveGoods(ids: string[]): Promise<number> {
  const result = await callGoods({
    action: 'batchRemove',
    ids,
  })
  if (!result.success) {
    throw new Error(result.errMsg || '批量删除失败')
  }
  invalidateCacheModule('goods')
  return Number((result as { removed?: number }).removed) || ids.length
}

export async function batchUpdateGoods(ids: string[], patch: GoodsBatchPatch): Promise<number> {
  const result = await callGoods({
    action: 'batchUpdate',
    ids,
    patch,
  })
  if (!result.success) {
    throw new Error(result.errMsg || '批量修改失败')
  }
  invalidateCacheModule('goods')
  return Number((result as { updated?: number }).updated) || ids.length
}

export async function submitStockIn(items: StockInSubmitItem[]): Promise<number> {
  const result = await callGoods({
    action: 'stockIn',
    items,
  })
  if (!result.success) {
    throw new Error(result.errMsg || '提交进货单失败')
  }
  invalidateCacheModule('goods')
  return Number((result as { applied?: number }).applied) || items.length
}

export async function uploadGoodsImage(localPath: string): Promise<string> {
  const extMatch = localPath.match(/\.(\w+)(?:\?|$)/)
  const ext = extMatch?.[1] || 'jpg'
  const cloudPath = `goods/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

  const res = await getCloud().uploadFile({
    cloudPath,
    filePath: localPath,
  })

  return res.fileID
}
