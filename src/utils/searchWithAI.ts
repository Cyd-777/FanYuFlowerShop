import { aiParseSearch } from '@/modules/ai'
import type { AISearchParseResult } from '@/modules/ai'

/**
 * Check if query is too short for AI parsing — ≤2 CJK characters or looks like
 * an exact name match (single token, no question words).
 */
function isShortCjkQuery(query: string): boolean {
  const cleaned = query.trim()
  // Count CJK Unified Ideographs (U+4E00–U+9FFF) plus common CJK punctuation
  const cjkChars = [...cleaned].filter(
    (ch) => /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/.test(ch),
  )
  if (cjkChars.length <= 2 && cjkChars.length === cleaned.replace(/\s/g, '').length) {
    return true
  }
  return false
}

/**
 * AI 增强搜索：先尝试 AI 解析口语查询，回退关键词搜索。
 *
 * 1. 简短 query（≤2 个中文字或精确名称）→ 跳过 AI，直接返回 `{ aiHandled: false }`
 * 2. 否则调用 `aiParseSearch(query)`
 * 3. 置信度 ≥ minConfidence（默认 0.6）→ 返回解析结果，调用方用其精确搜索
 * 4. 置信度不足或 AI 失败 → 返回 `{ aiHandled: false }`，调用方回退到现有搜索
 *
 * @param query 用户原始输入
 * @param options.minConfidence 最低置信度阈值（默认 0.6）
 */
export async function searchWithAI(
  query: string,
  options?: { minConfidence?: number },
): Promise<{ parsed: AISearchParseResult | null; aiHandled: boolean }> {
  const trimmed = (query || '').trim()
  if (!trimmed) {
    return { parsed: null, aiHandled: false }
  }

  // Short / exact-name queries skip AI
  if (isShortCjkQuery(trimmed)) {
    return { parsed: null, aiHandled: false }
  }

  const minConfidence = options?.minConfidence ?? 0.6

  try {
    const parsed = await aiParseSearch(trimmed)
    if (parsed && parsed.confidence >= minConfidence) {
      return { parsed, aiHandled: true }
    }
    return { parsed: parsed || null, aiHandled: false }
  } catch {
    // AI unavailability → silent fallback
    return { parsed: null, aiHandled: false }
  }
}
