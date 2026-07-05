/** 将长文拆成段落（支持空行分段；无空行时整段保留） */
export function splitWikiArticleParagraphs(text: string): string[] {
  const normalized = String(text || '')
    .replace(/\r\n/g, '\n')
    .trim()
  if (!normalized) return []
  if (normalized.includes('\n\n')) {
    return normalized
      .split(/\n\n+/)
      .map((part) => part.replace(/\n/g, '').trim())
      .filter(Boolean)
  }
  return [normalized]
}

export function asWikiArticleParagraphs(
  paragraphs: string[] | undefined,
  fallbackText?: string,
): string[] {
  const fromArray = (paragraphs || []).map((p) => String(p || '').trim()).filter(Boolean)
  if (fromArray.length) return fromArray
  return splitWikiArticleParagraphs(fallbackText || '')
}
