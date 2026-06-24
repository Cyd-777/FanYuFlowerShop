import type { SearchSuggestion } from '@/types/search'
import type { FlowerWikiListItem } from '@/types/wiki'
import { getWikiDisplayName, getWikiSubtitle } from '@/types/wiki'

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
    const name = getWikiDisplayName(entry).trim()
    if (!name) continue
    const lower = name.toLowerCase()
    const kind = (entry.kindName || '').trim().toLowerCase()
    const haystack = [lower, kind, entry.varietyName?.toLowerCase() || ''].filter(Boolean).join(' ')
    if (!haystack.includes(q) && !lower.startsWith(q)) continue

    let score = 0
    if (lower.startsWith(q)) score += 100
    if (lower === q) score += 50
    if (kind.includes(q) && kind !== lower) score += 30
    score += Math.max(0, 20 - lower.indexOf(q))
    score -= name.length * 0.05

    scored.push({
      item: {
        id: entry._id,
        label: name,
        meta: getWikiSubtitle(entry),
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
