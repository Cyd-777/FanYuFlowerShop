import {
  CLOUD_IMAGE_PROCESS_MODE,
  GOODS_IMAGE_FULL_RULE,
  GOODS_IMAGE_FULL_STYLE,
  GOODS_IMAGE_PREVIEW_RULE,
  GOODS_IMAGE_PREVIEW_STYLE,
} from '@/config/imageProcessing'

export type ImageClarityTier = 'preview' | 'full'

const RULE_BY_TIER: Record<ImageClarityTier, string> = {
  preview: GOODS_IMAGE_PREVIEW_RULE,
  full: GOODS_IMAGE_FULL_RULE,
}

const STYLE_BY_TIER: Record<ImageClarityTier, string> = {
  preview: GOODS_IMAGE_PREVIEW_STYLE,
  full: GOODS_IMAGE_FULL_STYLE,
}

function configuredStyles() {
  return [GOODS_IMAGE_PREVIEW_STYLE, GOODS_IMAGE_FULL_STYLE].filter(Boolean)
}

function stripImageMogr2Params(url: string): string {
  const qIndex = url.indexOf('?')
  if (qIndex === -1) return url

  const path = url.slice(0, qIndex)
  const query = url.slice(qIndex + 1)
  const kept = query
    .split('&')
    .map((part) => part.trim())
    .filter((part) => part && !part.startsWith('imageMogr2/'))

  return kept.length ? `${path}?${kept.join('&')}` : path
}

/** 去掉 URL 上已挂载的处理（样式名或 imageMogr2 参数） */
export function stripCloudImageStyle(url: string): string {
  if (!url || !/^https?:\/\//.test(url)) return url

  let result = stripImageMogr2Params(url.trim()).replace(/\/$/, '')

  for (const style of configuredStyles()) {
    const suffix = `/${style}`
    if (result.endsWith(suffix)) {
      result = result.slice(0, -suffix.length)
      break
    }
  }

  return result
}

function appendImageProcessRule(baseUrl: string, rule: string): string {
  const trimmed = (rule || '').trim()
  if (!trimmed) return baseUrl
  const separator = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}${separator}${trimmed}`
}

function applyStyleSuffix(baseUrl: string, tier: ImageClarityTier): string {
  const styleName = STYLE_BY_TIER[tier]
  if (!styleName) return baseUrl
  if (baseUrl.endsWith(`/${styleName}`)) return baseUrl
  return `${baseUrl.replace(/\/$/, '')}/${styleName}`
}

/** 同一 tempFileURL → preview / full 两档 HTTPS（默认 imageMogr2，无需控制台） */
export function applyCloudImageStyle(baseUrl: string, tier: ImageClarityTier): string {
  const trimmed = stripCloudImageStyle(baseUrl.trim())
  if (!trimmed || !/^https?:\/\//.test(trimmed)) return trimmed

  if (CLOUD_IMAGE_PROCESS_MODE === 'style') {
    return applyStyleSuffix(trimmed, tier)
  }

  return appendImageProcessRule(trimmed, RULE_BY_TIER[tier])
}

export function detectImageClarityTier(url: string): ImageClarityTier | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  if (CLOUD_IMAGE_PROCESS_MODE === 'style') {
    if (GOODS_IMAGE_FULL_STYLE && trimmed.endsWith(`/${GOODS_IMAGE_FULL_STYLE}`)) return 'full'
    if (GOODS_IMAGE_PREVIEW_STYLE && trimmed.endsWith(`/${GOODS_IMAGE_PREVIEW_STYLE}`)) return 'preview'
    return null
  }

  if (GOODS_IMAGE_PREVIEW_RULE && trimmed.includes(GOODS_IMAGE_PREVIEW_RULE.split('/')[0])) {
    if (trimmed.includes(GOODS_IMAGE_PREVIEW_RULE)) return 'preview'
  }
  if (!GOODS_IMAGE_FULL_RULE && !trimmed.includes('imageMogr2/')) return 'full'
  if (GOODS_IMAGE_FULL_RULE && trimmed.includes(GOODS_IMAGE_FULL_RULE)) return 'full'
  return null
}
