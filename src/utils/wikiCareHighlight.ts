export type WikiCareHighlightSegment =
  | { kind: 'text'; text: string }
  | { kind: 'value'; text: string }

/** 养护文案中的操作与数值（角度、长度、比例、常用剪法词） */
const CARE_VALUE_PATTERN =
  /斜剪(?:花茎)?\s*\d+\s*[—\-~～]\s*\d+\s*(?:cm|厘米)|斜剪(?:花茎)?\s*\d{1,3}\s*[°度]|修(?:去|短)?\s*\d+\s*[—\-~～]\s*\d+\s*(?:cm|厘米)|没入[^，,；;]*?\d+\s*[—\-~～]\s*\d+\s*(?:cm|厘米)|\d+\s*[—\-~～]\s*\d+\s*(?:cm|厘米)|\d+(?:\.\d+)?\s*(?:cm|厘米)|\d{1,3}\s*[°度]|\d{1,3}\s*%|\d+\s*\/\s*\d+|三分之一|二分之一|四分之一|三分之二|一半|十字剪|烫茎|劈茎/gi

export function splitWikiCareHighlightText(text: string): WikiCareHighlightSegment[] {
  const source = String(text || '')
  if (!source) return []

  const segments: WikiCareHighlightSegment[] = []
  let lastIndex = 0

  for (const match of source.matchAll(CARE_VALUE_PATTERN)) {
    const index = match.index ?? 0
    if (index > lastIndex) {
      segments.push({ kind: 'text', text: source.slice(lastIndex, index) })
    }
    segments.push({ kind: 'value', text: match[0] })
    lastIndex = index + match[0].length
  }

  if (lastIndex < source.length) {
    segments.push({ kind: 'text', text: source.slice(lastIndex) })
  }

  return segments.length ? segments : [{ kind: 'text', text: source }]
}
