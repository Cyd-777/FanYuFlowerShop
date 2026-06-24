import type { Goods } from '@/types/goods'
import type { GoodsQuery } from '@/types/search'

/** 顾客端商品可搜索字段 */
export function buildCustomerGoodsHaystack(item: Goods) {
  return [
    item.name,
    item.description,
    item.categoryName,
    item.flowerKindName,
    item.flowerVarietyName,
  ]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function matchCustomerGoodsSearch(item: Goods, query: GoodsQuery) {
  if (query.exactName) {
    const q = (query.text || '').trim()
    if (!q) return true
    return (item.name || '').trim() === q
  }
  const tokens = query.textTokens || []
  if (!tokens.length) return true
  const haystack = buildCustomerGoodsHaystack(item)
  return tokens.every((token) => haystack.includes(token.toLowerCase()))
}
