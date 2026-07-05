export interface WikiCareConditionItem {
  key: 'light' | 'airflow' | 'placement' | 'avoid'
  icon: string
  label: string
  text: string
}

export interface WikiCareDisplay {
  trimAngle: number | null
  trimNote: string
  trimPositionNote: string
  waterLevelRatio: number | null
  waterVaseRatioLabel: string
  waterSubmergeNote: string
  waterSubmergeCm: number | null
  waterDepthNote: string
  conditions: WikiCareConditionItem[]
}

function parseTrimAngle(text: string): number | null {
  const source = String(text || '').trim()
  const match = source.match(/(\d{1,3})\s*[°度]/)
  if (!match) return null
  const angle = Number.parseInt(match[1], 10)
  return angle > 0 && angle <= 90 ? angle : null
}

function parseWaterLevelRatio(text: string): number | null {
  const source = String(text || '').trim()
  if (!source) return null

  const fractionMatch = source.match(/(\d+)\s*\/\s*(\d+)/)
  if (fractionMatch) {
    const num = Number.parseInt(fractionMatch[1], 10)
    const den = Number.parseInt(fractionMatch[2], 10)
    if (num > 0 && den > 0) return Math.min(1, num / den)
  }

  if (/三分之一|1\/3|⅓/.test(source)) return 1 / 3
  if (/二分之一|一半|1\/2|½/.test(source)) return 0.5
  if (/四分之三|3\/4/.test(source)) return 0.75
  if (/三分之二|2\/3/.test(source)) return 2 / 3
  if (/较浅|浅水/.test(source)) return 0.25
  if (/较深|深水/.test(source)) return 0.6

  const percentMatch = source.match(/(\d{1,3})\s*%/)
  if (percentMatch) {
    const percent = Number.parseInt(percentMatch[1], 10)
    if (percent > 0 && percent <= 100) return percent / 100
  }

  return null
}

function parseWaterSubmergeCm(text: string): number | null {
  const source = String(text || '').trim()
  const match = source.match(/(?:没入|浸入|没过)[^，,；;]*?(\d+\s*[—\-~～]\s*\d+|\d+)\s*(?:cm|厘米)/i)
  if (!match) return null
  const range = match[1].match(/(\d+)\s*[—\-~～]\s*(\d+)/)
  if (range) {
    const start = Number.parseInt(range[1], 10)
    const end = Number.parseInt(range[2], 10)
    return Math.round((start + end) / 2)
  }
  const single = Number.parseInt(match[1], 10)
  return Number.isFinite(single) ? single : null
}

function splitWaterDepthParts(text: string): { vasePart: string; submergePart: string } {
  const source = String(text || '').trim()
  if (!source) return { vasePart: '', submergePart: '' }
  const parts = source.split(/[，,；;]/).map((part) => part.trim()).filter(Boolean)
  const submergePart =
    parts.find((part) => /没过|没入|浸入|切口|茎部/.test(part)) ||
    (/(没过|没入|浸入|切口)/.test(source) ? source : '')
  const vasePart =
    parts.find((part) => /花瓶|瓶高|\/|%|三分之一|二分之一|一半/.test(part)) ||
    parts.find((part) => part !== submergePart) ||
    source
  return { vasePart, submergePart }
}

function resolveWaterSubmergeNote(submergePart: string, fallback: string): string {
  const text = String(submergePart || '').trim()
  if (text) return text
  if (/没过|没入|浸/.test(fallback)) {
    const match = fallback.match(/[^，,；;]*(?:没过|没入|浸入)[^，,；;]*/)?.[0]
    if (match) return match.trim()
  }
  return '没过茎部切口即可'
}

function pickUnique(items: WikiCareConditionItem[]): WikiCareConditionItem[] {
  const seen = new Set<string>()
  const out: WikiCareConditionItem[] = []
  for (const item of items) {
    const key = `${item.key}:${item.text}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

function splitEnvironmentParts(text: string): string[] {
  return String(text || '')
    .split(/[，,；;。]/)
    .map((part) => part.trim())
    .filter(Boolean)
}

/** 从 environment / careGuide 文案拆出图标化养护条件 */
export function buildWikiCareConditions(input: {
  environment?: string | import('@/types/wiki').WikiCareEnvironment
  light?: string
}): WikiCareConditionItem[] {
  const items: WikiCareConditionItem[] = []
  const env =
    typeof input.environment === 'string' || !input.environment
      ? { placement: String(input.environment || '').trim() }
      : input.environment
  const envParts = splitEnvironmentParts(
    [env.light, env.airflow, env.placement].filter(Boolean).join('，'),
  )
  const lightFallback = String(input.light || env.light || '').trim()

  for (const part of envParts) {
    if (/光|晒|阴|照/.test(part)) {
      items.push({ key: 'light', icon: '☀️', label: '喜光', text: part })
      continue
    }
    if (/通风|透气|空气流通/.test(part)) {
      items.push({ key: 'airflow', icon: '🌬️', label: '通风', text: part })
      continue
    }
    if (/风口|空调|暖气|摆放|放置|远离|避开|直射|暴晒|触碰|挤压|阴凉|凉爽/.test(part)) {
      items.push({ key: 'placement', icon: '📍', label: '摆放', text: part })
    }
  }

  if (!items.some((item) => item.key === 'light') && lightFallback) {
    items.unshift({ key: 'light', icon: '☀️', label: '喜光', text: lightFallback })
  }

  if (!items.some((item) => item.key === 'airflow')) {
    const airflowPart =
      env.airflow ||
      envParts.find((part) => /通风|透气|风口|空调|暖气/.test(part))
    if (airflowPart) {
      items.push({ key: 'airflow', icon: '🌬️', label: '通风', text: airflowPart })
    }
  }

  if (!items.some((item) => item.key === 'placement')) {
    const placementPart =
      env.placement ||
      envParts.find((part) =>
        /风口|空调|暖气|摆放|放置|远离|避开|直射|暴晒|触碰|挤压|阴凉|凉爽/.test(part),
      )
    if (placementPart) {
      items.push({ key: 'placement', icon: '📍', label: '摆放', text: placementPart })
    }
  }

  for (const avoid of env.avoid || []) {
    const text = String(avoid || '').trim()
    if (!text) continue
    items.push({ key: 'avoid', icon: '🚫', label: '避免', text })
  }

  return pickUnique(items)
}

function resolveTrimPositionNote(input: {
  trimPosition?: string
  trim?: string
  waterDepth?: string
  tips?: string[]
}): string {
  const explicit = String(input.trimPosition || '').trim()
  if (explicit) return explicit

  const parts: string[] = []
  const trimText = String(input.trim || '').trim()
  const cmMatch = trimText.match(/(\d+\s*[—\-~～]\s*\d+|\d+)\s*(?:cm|厘米)/i)
  if (cmMatch) {
    parts.push(`每次换水可在茎端下修 ${cmMatch[0]} 处`)
  }

  parts.push('切口保持在水面以上，确保吸水端新鲜')

  const leafTip = (input.tips || []).find((tip) => /浸水|没水|水下|水线|下部叶|下段叶/.test(tip))
  if (leafTip) {
    parts.push(leafTip.replace(/^[，,；;]/, ''))
  } else {
    parts.push('去除可能浸没在水中的下段叶片，保留花头附近健康叶')
  }

  const depthText = String(input.waterDepth || '').trim()
  if (/没过|浸|没入/.test(depthText)) {
    parts.push(depthText)
  }

  return parts.join('；')
}

export function resolveWikiCareDisplay(input: {
  trim?: string
  trimPosition?: string
  waterDepth?: string
  waterChange?: string
  environment?: string | import('@/types/wiki').WikiCareEnvironment
  light?: string
  tips?: string[]
}): WikiCareDisplay {
  const trimNote = String(input.trim || '').trim()
  const waterDepthNote =
    String(input.waterDepth || '').trim() ||
    (String(input.waterChange || '').match(/水深[^，,；;。]*/)?.[0] || '').trim()
  const fallbackNote = waterDepthNote || '水深约花瓶 1/3，没过茎部切口即可'
  const { vasePart, submergePart } = splitWaterDepthParts(fallbackNote)
  const waterLevelRatio = parseWaterLevelRatio(vasePart || fallbackNote)
  const waterSubmergeNote = resolveWaterSubmergeNote(submergePart, fallbackNote)
  const waterSubmergeCm = parseWaterSubmergeCm(submergePart || fallbackNote)

  return {
    trimAngle: parseTrimAngle(trimNote),
    trimNote,
    trimPositionNote: resolveTrimPositionNote(input),
    waterLevelRatio,
    waterVaseRatioLabel: formatWaterLevelLabel(waterLevelRatio) || '约 1/3 瓶高',
    waterSubmergeNote,
    waterSubmergeCm,
    waterDepthNote: fallbackNote,
    conditions: buildWikiCareConditions({
      environment: input.environment,
      light: input.light,
    }),
  }
}

export function formatWaterLevelLabel(ratio: number | null): string {
  if (ratio == null) return ''
  if (Math.abs(ratio - 1 / 3) < 0.05) return '约 1/3 瓶高'
  if (Math.abs(ratio - 0.5) < 0.05) return '约 1/2 瓶高'
  if (Math.abs(ratio - 2 / 3) < 0.05) return '约 2/3 瓶高'
  return `约 ${Math.round(ratio * 100)}% 瓶高`
}

export function formatWaterSubmergeLabel(note: string, cm: number | null): string {
  const text = String(note || '').trim()
  if (cm != null && cm > 0) return `没入切口约 ${cm} cm`
  if (text) return text
  return '没过茎部切口即可'
}
