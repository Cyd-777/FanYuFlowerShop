/** 从「约 5—10 天」「夏季约 7—10 天，冬季可至 15 天」等解析最短/最长天数 */
export function parseVaseLifeRange(text: string): { min: number; max: number } | null {
  const source = String(text || '').trim()
  if (!source) return null

  const dayValues: number[] = []

  const rangePattern = /(\d{1,2})\s*[—\-~～]\s*(\d{1,2})/g
  let rangeMatch: RegExpExecArray | null
  while ((rangeMatch = rangePattern.exec(source)) !== null) {
    const min = Number.parseInt(rangeMatch[1], 10)
    const max = Number.parseInt(rangeMatch[2], 10)
    if (min >= 1 && max >= min && max <= 30) {
      dayValues.push(min, max)
    }
  }

  const uptoPattern = /(?:可至|可达|延至|至)\s*(\d{1,2})\s*天/g
  let uptoMatch: RegExpExecArray | null
  while ((uptoMatch = uptoPattern.exec(source)) !== null) {
    const day = Number.parseInt(uptoMatch[1], 10)
    if (day >= 1 && day <= 30) dayValues.push(day)
  }

  if (dayValues.length) {
    const min = Math.min(...dayValues)
    const max = Math.max(...dayValues)
    if (min >= 1 && max >= min && max <= 30) return { min, max }
  }

  const singleMatch = source.match(/(\d{1,2})\s*天/)
  if (singleMatch) {
    const day = Number.parseInt(singleMatch[1], 10)
    if (day >= 1 && day <= 30) return { min: day, max: day }
  }

  return null
}

/** 双线段可视化用的刻度上限（留一点余量，避免顶满） */
export function resolveVaseLifeBarScale(min: number, max: number): number {
  return Math.min(30, Math.max(14, max + 2, min + 2))
}

/** 从「约 5—10 天」「7-14天」等文案解析瓶插观赏天数 */
export function parseVaseLifeDays(text: string): number[] {
  const source = String(text || '').trim()
  if (!source) return []

  const rangeMatch = source.match(/(\d{1,2})\s*[—\-~～]\s*(\d{1,2})\s*天/)
  if (rangeMatch) {
    const start = Number.parseInt(rangeMatch[1], 10)
    const end = Number.parseInt(rangeMatch[2], 10)
    const days: number[] = []
    for (let d = start; d <= end; d += 1) days.push(d)
    return days.filter((d) => d >= 1 && d <= 21)
  }

  const singleMatch = source.match(/(\d{1,2})\s*天/)
  if (singleMatch) {
    const day = Number.parseInt(singleMatch[1], 10)
    return day >= 1 && day <= 21 ? [day] : []
  }

  return []
}

export function resolveVaseLifeScale(text: string): number {
  const days = parseVaseLifeDays(text)
  if (!days.length) return 14
  return Math.min(21, Math.max(14, days[days.length - 1] + 2))
}

export const WIKI_VASE_DAY_LABELS = (max: number) =>
  Array.from({ length: max }, (_, index) => `${index + 1}`)
