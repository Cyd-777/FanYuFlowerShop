/**
 * 搜索口语归一化：全角数字、中文/大写数字 → 阿拉伯数字，供 merchantGoodsSearch 正则解析。
 */

const FULLWIDTH_DIGIT = /[\uFF10-\uFF19]/g

const CN_DIGIT: Record<string, number> = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  壹: 1,
  贰: 2,
  叁: 3,
  肆: 4,
  伍: 5,
  陆: 6,
  柒: 7,
  捌: 8,
  玖: 9,
}

const CN_UNIT: Record<string, number> = {
  十: 10,
  拾: 10,
  百: 100,
  佰: 100,
  千: 1000,
  仟: 1000,
  万: 10000,
}

const CN_NUMERAL_SPAN =
  /[零〇一二两三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾佰仟]{1,12}/g

function spanHasUnit(span: string) {
  return [...span].some((ch) => ch in CN_UNIT)
}

/** 全角 ０-９ → 半角 */
export function normalizeFullwidthDigits(text: string) {
  return text.replace(FULLWIDTH_DIGIT, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30))
}

/**
 * 解析中文数字串（含大写）：一百 → 100，壹佰贰拾 → 120，十 → 10
 */
export function parseChineseNumeral(text: string): number | null {
  const raw = text.replace(/两/g, '二').trim()
  if (!raw) return null
  if (![...raw].every((ch) => ch in CN_DIGIT || ch in CN_UNIT)) return null

  let total = 0
  let section = 0
  let number = 0

  for (const ch of raw) {
    if (ch in CN_DIGIT) {
      number = CN_DIGIT[ch]
      continue
    }
    const unit = CN_UNIT[ch]
    if (unit === 10) {
      section += (number || 1) * 10
      number = 0
    } else if (unit === 100) {
      section += (number || 1) * 100
      number = 0
    } else if (unit === 1000) {
      section += (number || 1) * 1000
      number = 0
    } else if (unit === 10000) {
      total += (section + number) * 10000
      section = 0
      number = 0
    }
  }

  return total + section + number
}

/** 避免把「百合」里的单字「百」误转成 100 */
export function shouldConvertChineseNumeralSpan(span: string) {
  if (/^[十拾]$/.test(span)) return true
  if (span.length >= 2 && spanHasUnit(span)) return true
  if (/^[零〇一二两三四五六七八九壹贰叁肆伍陆柒捌玖]{2,}$/.test(span)) return true
  return false
}

/** 将文本中的中文数字片段替换为阿拉伯数字 */
export function normalizeChineseNumeralsInText(text: string) {
  return text.replace(CN_NUMERAL_SPAN, (span) => {
    if (!shouldConvertChineseNumeralSpan(span)) return span
    const value = parseChineseNumeral(span)
    return value == null ? span : String(value)
  })
}

/** 搜索框入口：标点规整 + 全角/中文数字归一化 */
export function normalizeSearchQueryText(query: string) {
  return normalizeChineseNumeralsInText(normalizeFullwidthDigits(query))
    .trim()
    .replace(/[，,、；;！!]/g, ' ')
    .replace(/\s+/g, ' ')
}
