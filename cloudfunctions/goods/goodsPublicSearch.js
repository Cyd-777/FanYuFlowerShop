/**
 * 顾客端商品搜索：分词 AND、多字段 haystack。
 */

function normalizeQueryText(text) {
  return String(text || '')
    .trim()
    .replace(/[\uFF10-\uFF19]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30))
    .replace(/[，,、；;！!？?]/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function tokenizeQuery(text) {
  const normalized = normalizeQueryText(text)
  if (!normalized) return []
  return normalized
    .split(/[\s,，、]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 1)
}

function normalizeGoodsQuery(input = {}) {
  const text = String(input.text || input.keyword || '').trim()
  let textTokens = Array.isArray(input.textTokens)
    ? input.textTokens.map((t) => normalizeQueryText(t)).filter(Boolean)
    : tokenizeQuery(text)

  if (!textTokens.length && text) {
    textTokens = [normalizeQueryText(text)]
  }

  return {
    text,
    textTokens,
    categoryId: String(input.categoryId || '').trim(),
    exactName: input.exactName === true,
    recommendOnly: input.recommendOnly === true,
    inStockOnly: input.inStockOnly === true,
    source: input.source || 'user',
  }
}

function buildGoodsHaystack(item) {
  return [
    item.name,
    item.description,
    item.categoryName,
    item.flowerKindName,
    item.flowerVarietyName,
  ]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function matchPublicGoodsItem(item, query) {
  if (item.onSale === false) return false
  if (query.recommendOnly && !item.recommend) return false
  if (query.inStockOnly && item.stock <= 0) return false
  if (query.categoryId && item.categoryId !== query.categoryId) return false

  if (query.exactName) {
    const q = query.text.trim()
    if (!q) return true
    return String(item.name || '').trim() === q
  }

  if (!query.textTokens.length) return true

  const haystack = buildGoodsHaystack(item)
  return query.textTokens.every((token) => haystack.includes(token))
}

function filterPublicGoodsList(items, queryInput, baseFilter) {
  const query = normalizeGoodsQuery(queryInput)
  return items
    .filter((item) => {
      if (typeof baseFilter === 'function' && !baseFilter(item, query)) return false
      return matchPublicGoodsItem(item, query)
    })
    .sort((a, b) => b.sort - a.sort)
}

module.exports = {
  normalizeGoodsQuery,
  tokenizeQuery,
  buildGoodsHaystack,
  matchPublicGoodsItem,
  filterPublicGoodsList,
}
