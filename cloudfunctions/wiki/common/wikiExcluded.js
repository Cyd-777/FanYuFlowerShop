/** 智库不收录的「种类」名（非真实花材，多为早期演示/商品模板） */
const WIKI_EXCLUDED_KIND_NAMES = new Set(['混搭花束'])

function isExcludedWikiKind(kindName) {
  return WIKI_EXCLUDED_KIND_NAMES.has(String(kindName || '').trim())
}

function wikiEntryNameKey(kindName, varietyName) {
  const kind = String(kindName || '').trim()
  const variety = String(varietyName || '').trim()
  return `name:${kind}:${variety}`
}

function shouldPreferWikiDoc(candidate, current) {
  const sortDiff = (Number(candidate.sort) || 0) - (Number(current.sort) || 0)
  if (sortDiff !== 0) return sortDiff > 0

  const candidateHasIds = Boolean(
    candidate.kindId && (!String(candidate.varietyName || '').trim() || candidate.varietyId),
  )
  const currentHasIds = Boolean(
    current.kindId && (!String(current.varietyName || '').trim() || current.varietyId),
  )
  if (candidateHasIds !== currentHasIds) return candidateHasIds

  return false
}

function dedupeWikiDocs(docs) {
  if (!Array.isArray(docs)) return []

  const winners = new Map()
  for (const doc of docs) {
    const key = wikiEntryNameKey(doc.kindName, doc.varietyName)
    const prev = winners.get(key)
    if (!prev || shouldPreferWikiDoc(doc, prev)) {
      winners.set(key, doc)
    }
  }

  const seen = new Set()
  const out = []
  for (const doc of docs) {
    const key = wikiEntryNameKey(doc.kindName, doc.varietyName)
    if (seen.has(key)) continue
    seen.add(key)
    const winner = winners.get(key)
    if (winner) out.push(winner)
  }
  return out
}

function excludeWikiDocs(docs) {
  if (!Array.isArray(docs)) return []
  return dedupeWikiDocs(docs.filter((doc) => !isExcludedWikiKind(doc.kindName)))
}

module.exports = {
  WIKI_EXCLUDED_KIND_NAMES,
  isExcludedWikiKind,
  wikiEntryNameKey,
  dedupeWikiDocs,
  excludeWikiDocs,
}
