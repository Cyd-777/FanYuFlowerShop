import type { Goods } from '@/types/goods'

export interface GoodsNameSuggestion {
  id: string
  name: string
  categoryName: string
}

/** 商品名称输入预判：前缀优先，其次包含匹配 */
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
    if (!lower.includes(q)) continue

    let score = 0
    if (lower.startsWith(q)) score += 100
    if (lower === q) score += 50
    const index = lower.indexOf(q)
    score += Math.max(0, 20 - index)
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

/** 按名称关键词筛选（模糊包含，忽略大小写） */
export function matchGoodsNameKeyword(item: Goods, keyword: string): boolean {
  const q = keyword.trim().toLowerCase()
  if (!q) return true
  return (item.name || '').toLowerCase().includes(q)
}
