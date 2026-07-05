import type { SearchSuggestion } from '@/types/search'
import type { FlowerWikiListItem } from '@/types/wiki'
import { getWikiDisplayName, getWikiFullLabel, getWikiSubtitle, wikiVarietyLabel } from '@/types/wiki'
import {
  isPartialIntentQuery,
  suggestQueryCompletions,
} from '@/utils/customerSearchCompletions'

const WIKI_INTENT_SUGGEST_META = '问法预判'

/** 百科词条名称预判：前缀优先，其次包含 */
export function suggestWikiEntries(
  list: FlowerWikiListItem[],
  query: string,
  limit = 8,
): SearchSuggestion[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const scored: Array<{ item: SearchSuggestion; score: number }> = []

  for (const entry of list) {
    const name = getWikiFullLabel(entry).trim()
    if (!name) continue
    const lower = name.toLowerCase()
    const display = getWikiDisplayName(entry).trim().toLowerCase()
    const kind = (entry.kindName || '').trim().toLowerCase()
    const variety = (entry.varietyName || '').trim().toLowerCase()
    const haystack = [lower, display, kind, variety].filter(Boolean).join(' ')
    if (!haystack.includes(q) && !display.startsWith(q) && !lower.startsWith(q)) continue

    let score = 0
    if (display.startsWith(q) || lower.startsWith(q)) score += 100
    if (display === q || lower === q) score += 50
    if (kind.includes(q) && kind !== display) score += 30
    if (variety.includes(q) && variety !== display) score += 25
    score += Math.max(0, 20 - lower.indexOf(q))
    score -= name.length * 0.05

    const hasVariety = Boolean(wikiVarietyLabel(entry))
    scored.push({
      item: {
        id: entry._id,
        label: name,
        meta: hasVariety ? undefined : getWikiSubtitle(entry),
      },
      score,
    })
  }

  scored.sort((a, b) => b.score - a.score)

  const seen = new Set<string>()
  const result: SearchSuggestion[] = []
  for (const { item } of scored) {
    const key = item.label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(item)
    if (result.length >= limit) break
  }

  return result
}

/**
 * 百科 Tab 搜索预判：词条名 + 问法补全（如「玫瑰怎么养」「弗洛伊德花期多久」）
 */
export function buildWikiTabSuggestions(
  list: FlowerWikiListItem[],
  query: string,
  limit = 8,
): SearchSuggestion[] {
  const q = query.trim()
  if (!q) return []

  const result: SearchSuggestion[] = []
  const seen = new Set<string>()
  const partialIntent = isPartialIntentQuery(q)
  const completions = suggestQueryCompletions([], list, q, limit)

  function upsert(item: SearchSuggestion) {
    const key = item.label.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    result.push(item)
  }

  if (partialIntent) {
    for (const text of completions) {
      upsert({
        id: `wiki-intent:${text}`,
        label: text,
        meta: WIKI_INTENT_SUGGEST_META,
      })
    }
  }

  for (const item of suggestWikiEntries(list, q, limit)) {
    upsert(item)
  }

  if (!partialIntent) {
    for (const text of completions) {
      upsert({
        id: `wiki-intent:${text}`,
        label: text,
        meta: WIKI_INTENT_SUGGEST_META,
      })
    }
  }

  return result.slice(0, limit)
}
