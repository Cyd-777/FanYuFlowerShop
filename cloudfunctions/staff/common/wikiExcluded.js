/** 智库不收录的「种类」名（非真实花材，多为早期演示/商品模板） */
const WIKI_EXCLUDED_KIND_NAMES = new Set(['混搭花束'])

function isExcludedWikiKind(kindName) {
  return WIKI_EXCLUDED_KIND_NAMES.has(String(kindName || '').trim())
}

function excludeWikiDocs(docs) {
  if (!Array.isArray(docs)) return []
  return docs.filter((doc) => !isExcludedWikiKind(doc.kindName))
}

module.exports = {
  WIKI_EXCLUDED_KIND_NAMES,
  isExcludedWikiKind,
  excludeWikiDocs,
}
