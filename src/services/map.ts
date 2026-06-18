import { getCloud, getCloudCallConfig } from './cloud'

export interface AddressSuggestion {
  id: string
  title: string
  address: string
  province: string
  city: string
  district: string
  latitude?: number
  longitude?: number
}

interface SuggestResult {
  success: boolean
  errMsg?: string
  list?: AddressSuggestion[]
  configured?: boolean
}

export async function suggestAddress(
  keyword: string,
  region = '全国',
): Promise<{ list: AddressSuggestion[]; configured: boolean }> {
  const text = keyword.trim()
  if (!text) return { list: [], configured: true }

  const cloud = getCloud()
  const config = getCloudCallConfig()

  const res = await cloud.callFunction({
    name: 'map',
    data: { action: 'suggest', keyword: text, region },
    ...(config ? { config } : {}),
  })

  const result = res.result as SuggestResult
  if (!result.success) {
    throw new Error(result.errMsg || '地址联想失败')
  }

  return {
    list: result.list || [],
    configured: result.configured !== false,
  }
}
