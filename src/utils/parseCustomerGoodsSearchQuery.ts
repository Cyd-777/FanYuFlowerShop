import type { GoodsQuery } from '@/types/search'
import { normalizeSearchQueryText } from '@/utils/searchQueryNormalize'

export function parseCustomerGoodsSearchQuery(
  text: string,
  categoryId = '',
  options?: { exactName?: boolean },
): GoodsQuery {
  const raw = text.trim()
  const normalized = normalizeSearchQueryText(raw)
  const textTokens = normalized
    ? normalized.split(/[\s,，、]+/).map((t) => t.trim().toLowerCase()).filter(Boolean)
    : []

  return {
    text: raw,
    textTokens,
    categoryId: categoryId.trim() || undefined,
    exactName: options?.exactName === true,
    source: options?.exactName ? 'suggestion' : 'user',
  }
}

export function isEmptyGoodsQuery(query: GoodsQuery) {
  return !query.text?.trim() && !(query.textTokens?.length)
}
