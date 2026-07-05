/** 从「4—11 月」「4-5月」等文案解析自然花期月份（1–12） */
export function parseBloomSeasonMonths(text: string): number[] {
  const source = String(text || '').trim()
  if (!source) return []

  const rangeMatch = source.match(/(\d{1,2})\s*[—\-~～]\s*(\d{1,2})/)
  if (rangeMatch) {
    const start = Number.parseInt(rangeMatch[1], 10)
    const end = Number.parseInt(rangeMatch[2], 10)
    const months: number[] = []
    if (start <= end) {
      for (let m = start; m <= end; m += 1) months.push(m)
    } else {
      for (let m = start; m <= 12; m += 1) months.push(m)
      for (let m = 1; m <= end; m += 1) months.push(m)
    }
    return months.filter((m) => m >= 1 && m <= 12)
  }

  const singleMatch = source.match(/(\d{1,2})\s*月/)
  if (singleMatch) {
    const month = Number.parseInt(singleMatch[1], 10)
    return month >= 1 && month <= 12 ? [month] : []
  }

  return []
}

export function resolveWikiSeasonMonths(wiki: {
  seasonMonths?: number[]
  bloom?: { soil?: string }
  atlas?: { bloomSeason?: string }
}): number[] {
  const fromField = (wiki.seasonMonths || []).filter((m) => m >= 1 && m <= 12)
  if (fromField.length) {
    return [...new Set(fromField)].sort((a, b) => a - b)
  }
  const soilText = wiki.bloom?.soil || wiki.atlas?.bloomSeason || ''
  return parseBloomSeasonMonths(soilText)
}

export const WIKI_MONTH_LABELS = [
  '1月',
  '2月',
  '3月',
  '4月',
  '5月',
  '6月',
  '7月',
  '8月',
  '9月',
  '10月',
  '11月',
  '12月',
] as const
