import { getCloud, getCloudCallConfig, parseCloudResult, formatCloudError } from '@/services/cloud'
import type { Goods } from '@/types/goods'

interface FavoriteCloudResult {
  success: boolean
  errMsg?: string
  list?: Goods[]
  favorited?: boolean
}

async function callFavorite<T = FavoriteCloudResult>(data: Record<string, unknown>): Promise<T> {
  const cloud = getCloud()
  const config = getCloudCallConfig()

  let res: WechatMiniprogram.Cloud.CallFunctionResult
  try {
    res = await cloud.callFunction({
      name: 'favorite',
      data,
      ...(config ? { config } : {}),
    })
  } catch (err) {
    const msg = formatCloudError(err)
    if (msg.includes('FUNCTION_NOT_FOUND') || msg.includes('FunctionName parameter could not be found')) {
      throw new Error('favorite 云函数未部署，请先在云开发控制台部署')
    }
    throw new Error(`云函数调用失败: ${msg}`)
  }

  const result = parseCloudResult<T & FavoriteCloudResult>(res.result)
  if (!result || typeof result !== 'object') {
    throw new Error('云函数返回格式异常')
  }

  return result as T
}

export async function listFavoriteGoods(): Promise<Goods[]> {
  const result = await callFavorite({ action: 'list' })
  if (!result.success) {
    throw new Error(result.errMsg || '获取收藏失败')
  }
  return Array.isArray(result.list) ? result.list : []
}

export async function checkFavorite(goodsId: string): Promise<boolean> {
  const result = await callFavorite({ action: 'check', goodsId })
  if (!result.success) {
    throw new Error(result.errMsg || '查询收藏状态失败')
  }
  return !!result.favorited
}

export async function addFavorite(goodsId: string): Promise<void> {
  const result = await callFavorite({ action: 'add', goodsId })
  if (!result.success) {
    throw new Error(result.errMsg || '收藏失败')
  }
}

export async function removeFavorite(goodsId: string): Promise<void> {
  const result = await callFavorite({ action: 'remove', goodsId })
  if (!result.success) {
    throw new Error(result.errMsg || '取消收藏失败')
  }
}

export async function toggleFavorite(goodsId: string, favorited: boolean): Promise<boolean> {
  if (favorited) {
    await removeFavorite(goodsId)
    return false
  }
  await addFavorite(goodsId)
  return true
}
