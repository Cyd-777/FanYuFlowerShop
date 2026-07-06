/**
 * 外部数据源预填充 — 维基百科摘要 + GBIF 物种检索
 * 经云函数代理，避免小程序 request 合法域名限制。
 */
const FETCH_TIMEOUT_MS = 9000

async function fetchJson(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'FanYuFlowerShop/1.0' },
    })
    if (!res.ok) return null
    return await res.json()
  } catch (err) {
    console.warn('[externalPrefill] fetch failed:', url, err.message || err)
    return null
  } finally {
    clearTimeout(timer)
  }
}

function encodeWikiTitle(title) {
  return encodeURIComponent(String(title || '').trim().replace(/\s+/g, '_'))
}

async function fetchWikipediaSummary(query) {
  const q = String(query || '').trim()
  if (!q) return null

  const candidates = [q]
  if (q.includes(' ')) candidates.push(q.replace(/\s+/g, ''))

  for (const title of candidates) {
    const url = `https://zh.wikipedia.org/api/rest_v1/page/summary/${encodeWikiTitle(title)}`
    const data = await fetchJson(url)
    if (!data || data.type === 'disambiguation' || data.type === 'https') continue
    const extract = String(data.extract || data.description || '').trim()
    if (!extract) continue
    return {
      source: 'wikipedia',
      title: String(data.title || title).trim(),
      extract,
      thumbnail: String(data.thumbnail?.source || '').trim(),
      pageUrl: String(data.content_urls?.desktop?.page || '').trim(),
    }
  }
  return null
}

async function fetchGbifSpecies(query) {
  const q = String(query || '').trim()
  if (!q) return null

  const url = `https://api.gbif.org/v1/species/search?q=${encodeURIComponent(q)}&limit=5`
  const data = await fetchJson(url)
  const results = Array.isArray(data?.results) ? data.results : []
  if (!results.length) return null

  const pick =
    results.find((item) => item.rank === 'SPECIES' || item.rank === 'SUBSPECIES') || results[0]

  const vernacular = Array.isArray(pick.vernacularNames) ? pick.vernacularNames : []
  const zhNames = vernacular
    .filter((item) => String(item.language || '').toLowerCase().startsWith('zh'))
    .map((item) => String(item.vernacularName || '').trim())
    .filter(Boolean)

  const kingdom = pick.kingdom || ''
  const phylum = pick.phylum || ''
  const className = pick.class || ''
  const order = pick.order || ''
  const family = pick.family || ''
  const genus = pick.genus || ''
  const species = pick.species || ''

  return {
    source: 'gbif',
    scientificName: String(pick.canonicalName || pick.scientificName || '').trim(),
    rank: String(pick.rank || '').trim(),
    kingdom,
    phylum,
    class: className,
    order,
    family,
    genus,
    species,
    taxonomyLine: [kingdom, phylum, className, order, family, genus, species]
      .filter(Boolean)
      .join(' · '),
    vernacularNames: [...new Set(zhNames.length ? zhNames : vernacular.map((v) => v.vernacularName).filter(Boolean))],
    gbifKey: pick.key,
  }
}

function buildSuggestions({ query, wikipedia, gbif }) {
  const suggestions = []

  if (gbif?.scientificName) {
    suggestions.push({
      field: 'scientificName',
      label: '学名',
      value: gbif.scientificName,
      source: 'gbif',
      confidence: 'high',
    })
  }

  if (gbif?.vernacularNames?.length) {
    suggestions.push({
      field: 'commonNamesText',
      label: '俗名',
      value: gbif.vernacularNames.slice(0, 8).join('，'),
      source: 'gbif',
      confidence: 'medium',
    })
  }

  if (gbif?.taxonomyLine) {
    suggestions.push({
      field: 'taxonomyHint',
      label: '分类学（参考）',
      value: gbif.taxonomyLine,
      source: 'gbif',
      confidence: 'medium',
    })
  }

  if (wikipedia?.extract) {
    suggestions.push({
      field: 'namingNote',
      label: '介绍摘要',
      value: wikipedia.extract,
      source: 'wikipedia',
      confidence: 'medium',
    })
  }

  if (wikipedia?.title && wikipedia.title !== query) {
    suggestions.push({
      field: 'aliasesText',
      label: '别名',
      value: wikipedia.title,
      source: 'wikipedia',
      confidence: 'low',
    })
  }

  if (wikipedia?.thumbnail) {
    suggestions.push({
      field: 'coverImageUrl',
      label: '封面图（链接）',
      value: wikipedia.thumbnail,
      source: 'wikipedia',
      confidence: 'low',
    })
  }

  return suggestions
}

async function externalPrefill(queryInput = {}) {
  const query = String(queryInput.query || queryInput.kindName || queryInput.varietyName || '')
    .trim()
  if (!query) {
    return { success: false, errMsg: '请输入品种名或检索词' }
  }

  const [wikipedia, gbif] = await Promise.all([
    fetchWikipediaSummary(query),
    fetchGbifSpecies(query),
  ])

  if (!wikipedia && !gbif) {
    return {
      success: true,
      query,
      wikipedia: null,
      gbif: null,
      suggestions: [],
      errMsg: '未找到可用的外部数据，可改搜学名或英文名',
    }
  }

  const suggestions = buildSuggestions({ query, wikipedia, gbif })

  return {
    success: true,
    query,
    wikipedia,
    gbif,
    suggestions,
  }
}

module.exports = {
  externalPrefill,
}
