import type { FlowerWikiListItem } from '@/types/wiki'
import type { Goods } from '@/types/goods'
import { getWikiDisplayName, getWikiFullLabel } from '@/types/wiki'
import { suggestGoodsNames } from '@/utils/goodsNameSuggest'
import { suggestWikiEntries } from '@/utils/wikiSuggest'

/** 花名 + 后缀可拼出的顾客问法（与云 wikiLexicon 对齐，客户端预判用） */
export const CUSTOMER_QUERY_SUFFIXES = [
  '怎么养',
  '如何养',
  '怎么养护',
  '怎么换水',
  '如何换水',
  '花期多久',
  '花期是多久',
  '能开多久',
  '能养几天',
  '花语',
  '的寓意',
  '产地',
  '怎么修剪',
]

const PARTIAL_INTENT_TAIL = /(怎么|如何|花期|花语|换水|养|多久|几天|的)$/

export function isPartialIntentQuery(query: string): boolean {
  const q = query.trim()
  return q.length >= 3 && PARTIAL_INTENT_TAIL.test(q)
}

/** 从当前输入中识别可能的花名/主体（最长优先） */
export function extractQuerySubjects(
  goods: Goods[],
  wiki: FlowerWikiListItem[],
  query: string,
): string[] {
  const q = query.trim()
  if (!q) return []

  const candidates: string[] = []

  for (const entry of wiki) {
    const display = getWikiDisplayName(entry).trim()
    const full = getWikiFullLabel(entry).trim()
    if (display.length >= 2) candidates.push(display)
    if (full.length >= 2 && full !== display) candidates.push(full)
    if (entry.kindName?.trim()) candidates.push(entry.kindName.trim())
    if (entry.varietyName?.trim()) candidates.push(entry.varietyName.trim())
  }

  for (const item of goods) {
    if (item.flowerVarietyName?.trim()) candidates.push(item.flowerVarietyName.trim())
    if (item.flowerKindName?.trim()) candidates.push(item.flowerKindName.trim())
    const name = item.name?.trim()
    if (name && name.length <= 8) candidates.push(name)
  }

  const seen = new Set<string>()
  const matched: string[] = []

  for (const subject of candidates.sort((a, b) => b.length - a.length)) {
    const key = subject.toLowerCase()
    if (seen.has(key)) continue
    if (q.startsWith(subject) || subject.startsWith(q)) {
      seen.add(key)
      matched.push(subject)
    }
  }

  return matched
}

/**
 * 输入前缀补全：「玫瑰怎么」→「玫瑰怎么养」
 * 仅返回比当前输入更长、且以当前输入为前缀的字符串
 */
export function suggestQueryCompletions(
  goods: Goods[],
  wiki: FlowerWikiListItem[],
  query: string,
  limit = 8,
): string[] {
  const q = query.trim()
  if (q.length < 1) return []

  const out: string[] = []
  const seen = new Set<string>()

  function add(text: string) {
    const value = text.trim()
    if (!value || value === q || !value.startsWith(q) || value.length <= q.length) return
    const key = value.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push(value)
  }

  const subjects = extractQuerySubjects(goods, wiki, q)

  for (const subject of subjects) {
    if (!q.startsWith(subject)) continue
    const tail = q.slice(subject.length)
    const connectors = ['', '的'] as const

    for (const suffix of CUSTOMER_QUERY_SUFFIXES) {
      for (const conn of connectors) {
        const full = `${subject}${conn}${suffix}`
        if (full.startsWith(q)) add(full)
        if (tail && `${conn}${suffix}`.startsWith(tail)) add(full)
      }
    }
  }

  for (const entry of wiki) {
    const name = getWikiFullLabel(entry).trim()
    if (name.startsWith(q)) add(name)
  }

  for (const item of goods) {
    const name = item.name?.trim() || ''
    if (name.startsWith(q)) add(name)
  }

  return out
    .sort((a, b) => {
      const lenDiff = a.length - b.length
      if (lenDiff !== 0) return lenDiff
      return a.localeCompare(b, 'zh-CN')
    })
    .slice(0, limit)
}

export function hasWikiForLabel(wiki: FlowerWikiListItem[], label: string): boolean {
  const text = label.trim()
  if (!text) return false

  const candidates = [text]
  const stripped = text
    .replace(/(花期|怎么养|花语|换水|多久|几天|寓意|产地).*/g, '')
    .replace(/[？?吗呢\s]+$/g, '')
    .trim()
  if (stripped && stripped !== text) candidates.push(stripped)

  for (const part of text.split(/[的\s，,、？?吗呢]+/)) {
    const token = part.trim()
    if (token.length >= 2) candidates.push(token)
  }

  const seen = new Set<string>()
  for (const candidate of candidates) {
    const key = candidate.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    if (suggestWikiEntries(wiki, candidate, 1).length > 0) return true
  }
  return false
}

export function hasGoodsForLabel(goods: Goods[], label: string): boolean {
  return suggestGoodsNames(goods, label.trim(), 1).length > 0
}
