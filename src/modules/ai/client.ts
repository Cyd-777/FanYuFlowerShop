import { getCloud, getCloudCallConfig, parseCloudResult } from '@/services/cloud'
import type {
  AiRecommendMode,
  GuideInput,
  SelfSelectInput,
  AiRecommendResult,
  AISearchParseResult,
} from './types'

interface AiCloudResult<T = AiRecommendResult> {
  success: boolean
  errMsg?: string
  data?: T
}

export async function aiRecommend(
  mode: AiRecommendMode,
  input: GuideInput | SelfSelectInput,
): Promise<AiRecommendResult> {
  const cloud = getCloud()
  const config = getCloudCallConfig()
  const res = await cloud.callFunction({
    name: 'ai',
    data: {
      action: 'aiRecommend',
      mode,
      input,
    },
    ...(config ? { config } : {}),
  })
  const result = parseCloudResult<AiCloudResult>(res.result)
  if (!result || typeof result !== 'object') {
    throw new Error('云函数返回格式异常')
  }
  if (result.success !== true || !result.data) {
    throw new Error(result.errMsg || 'AI 推荐请求失败')
  }
  return result.data
}

export async function aiParseSearch(query: string): Promise<AISearchParseResult> {
  const cloud = getCloud()
  const config = getCloudCallConfig()
  const res = await cloud.callFunction({
    name: 'ai',
    data: {
      action: 'aiParseSearch',
      query,
    },
    ...(config ? { config } : {}),
  })
  const result = parseCloudResult<AiCloudResult>(res.result)
  if (!result || typeof result !== 'object') {
    throw new Error('云函数返回格式异常')
  }
  if (result.success !== true || !result.data) {
    throw new Error(result.errMsg || 'AI 搜索解析请求失败')
  }
  return result.data as AISearchParseResult
}
