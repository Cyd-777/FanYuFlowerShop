import type { WikiQuery, WikiQueryMode } from '@/types/search'
import type { WikiTab } from '@/types/wiki'
import { normalizeSearchQueryText } from '@/utils/searchQueryNormalize'

/** 将搜索框输入转为智库查询请求 */
export function parseWikiSearchQuery(
  text: string,
  tab?: WikiTab,
  mode: WikiQueryMode = 'auto',
): WikiQuery {
  const raw = text.trim()
  const normalized = normalizeSearchQueryText(raw)
  const textTokens = normalized
    ? normalized.split(/[\s,，、]+/).map((t) => t.trim().toLowerCase()).filter(Boolean)
    : []

  return {
    text: raw,
    textTokens,
    mode,
    tab,
    source: 'user',
  }
}

export function isEmptyWikiQuery(query: WikiQuery) {
  return !query.text?.trim() && !(query.textTokens?.length)
}
