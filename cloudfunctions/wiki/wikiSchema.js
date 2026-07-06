/**
 * 智库 2.0 数据结构：归一化、空模板、可搜索正文、查询匹配。
 * 旧库文档无新字段时在此补默认空结构；展示层可再回退 careGuide / atlas.bloomSeason。
 */

const {
  WIKI_QUERY_STOPWORDS,
  INTENT_PHRASES,
  BLOOM_DISAMBIGUATION,
  INTENT_LABELS,
} = require('./wikiLexicon')
const { getKindProfile } = require('./wikiKindProfiles')
const {
  getVarietyArticle,
  mergeVarietyArticleIntoDraft,
  careEnvironmentText,
} = require('./wikiVarietyArticles')
const {
  pickAtlasSection,
  pickBloomSection,
  pickCareVaseSection,
  pickLanguageSection,
} = require('./wikiCarePick')
const { isRoseKind, applyRoseCareToDraft } = require('./wikiRoseCare')
const { canonicalizeVarietyIdentity } = require('./common/flowerCatalogMerge')

const SEARCH_VERSION = 1

const CUSTOMER_KEYWORD_SEEDS = [
  '能养几天',
  '能开多久',
  '怎么养',
  '怎么换水',
  '换水',
  '瓶插',
  '水养',
]

function emptyCareVase() {
  return {}
}

function emptyCareSoil() {
  return {}
}

function emptyBloom() {
  return {
    vase: '',
    vaseNote: '',
    soil: '',
    soilNote: '',
  }
}

function emptySearchIndex() {
  return {
    keywords: [],
    aliases: [],
    tags: [],
    searchText: '',
    occasions: [],
    seasonMonths: [],
    restockHints: [],
    searchVersion: SEARCH_VERSION,
  }
}

function asStringArray(value) {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item).trim()).filter(Boolean)
}

function asNumberArray(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => Number(item))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 12)
}

function normalizePlantForm(value) {
  if (value === 'potted' || value === 'both') return value
  return 'cut'
}

function pickCareVase(doc, profile, varietyArticle) {
  const raw = doc.careVase && typeof doc.careVase === 'object' ? doc.careVase : {}
  const baseProfile = profile?.careVase && typeof profile.careVase === 'object' ? profile.careVase : {}
  const baseArticle =
    varietyArticle?.careVase && typeof varietyArticle.careVase === 'object'
      ? varietyArticle.careVase
      : {}
  return pickCareVaseSection(raw, pickCareVaseSection(baseArticle, baseProfile))
}

function pickCareSoil(doc, profile) {
  const raw = doc.careSoil && typeof doc.careSoil === 'object' ? doc.careSoil : {}
  const base = profile?.careSoil && typeof profile.careSoil === 'object' ? profile.careSoil : {}
  return {
    summary: base.summary || raw.summary || '',
    light: base.light || raw.light || '',
    water: base.water || raw.water || '',
    soil: base.soil || raw.soil || '',
    temperature: base.temperature || raw.temperature || '',
    tips: asStringArray(base.tips?.length ? base.tips : raw.tips),
  }
}

function pickBloom(doc, profile, varietyArticle) {
  const raw = doc.bloom && typeof doc.bloom === 'object' ? doc.bloom : {}
  const atlas = doc.atlas && typeof doc.atlas === 'object' ? doc.atlas : {}
  const baseProfile = profile?.bloom && typeof profile.bloom === 'object' ? profile.bloom : {}
  const profileAtlas = profile?.atlas && typeof profile.atlas === 'object' ? profile.atlas : {}
  const baseArticle =
    varietyArticle?.bloom && typeof varietyArticle.bloom === 'object' ? varietyArticle.bloom : {}
  const merged = pickBloomSection(raw, pickBloomSection(baseArticle, baseProfile))
  return {
    ...merged,
    /** 未迁移时 atlas.bloomSeason 可能是混写，仅作 soil 回退 */
    _legacyBloomSeason: profileAtlas.bloomSeason || atlas.bloomSeason || '',
  }
}

function pickAtlas(doc, profile, varietyArticle) {
  const raw = doc.atlas && typeof doc.atlas === 'object' ? doc.atlas : {}
  const baseProfile = profile?.atlas && typeof profile.atlas === 'object' ? profile.atlas : {}
  const baseArticle =
    varietyArticle?.atlas && typeof varietyArticle.atlas === 'object' ? varietyArticle.atlas : {}
  const out = pickAtlasSection(raw, pickAtlasSection(baseArticle, baseProfile))
  if (raw.intro && typeof raw.intro === 'object') {
    out.intro = raw.intro
  }
  const featureRefs = asStringArray(raw.featureRefs)
  if (featureRefs.length) out.featureRefs = featureRefs
  return out
}

function pickCareGuide(doc, profile) {
  const raw = doc.careGuide && typeof doc.careGuide === 'object' ? doc.careGuide : {}
  const base = profile?.careGuide && typeof profile.careGuide === 'object' ? profile.careGuide : {}
  return {
    summary: base.summary || raw.summary || '',
    light: base.light || raw.light || '',
    water: base.water || raw.water || '',
    soil: base.soil || raw.soil || '',
    temperature: base.temperature || raw.temperature || '',
    tips: asStringArray(base.tips?.length ? base.tips : raw.tips),
  }
}

function pickLanguage(doc, profile, varietyName, varietyArticle) {
  const raw = doc.language && typeof doc.language === 'object' ? doc.language : {}
  const baseProfile = profile?.language && typeof profile.language === 'object' ? profile.language : {}
  const baseArticle =
    varietyArticle?.language && typeof varietyArticle.language === 'object'
      ? varietyArticle.language
      : {}
  const merged = pickLanguageSection(raw, pickLanguageSection(baseArticle, baseProfile))
  let meaning = merged.meaning
  const name = String(varietyName || '').trim()
  if (!meaning) {
    for (const item of merged.colorMeanings || []) {
      const color = String(item?.color || '').trim()
      if (!color || !name.includes(color)) continue
      meaning = `${color}色：${item.meaning || ''}`.trim()
      break
    }
  }
  return { ...merged, meaning }
}

function pickTaxonomy(doc, profile) {
  const raw = doc.taxonomy && typeof doc.taxonomy === 'object' ? doc.taxonomy : {}
  const base = profile?.taxonomy && typeof profile.taxonomy === 'object' ? profile.taxonomy : {}
  return {
    kingdom: base.kingdom || raw.kingdom || '',
    phylum: base.phylum || raw.phylum || '',
    taxonomicClass:
      base.taxonomicClass || base.class || raw.taxonomicClass || raw.class || '',
    order: base.order || raw.order || '',
    family: base.family || raw.family || '',
    genus: base.genus || raw.genus || '',
  }
}

function pickNames(doc, profile, varietyName, varietyArticle) {
  const raw = doc.names && typeof doc.names === 'object' ? doc.names : {}
  const base = profile?.names && typeof profile.names === 'object' ? profile.names : {}
  const articleNames =
    varietyArticle?.names && typeof varietyArticle.names === 'object' ? varietyArticle.names : {}
  let commonNames = asStringArray(
    articleNames.commonNames?.length ? articleNames.commonNames : base.commonNames,
  )
  if (!commonNames.length) commonNames = asStringArray(raw.commonNames)
  const variety = String(varietyName || '').trim()
  if (variety && !commonNames.includes(variety)) {
    commonNames = [variety, ...commonNames]
  }
  return {
    scientificName: String(
      articleNames.scientificName || raw.scientificName || base.scientificName || '',
    ).trim(),
    commonNames,
  }
}

function mergeAliasesFromNames(aliases, names) {
  const merged = [...aliases]
  const seen = new Set(merged.map((item) => item.toLowerCase()))
  for (const name of names.commonNames || []) {
    const text = String(name || '').trim()
    if (!text) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(text)
  }
  return merged
}

function collectOccasions(doc, language) {
  const top = asStringArray(doc.occasions)
  if (top.length) return top
  return asStringArray(language.occasions)
}

function buildSearchText(wiki) {
  const parts = [
    wiki.kindName,
    wiki.varietyName,
    wiki.names?.scientificName,
    ...(wiki.names?.commonNames || []),
    wiki.taxonomy?.kingdom,
    wiki.taxonomy?.phylum,
    wiki.taxonomy?.taxonomicClass,
    wiki.taxonomy?.order,
    wiki.taxonomy?.family,
    wiki.taxonomy?.genus,
    ...wiki.aliases,
    ...wiki.keywords,
    ...wiki.tags,
    ...wiki.occasions,
    wiki.bloom.vase,
    wiki.bloom.vaseNote,
    wiki.bloom.soil,
    wiki.bloom.soilNote,
    wiki.careVase.summary,
    wiki.careVase.vaseLife,
    wiki.careVase.waterChange,
    wiki.careVase.trim,
    wiki.careVase.waterDepth,
    wiki.careVase.environment,
    careEnvironmentText(wiki.careVase.environment),
    wiki.careVase.additives,
    wiki.careVase.wakeUp?.summary,
    ...(wiki.careVase.wakeUp?.steps || []),
    wiki.careVase.emergency?.title,
    ...(wiki.careVase.emergency?.steps || []),
    ...(wiki.careVase.tips || []),
    wiki.careSoil.summary,
    wiki.careSoil.light,
    wiki.careSoil.water,
    wiki.careSoil.soil,
    wiki.careSoil.temperature,
    ...(wiki.careSoil.tips || []),
    wiki.atlas.summary,
    ...(wiki.atlas.paragraphs || []),
    ...(wiki.atlas.productionRegions || []),
    ...(wiki.atlas.distinguishFrom || []).map((item) => `${item.name}${item.difference}`),
    ...(wiki.atlas.features || []),
    wiki.atlas.origin,
    wiki.careGuide.summary,
    wiki.careGuide.light,
    wiki.careGuide.water,
    wiki.careGuide.soil,
    wiki.careGuide.temperature,
    ...(wiki.careGuide.tips || []),
    wiki.language.summary,
    ...(wiki.language.paragraphs || []),
    wiki.language.meaning,
    wiki.language.caution,
    ...(wiki.language.pairing || []).flatMap((item) => [
      item.style,
      ...(item.flowers || []),
      item.note,
    ]),
    ...(wiki.language.occasions || []),
    ...(wiki.language.colorMeanings || []).map((item) => `${item.color}${item.meaning}`),
    ...CUSTOMER_KEYWORD_SEEDS,
  ]
  return parts
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function pickWiki(doc) {
  const raw = doc && typeof doc === 'object' ? doc : {}
  const kindName = String(raw.kindName || '').trim()
  const rawVariety = String(raw.varietyName || '').trim()
  const identity = rawVariety
    ? canonicalizeVarietyIdentity(kindName, rawVariety, asStringArray(raw.aliases))
    : { varietyName: '', aliases: asStringArray(raw.aliases) }
  const normalizedDoc = {
    ...raw,
    varietyName: identity.varietyName,
    aliases: identity.aliases,
  }

  const kindProfile = getKindProfile(normalizedDoc.kindName || '')
  const varietyArticle = normalizedDoc.varietyName
    ? getVarietyArticle(normalizedDoc.kindName, normalizedDoc.varietyName)
    : null
  const atlas = pickAtlas(normalizedDoc, kindProfile, varietyArticle)
  const careGuide = pickCareGuide(normalizedDoc, kindProfile)
  const language = pickLanguage(
    normalizedDoc,
    kindProfile,
    normalizedDoc.varietyName,
    varietyArticle,
  )
  const careVase = pickCareVase(normalizedDoc, kindProfile, varietyArticle)
  const careSoil = pickCareSoil(normalizedDoc, kindProfile)
  const bloomRaw = pickBloom(normalizedDoc, kindProfile, varietyArticle)
  const bloom = {
    vase: bloomRaw.vase,
    vaseNote: bloomRaw.vaseNote,
    soil: bloomRaw.soil || bloomRaw._legacyBloomSeason,
    soilNote: bloomRaw.soilNote,
    vaseBySeason: bloomRaw.vaseBySeason || [],
  }

  const keywords = asStringArray(normalizedDoc.keywords)
  let aliases = asStringArray(normalizedDoc.aliases)
  const tags = asStringArray(normalizedDoc.tags)
  const occasions = collectOccasions(normalizedDoc, language)
  const seasonMonths = asNumberArray(normalizedDoc.seasonMonths)
  const restockHints = asStringArray(normalizedDoc.restockHints)
  const names = pickNames(normalizedDoc, kindProfile, normalizedDoc.varietyName, varietyArticle)
  aliases = mergeAliasesFromNames(aliases, names)

  const wiki = {
    _id: normalizedDoc._id,
    kindId: normalizedDoc.kindId || '',
    varietyId: normalizedDoc.varietyId || '',
    kindName: normalizedDoc.kindName || '',
    varietyName: normalizedDoc.varietyName || '',
    icon: normalizedDoc.icon || '🌷',
    coverImage: normalizedDoc.coverImage || '',
    plantForm: normalizePlantForm(normalizedDoc.plantForm),
    bloom,
    careVase,
    careSoil,
    atlas,
    taxonomy: pickTaxonomy(normalizedDoc, kindProfile),
    names,
    careGuide,
    language,
    keywords,
    aliases,
    tags,
    occasions,
    seasonMonths,
    restockHints,
    searchVersion: Number(normalizedDoc.searchVersion) || SEARCH_VERSION,
    enabled: normalizedDoc.enabled !== false,
    sort: Number(normalizedDoc.sort) || 0,
    searchText: String(normalizedDoc.searchText || '').trim(),
    careBaseRef: String(normalizedDoc.careBaseRef || '').trim(),
  }

  if (!wiki.searchText) {
    wiki.searchText = buildSearchText(wiki)
  }

  if (isRoseKind(wiki.kindName) && wiki.varietyName) {
    applyRoseCareToDraft(wiki, wiki.varietyName)
  }

  wiki.answerSlots = buildAnswerSlots(wiki)
  wiki.answerIntents = wiki.answerSlots.items.map((item) => item.intent)

  return wiki
}

function pickWikiListItem(doc) {
  const wiki = pickWiki(doc)
  const vaseLifePreview =
    wiki.bloom.vase ||
    wiki.careVase.vaseLife ||
    (wiki.careGuide.summary ? '' : '')

  return {
    _id: wiki._id,
    kindId: wiki.kindId,
    varietyId: wiki.varietyId,
    kindName: wiki.kindName,
    varietyName: wiki.varietyName,
    icon: wiki.icon,
    coverImage: wiki.coverImage,
    sort: wiki.sort,
    plantForm: wiki.plantForm,
    atlasPreview:
      (wiki.atlas.paragraphs || [])[0] || wiki.atlas.summary || wiki.bloom.vase || '',
    carePreview:
      wiki.careVase.wakeUp?.summary ||
      wiki.careVase.summary ||
      wiki.careVase.waterChange ||
      wiki.careGuide.summary ||
      '',
    languagePreview:
      (wiki.language.paragraphs || [])[0] ||
      wiki.language.summary ||
      wiki.language.meaning ||
      '',
    vaseLifePreview: vaseLifePreview ? `能开约 ${vaseLifePreview.replace(/^约\s*/, '')}` : '',
    aliases: wiki.aliases,
  }
}

function emptyWikiPayload() {
  const index = emptySearchIndex()
  return {
    plantForm: 'cut',
    bloom: emptyBloom(),
    careVase: emptyCareVase(),
    careSoil: emptyCareSoil(),
    keywords: index.keywords,
    aliases: index.aliases,
    tags: index.tags,
    searchText: index.searchText,
    occasions: index.occasions,
    seasonMonths: index.seasonMonths,
    restockHints: index.restockHints,
    searchVersion: index.searchVersion,
  }
}

function normalizeQueryText(text) {
  return String(text || '')
    .trim()
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

function normalizeWikiQuery(input = {}) {
  const text = String(input.text || '').trim()
  let textTokens = Array.isArray(input.textTokens)
    ? input.textTokens.map((t) => normalizeQueryText(t)).filter(Boolean)
    : tokenizeQuery(text)

  if (!textTokens.length && text) {
    textTokens = [normalizeQueryText(text)]
  }

  const tab = input.tab
  const validTab = tab === 'atlas' || tab === 'care' || tab === 'language' ? tab : undefined

  const mode = input.mode
  const validMode =
    mode === 'list' || mode === 'answer' || mode === 'auto' ? mode : 'auto'

  const intent = String(input.intent || '').trim()
  const validIntents = new Set([
    'vase_life',
    'soil_bloom',
    'how_to_care',
    'water_change',
    'trim',
    'environment',
    'origin',
    'features',
    'meaning',
    'occasions',
  ])

  return {
    text,
    textTokens,
    mode: validMode,
    intent: validIntents.has(intent) ? intent : undefined,
    subjectText: String(input.subjectText || '').trim(),
    tab: validTab,
    tags: asStringArray(input.tags),
    kindId: String(input.kindId || '').trim(),
    varietyId: String(input.varietyId || '').trim(),
    source: input.source || 'user',
  }
}

function haystackForTab(wiki, tab) {
  const base = wiki.searchText || buildSearchText(wiki)
  if (!tab) return base

  if (tab === 'atlas') {
    return [
      base,
      wiki.atlas.summary,
      ...(wiki.atlas.features || []),
      wiki.bloom.vase,
      wiki.bloom.soil,
      wiki.atlas.origin,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
  }

  if (tab === 'care') {
    return [
      base,
      wiki.careVase.summary,
      wiki.careVase.vaseLife,
      wiki.careVase.waterChange,
      wiki.careVase.trim,
      ...(wiki.careVase.tips || []),
      wiki.careSoil.summary,
      wiki.careSoil.water,
      wiki.careGuide.summary,
      wiki.careGuide.water,
      ...(wiki.careGuide.tips || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
  }

  return [
    base,
    wiki.language.summary,
    wiki.language.meaning,
    ...(wiki.language.occasions || []),
    ...(wiki.language.colorMeanings || []).map((item) => `${item.color}${item.meaning}`),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function matchWikiDoc(doc, query) {
  const wiki = pickWiki(doc)
  if (!wiki.enabled) return false

  if (query.kindId && wiki.kindId !== query.kindId) return false
  if (query.varietyId && wiki.varietyId !== query.varietyId) return false

  if (query.tags.length) {
    const tagSet = new Set(wiki.tags)
    if (!query.tags.every((tag) => tagSet.has(tag))) return false
  }

  if (!query.textTokens.length) return true

  const haystack = haystackForTab(wiki, query.tab)
  return query.textTokens.every((token) => haystack.includes(token))
}

function filterAndSortWikiDocs(docs, query) {
  return docs
    .filter((doc) => matchWikiDoc(doc, query))
    .map(pickWikiListItem)
    .sort((a, b) => b.sort - a.sort)
}

function anchorFromSourcePath(sourcePath) {
  if (!sourcePath) return ''
  const root = sourcePath.split('.')[0]
  if (root === 'bloom') return 'bloom'
  if (root === 'careVase' || root === 'careSoil' || root === 'careGuide') return root
  if (root === 'atlas') return 'atlas'
  if (root === 'language') return 'language'
  return root
}

function buildDetailUrl(wikiId, tab, sourcePath) {
  const anchor = anchorFromSourcePath(sourcePath)
  let url = `/pagesCustomer/wiki/detail?id=${encodeURIComponent(wikiId)}&tab=${tab || 'atlas'}`
  if (anchor) url += `&anchor=${encodeURIComponent(anchor)}`
  return url
}

function buildAnswerSlots(wiki) {
  const items = []

  const vaseText = wiki.bloom?.vase || wiki.careVase?.vaseLife
  if (vaseText) {
    items.push({
      intent: 'vase_life',
      text: vaseText,
      note: wiki.bloom?.vaseNote || wiki.careVase?.vaseLifeNote || '',
      sourcePath: wiki.bloom?.vase ? 'bloom.vase' : 'careVase.vaseLife',
      tab: 'atlas',
    })
  }

  const soilText = wiki.bloom?.soil || wiki.atlas?.bloomSeason
  if (soilText) {
    items.push({
      intent: 'soil_bloom',
      text: soilText,
      note: wiki.bloom?.soilNote || '',
      sourcePath: wiki.bloom?.soil ? 'bloom.soil' : 'atlas.bloomSeason',
      tab: 'atlas',
    })
  }

  const careSummary = wiki.careVase?.summary || wiki.careGuide?.summary
  if (careSummary) {
    items.push({
      intent: 'how_to_care',
      text: careSummary,
      sourcePath: wiki.careVase?.summary ? 'careVase.summary' : 'careGuide.summary',
      tab: 'care',
    })
  }

  if (wiki.careVase?.waterChange) {
    items.push({
      intent: 'water_change',
      text: wiki.careVase.waterChange,
      sourcePath: 'careVase.waterChange',
      tab: 'care',
    })
  }

  if (wiki.careVase?.trim) {
    items.push({
      intent: 'trim',
      text: wiki.careVase.trim,
      sourcePath: 'careVase.trim',
      tab: 'care',
    })
  }

  if (wiki.careVase?.environment) {
    items.push({
      intent: 'environment',
      text: careEnvironmentText(wiki.careVase.environment),
      sourcePath: 'careVase.environment',
      tab: 'care',
    })
  }

  if (wiki.atlas?.origin) {
    items.push({
      intent: 'origin',
      text: wiki.atlas.origin,
      sourcePath: 'atlas.origin',
      tab: 'atlas',
    })
  }

  if (wiki.atlas?.features?.length) {
    items.push({
      intent: 'features',
      text: wiki.atlas.features.join('、'),
      sourcePath: 'atlas.features',
      tab: 'atlas',
    })
  }

  if (wiki.language?.meaning) {
    items.push({
      intent: 'meaning',
      text: wiki.language.meaning,
      note: wiki.language.summary || '',
      sourcePath: 'language.meaning',
      tab: 'language',
    })
  }

  const occasions = wiki.occasions?.length
    ? wiki.occasions
    : wiki.language?.occasions || []
  if (occasions.length) {
    items.push({
      intent: 'occasions',
      text: occasions.join('、'),
      sourcePath: 'language.occasions',
      tab: 'language',
    })
  }

  return { items }
}

function stripWikiStopwords(text) {
  let result = String(text || '').trim()
  for (const word of WIKI_QUERY_STOPWORDS) {
    result = result.split(word).join(' ')
  }
  return result.replace(/\s+/g, ' ').trim()
}

function parseIntentFromText(text) {
  const raw = String(text || '').trim()
  const normalized = normalizeQueryText(raw)
  if (!normalized) return { intent: null, subjectText: '' }

  let intent = null
  let remaining = normalized

  const sortedEntries = [...INTENT_PHRASES].sort((a, b) => {
    const maxA = Math.max(...a.phrases.map((p) => p.length))
    const maxB = Math.max(...b.phrases.map((p) => p.length))
    return maxB - maxA
  })

  for (const entry of sortedEntries) {
    const phrases = [...entry.phrases].sort((a, b) => b.length - a.length)
    for (const phrase of phrases) {
      const p = normalizeQueryText(phrase)
      if (p && remaining.includes(p)) {
        intent = entry.intent
        remaining = remaining.replace(p, ' ').replace(/\s+/g, ' ').trim()
        break
      }
    }
    if (intent) break
  }

  if (!intent && remaining.includes(BLOOM_DISAMBIGUATION.trigger)) {
    const useSoil = BLOOM_DISAMBIGUATION.soilHints.some((hint) => raw.includes(hint))
    intent = useSoil ? BLOOM_DISAMBIGUATION.soilIntent : BLOOM_DISAMBIGUATION.defaultIntent
    remaining = remaining.replace(BLOOM_DISAMBIGUATION.trigger, ' ').replace(/\s+/g, ' ').trim()
  }

  const subjectText = stripWikiStopwords(remaining)
  return { intent, subjectText }
}

function scoreSubjectMatch(wiki, subjectText) {
  const subject = normalizeQueryText(subjectText)
  if (!subject) return 0

  const varietyName = normalizeQueryText(wiki.varietyName)
  const kindName = normalizeQueryText(wiki.kindName)
  const displayName = varietyName || kindName
  const aliases = (wiki.aliases || []).map((a) => normalizeQueryText(a))

  if (displayName && displayName === subject) return 100
  if (varietyName && subject.includes(varietyName)) return 90
  if (kindName && subject === kindName) return 85
  if (kindName && subject.includes(kindName)) return 80
  if (aliases.some((a) => a && (a === subject || subject.includes(a)))) return 75
  if (displayName && subject.includes(displayName)) return 70
  if (kindName && displayName.includes(subject) && subject.length >= 2) return 60

  const haystack = [
    kindName,
    varietyName,
    ...aliases,
    ...(wiki.keywords || []).map((k) => normalizeQueryText(k)),
  ]
    .filter(Boolean)
    .join(' ')

  if (haystack.includes(subject)) return 55
  return 0
}

function resolveWikiDocForSubject(docs, subjectText, query = {}) {
  const enabled = docs.filter((doc) => doc.enabled !== false)

  if (query.varietyId) {
    const byVariety = enabled.find((doc) => doc.varietyId === query.varietyId)
    if (byVariety) return { wiki: pickWiki(byVariety), confidence: 'high' }
  }

  if (query.kindId) {
    const kindOnly = enabled.find((doc) => doc.kindId === query.kindId && !doc.varietyId)
    if (kindOnly) return { wiki: pickWiki(kindOnly), confidence: 'high' }
    const byKind = enabled
      .filter((doc) => doc.kindId === query.kindId)
      .sort((a, b) => (Number(b.sort) || 0) - (Number(a.sort) || 0))[0]
    if (byKind) return { wiki: pickWiki(byKind), confidence: 'medium' }
  }

  const subject = stripWikiStopwords(subjectText)
  if (!subject) return { wiki: null, confidence: 'low' }

  let best = null
  let bestScore = 0
  for (const doc of enabled) {
    const wiki = pickWiki(doc)
    const score = scoreSubjectMatch(wiki, subject)
    if (score > bestScore) {
      bestScore = score
      best = wiki
    }
  }

  if (!best || bestScore < 55) return { wiki: null, confidence: 'low' }
  return {
    wiki: best,
    confidence: bestScore >= 85 ? 'high' : 'medium',
  }
}

function pickAnswerSlot(wiki, intent) {
  const slots = wiki.answerSlots || buildAnswerSlots(wiki)
  return slots.items.find((item) => item.intent === intent) || null
}

function buildAnswerSnippet(wiki, intent, slot, confidence = 'high', provenance = 'slot') {
  const subjectName = wiki.varietyName || wiki.kindName
  const intentLabel = INTENT_LABELS[intent] || intent
  return {
    type: 'snippet',
    title: `${subjectName} · ${intentLabel}`,
    answer: slot.text,
    note: slot.note || undefined,
    intent,
    subject: {
      kindId: wiki.kindId,
      varietyId: wiki.varietyId || undefined,
      kindName: wiki.kindName,
      varietyName: wiki.varietyName || undefined,
      wikiId: wiki._id,
    },
    detailUrl: buildDetailUrl(wiki._id, slot.tab, slot.sourcePath),
    provenance,
    confidence,
  }
}

function tryBuildWikiAnswer(docs, queryInput) {
  const query = normalizeWikiQuery(queryInput)
  const mode = query.mode || 'list'
  if (mode !== 'answer' && mode !== 'auto') return null

  let intent = query.intent || null
  let subjectText = query.subjectText || ''

  if (!intent && query.text) {
    const parsed = parseIntentFromText(query.text)
    intent = parsed.intent
    if (!subjectText) subjectText = parsed.subjectText
  }

  if (!intent) return null

  if (!subjectText && query.text) {
    const parsed = parseIntentFromText(query.text)
    subjectText = parsed.subjectText
  }

  const resolved = resolveWikiDocForSubject(docs, subjectText, query)
  if (!resolved.wiki) return null

  const slot = pickAnswerSlot(resolved.wiki, intent)
  if (!slot || !slot.text) return null

  return buildAnswerSnippet(
    resolved.wiki,
    intent,
    slot,
    resolved.confidence,
    'slot',
  )
}

function searchWikiDocs(docs, queryInput = {}) {
  const query = normalizeWikiQuery(queryInput)
  const list = filterAndSortWikiDocs(docs, query)
  const answer = tryBuildWikiAnswer(docs, queryInput)
  return { list, answer }
}

/** 商家端词条编辑 → 云库 patch（合并现有 doc，并重算 searchText） */
function buildMerchantWikiPatch(wikiInput = {}, existingDoc = {}) {
  const patch = {}

  if (wikiInput.kindName !== undefined) patch.kindName = String(wikiInput.kindName || '').trim()
  if (wikiInput.varietyName !== undefined) {
    patch.varietyName = String(wikiInput.varietyName || '').trim()
  }
  if (wikiInput.icon !== undefined) patch.icon = String(wikiInput.icon || '🌷').trim() || '🌷'
  if (wikiInput.enabled !== undefined) patch.enabled = wikiInput.enabled !== false
  if (wikiInput.sort !== undefined) patch.sort = Number(wikiInput.sort) || 0
  if (wikiInput.plantForm !== undefined) patch.plantForm = normalizePlantForm(wikiInput.plantForm)

  if (wikiInput.aliases !== undefined) patch.aliases = asStringArray(wikiInput.aliases)
  if (wikiInput.tags !== undefined) patch.tags = asStringArray(wikiInput.tags)
  if (wikiInput.keywords !== undefined) patch.keywords = asStringArray(wikiInput.keywords)
  if (wikiInput.occasions !== undefined) patch.occasions = asStringArray(wikiInput.occasions)

  if (wikiInput.careBaseRef !== undefined) {
    patch.careBaseRef = String(wikiInput.careBaseRef || '').trim()
  }

  if (wikiInput.bloom !== undefined) {
    const b = wikiInput.bloom && typeof wikiInput.bloom === 'object' ? wikiInput.bloom : {}
    const prev = existingDoc.bloom && typeof existingDoc.bloom === 'object' ? existingDoc.bloom : {}
    patch.bloom = {
      ...prev,
      vase: b.vase !== undefined ? String(b.vase || '').trim() : prev.vase || '',
      vaseNote: b.vaseNote !== undefined ? String(b.vaseNote || '').trim() : prev.vaseNote || '',
      soil: b.soil !== undefined ? String(b.soil || '').trim() : prev.soil || '',
      soilNote: b.soilNote !== undefined ? String(b.soilNote || '').trim() : prev.soilNote || '',
    }
  }

  if (wikiInput.atlas !== undefined) {
    const a = wikiInput.atlas && typeof wikiInput.atlas === 'object' ? wikiInput.atlas : {}
    const prev = existingDoc.atlas && typeof existingDoc.atlas === 'object' ? existingDoc.atlas : {}
    const distinguishFrom = (a.distinguishFrom !== undefined ? a.distinguishFrom : prev.distinguishFrom || [])
      .map((item) => ({
        name: String(item?.name || '').trim(),
        difference: String(item?.difference || '').trim(),
      }))
      .filter((item) => item.name && item.difference)
    const cultivarRaw = a.cultivar !== undefined ? a.cultivar : prev.cultivar || {}
    patch.atlas = {
      ...prev,
      summary: a.summary !== undefined ? String(a.summary || '').trim() : prev.summary || '',
      paragraphs: a.paragraphs !== undefined ? asStringArray(a.paragraphs) : asStringArray(prev.paragraphs),
      features: a.features !== undefined ? asStringArray(a.features) : asStringArray(prev.features),
      origin: a.origin !== undefined ? String(a.origin || '').trim() : prev.origin || '',
      featureRefs: a.featureRefs !== undefined ? asStringArray(a.featureRefs) : asStringArray(prev.featureRefs),
      distinguishFrom,
      cultivar: {
        horticulturalGroup: String(cultivarRaw.horticulturalGroup || '').trim(),
        breeder: String(cultivarRaw.breeder || '').trim(),
        introducedYear: String(cultivarRaw.introducedYear || '').trim(),
        namingNote: String(cultivarRaw.namingNote || '').trim(),
      },
    }
    if (a.intro !== undefined && a.intro && typeof a.intro === 'object') {
      patch.atlas.intro = a.intro
    } else if (prev.intro) {
      patch.atlas.intro = prev.intro
    }
  }

  if (wikiInput.language !== undefined) {
    const l = wikiInput.language && typeof wikiInput.language === 'object' ? wikiInput.language : {}
    const prev =
      existingDoc.language && typeof existingDoc.language === 'object' ? existingDoc.language : {}
    const pairing = (l.pairing !== undefined ? l.pairing : prev.pairing || [])
      .map((item) => ({
        style: String(item?.style || '').trim(),
        flowers: asStringArray(item?.flowers),
        note: String(item?.note || '').trim(),
      }))
      .filter((item) => item.style || item.flowers.length)
    patch.language = {
      ...prev,
      meaning: l.meaning !== undefined ? String(l.meaning || '').trim() : prev.meaning || '',
      summary: l.summary !== undefined ? String(l.summary || '').trim() : prev.summary || '',
      paragraphs:
        l.paragraphs !== undefined ? asStringArray(l.paragraphs) : asStringArray(prev.paragraphs),
      caution: l.caution !== undefined ? String(l.caution || '').trim() : prev.caution || '',
      occasions: l.occasions !== undefined ? asStringArray(l.occasions) : asStringArray(prev.occasions),
      colorMeanings: Array.isArray(l.colorMeanings) ? l.colorMeanings : prev.colorMeanings || [],
      pairing,
    }
  }

  if (wikiInput.careVase !== undefined) {
    const c = wikiInput.careVase && typeof wikiInput.careVase === 'object' ? wikiInput.careVase : {}
    const prev =
      existingDoc.careVase && typeof existingDoc.careVase === 'object' ? existingDoc.careVase : {}
    patch.careVase = {
      ...prev,
      summary: c.summary !== undefined ? String(c.summary || '').trim() : prev.summary || '',
      waterChange: c.waterChange !== undefined ? String(c.waterChange || '').trim() : prev.waterChange || '',
      trim: c.trim !== undefined ? String(c.trim || '').trim() : prev.trim || '',
      waterDepth: c.waterDepth !== undefined ? String(c.waterDepth || '').trim() : prev.waterDepth || '',
      additives: c.additives !== undefined ? String(c.additives || '').trim() : prev.additives || '',
      tips: c.tips !== undefined ? asStringArray(c.tips) : asStringArray(prev.tips),
    }
  }

  if (wikiInput.names !== undefined) {
    const n = wikiInput.names && typeof wikiInput.names === 'object' ? wikiInput.names : {}
    const prev = existingDoc.names && typeof existingDoc.names === 'object' ? existingDoc.names : {}
    patch.names = {
      ...prev,
      scientificName:
        n.scientificName !== undefined
          ? String(n.scientificName || '').trim()
          : prev.scientificName || '',
      commonNames:
        n.commonNames !== undefined ? asStringArray(n.commonNames) : asStringArray(prev.commonNames),
    }
  }

  const mergedDoc = { ...existingDoc, ...patch }
  const wiki = pickWiki(mergedDoc)
  patch.searchText = buildSearchText(wiki)
  patch.searchVersion = SEARCH_VERSION

  return patch
}

module.exports = {
  SEARCH_VERSION,
  emptyWikiPayload,
  emptyCareVase,
  emptyCareSoil,
  emptyBloom,
  pickWiki,
  pickWikiListItem,
  buildMerchantWikiPatch,
  buildSearchText,
  normalizeWikiQuery,
  tokenizeQuery,
  filterAndSortWikiDocs,
  buildAnswerSlots,
  parseIntentFromText,
  resolveWikiDocForSubject,
  tryBuildWikiAnswer,
  searchWikiDocs,
}
