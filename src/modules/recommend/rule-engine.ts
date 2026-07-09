/**
 * 推荐引擎入口：规则引擎 + AI 兜底。
 *
 * 当前阶段：直接调云端 AI（aiRecommend），规则引擎尚未实现。
 * 后续：端侧模型就绪后替换为本地规则优先 + AI 兜底。
 */
import type { RecommendInput, RecommendResult } from './types'
import { aiRecommend } from '@/modules/ai'
import type { GuideInput } from '@/modules/ai'

/**
 * 花材推荐入口。
 *
 * @param input - 导购或自选输入
 * @returns 推荐的花束和花材搭配
 */
export async function recommend(input: RecommendInput): Promise<RecommendResult> {
  const { mode, data } = input

  try {
    if (mode === 'guide') {
      const guideData = data as GuideInput
      const result = await aiRecommend('guide', guideData)

      // 将 AI 返回的结构化推荐转为 RecommendResult
      if ('recommendations' in result && Array.isArray(result.recommendations)) {
        return {
          bouquets: result.recommendations.map((r, i) => ({
            id: `ai_bouquet_${i}`,
            name: r.name,
            description: r.description,
            price: parseFloat(r.priceRange?.replace(/[^0-9.]/g, '') || '0'),
            reason: r.reason,
            flowers: r.flowers,
          })),
          flowerSuggestions: [],
        }
      }
    }

    if (mode === 'self_select') {
      const selfData = data as { mainFlower?: string; intent?: string }
      const result = await aiRecommend('self_select', selfData)

      if ('companionFlowers' in result && Array.isArray(result.companionFlowers)) {
        return {
          bouquets: [],
          flowerSuggestions: result.companionFlowers.map((f, i) => ({
            id: `ai_flower_${i}`,
            name: f.name,
            category: f.role === '配叶' ? 'foliage' : f.role === '点缀' ? 'accent' : 'filler',
            reason: f.reason,
          })),
        }
      }
    }
  } catch (err) {
    console.warn('[recommend] AI 推荐失败，返回空结果:', err)
  }

  return { bouquets: [], flowerSuggestions: [] }
}
