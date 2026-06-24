import type { Goods } from '@/types/goods'
import type { SearchSuggestion } from '@/types/search'
import { buildCustomerGoodsHaystack } from '@/utils/customerGoodsSearch'

export interface GoodsNameSuggestion {
  id: string
  name: string
  categoryName: string
}

function toSearchSuggestion(item: GoodsNameSuggestion): SearchSuggestion {
  return {
    id: item.id,
    label: item.name,
    meta: item.categoryName,
  }
}

/** 商品输入预判：名称前缀优先，亦匹配描述 / 花材 / 分类 */
export function suggestGoodsNames(
  list: Goods[],
  query: string,
  limit = 8,
): GoodsNameSuggestion[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const scored: Array<{ item: GoodsNameSuggestion; score: number }> = []

  for (const goods of list) {
    const name = goods.name?.trim() || ''
    if (!name) continue
    const lower = name.toLowerCase()
    const haystack = buildCustomerGoodsHaystack(goods)
    const nameHit = lower.includes(q) || lower.startsWith(q)
    const fieldHit = haystack.includes(q)
    if (!nameHit && !fieldHit) continue

    let score = 0
    if (lower.startsWith(q)) score += 100
    if (lower === q) score += 50
    if (nameHit) score += Math.max(0, 20 - lower.indexOf(q))
    if (fieldHit && !nameHit) score += 25
    score -= name.length * 0.05

    scored.push({
      item: {
        id: goods._id,
        name,
        categoryName: goods.categoryName?.trim() || '未分类',
      },
      score,
    })
  }

  scored.sort((a, b) => b.score - a.score)

  const seen = new Set<string>()
  const result: GoodsNameSuggestion[] = []
  for (const { item } of scored) {
    const key = item.name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(item)
    if (result.length >= limit) break
  }

  return result
}

/** 供 AppSearchInput 使用的预判适配 */
export function suggestGoodsAsSearchItems(list: Goods[], query: string, limit = 8) {
  return suggestGoodsNames(list, query, limit).map(toSearchSuggestion)
}

/** 按名称关键词筛选；exact 为 true 时精确匹配品名 */
export function matchGoodsNameKeyword(
  item: Goods,
  keyword: string,
  exact = false,
): boolean {
  const q = keyword.trim()
  if (!q) return true
  const name = (item.name || '').trim()
  if (exact) return name === q
  return name.toLowerCase().includes(q.toLowerCase())
}
