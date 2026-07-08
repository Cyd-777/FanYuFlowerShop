const cloud = require('wx-server-sdk')
const { fetchAllDocs } = require('./common/db')
const { excludeWikiDocs } = require('./common/wikiExcluded')
const { pickWiki, normalizeWikiQuery, tokenizeQuery, filterAndSortWikiDocs, searchWikiDocs } = require('./wikiSchema')
const { ensureWikiReadReady } = require('./helpers')
const { ensureDefaultWikiIfEmpty } = require('./init')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

async function listWiki(keyword = '') {
  await ensureDefaultWikiIfEmpty()
  const data = await fetchAllDocs(db, 'flower_wiki')
  const query = normalizeWikiQuery({
    text: keyword,
    textTokens: tokenizeQuery(keyword),
    mode: 'list',
  })
  return filterAndSortWikiDocs(excludeWikiDocs(data), query)
}

async function searchWiki(queryInput = {}) {
  await ensureDefaultWikiIfEmpty()
  const query = normalizeWikiQuery(queryInput)
  const data = excludeWikiDocs(await fetchAllDocs(db, 'flower_wiki'))
  return searchWikiDocs(data, { ...queryInput, ...query })
}

async function getWikiById(id) {
  await ensureWikiReadReady()
  const { data } = await db.collection('flower_wiki').doc(id).get()
  if (!data || data.enabled === false) return null
  return pickWiki(data)
}

async function matchWiki(kindId = '', varietyId = '') {
  await ensureWikiReadReady()
  const kind = String(kindId).trim()
  const variety = String(varietyId).trim()
  if (!kind && !variety) return null

  const data = excludeWikiDocs(await fetchAllDocs(db, 'flower_wiki'))
  const enabled = data.filter((doc) => doc.enabled !== false)

  if (variety) {
    const byVariety = enabled.find((doc) => doc.varietyId === variety)
    if (byVariety) return pickWiki(byVariety)
  }

  if (kind) {
    const byKindOnly = enabled.find((doc) => doc.kindId === kind && !doc.varietyId)
    if (byKindOnly) return pickWiki(byKindOnly)
    const byKindAny = enabled.find((doc) => doc.kindId === kind)
    if (byKindAny) return pickWiki(byKindAny)
  }

  return null
}

module.exports = {
  listWiki,
  searchWiki,
  getWikiById,
  matchWiki,
}
