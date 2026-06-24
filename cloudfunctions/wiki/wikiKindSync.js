/**
 * 按品类 profile 批量写回 flower_wiki，修正库内错误正文并补全缺失词条。
 */

const { bumpCacheModule } = require('./common/cacheMeta')
const { isExcludedWikiKind } = require('./common/wikiExcluded')
const { fetchAllDocs } = require('./common/db')
const { getKindProfile, WIKI_KIND_PROFILES } = require('./wikiKindProfiles')
const { buildSearchText, emptyWikiPayload } = require('./wikiSchema')

const PROFILE_SYNC_VERSION = 1

function asStringArray(value) {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item).trim()).filter(Boolean)
}

function cloneObject(value) {
  if (!value || typeof value !== 'object') return {}
  return JSON.parse(JSON.stringify(value))
}

function mergeNames(profile, varietyName) {
  const base = profile?.names && typeof profile.names === 'object' ? profile.names : {}
  let commonNames = asStringArray(base.commonNames)
  const variety = String(varietyName || '').trim()
  if (variety && !commonNames.includes(variety)) {
    commonNames = [variety, ...commonNames]
  }
  return {
    scientificName: String(base.scientificName || '').trim(),
    commonNames,
  }
}

function mergeAliases(existingAliases, names) {
  const merged = [...asStringArray(existingAliases)]
  const seen = new Set(merged.map((item) => item.toLowerCase()))
  for (const name of names.commonNames || []) {
    const text = String(name || '').trim()
    if (!text) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(text)
  }
  const scientific = String(names.scientificName || '').trim()
  if (scientific) {
    const key = scientific.toLowerCase()
    if (!seen.has(key)) merged.push(scientific)
  }
  return merged
}

function buildVarietyLanguage(profile, varietyName, varietyDesc) {
  const lang = cloneObject(profile.language)
  const name = String(varietyName || '').trim()
  const desc = String(varietyDesc || '').trim()

  for (const item of profile.language?.colorMeanings || []) {
    const color = String(item?.color || '').trim()
    if (!color || !name.includes(color)) continue
    lang.meaning = `${color}色：${item.meaning || ''}`.trim()
    if (desc) lang.summary = desc
    return lang
  }

  if (desc) {
    lang.summary = desc
  }
  return lang
}

function buildBloomFromProfile(profile) {
  const bloom = profile?.bloom && typeof profile.bloom === 'object' ? profile.bloom : {}
  return {
    vase: String(bloom.vase || '').trim(),
    vaseNote: String(bloom.vaseNote || '').trim(),
    soil: String(bloom.soil || profile?.atlas?.bloomSeason || '').trim(),
    soilNote: String(bloom.soilNote || '').trim(),
  }
}

function buildWikiProfilePatch(doc, profile, varietyDoc) {
  const varietyName = String(doc.varietyName || '').trim()
  const varietyDesc = String(varietyDoc?.description || '').trim()
  const names = mergeNames(profile, varietyName)
  const aliases = mergeAliases(doc.aliases, names)
  const atlas = cloneObject(profile.atlas)
  const bloom = buildBloomFromProfile(profile)
  const careVase = cloneObject(profile.careVase)
  const careSoil = cloneObject(profile.careSoil)
  const careGuide = cloneObject(profile.careGuide)
  const language = doc.varietyId
    ? buildVarietyLanguage(profile, varietyName, varietyDesc)
    : cloneObject(profile.language)
  const taxonomy = cloneObject(profile.taxonomy)
  const occasions = asStringArray(language.occasions)

  const wikiDraft = {
    kindName: doc.kindName || '',
    varietyName,
    taxonomy,
    names,
    aliases,
    keywords: asStringArray(doc.keywords),
    tags: asStringArray(doc.tags),
    occasions,
    bloom,
    careVase,
    careSoil,
    atlas,
    careGuide,
    language,
  }
  wikiDraft.searchText = buildSearchText(wikiDraft)

  return {
    taxonomy,
    names,
    atlas,
    bloom,
    careVase,
    careSoil,
    careGuide,
    language,
    aliases,
    occasions,
    searchText: wikiDraft.searchText,
    profileSyncVersion: PROFILE_SYNC_VERSION,
    updatedAt: new Date(),
  }
}

function buildNewWikiDoc(kind, variety, profile, sections) {
  const wikiExtras = emptyWikiPayload()
  const names = mergeNames(profile, variety?.name || '')
  const aliases = mergeAliases([], names)
  const draft = {
    kindName: kind.name,
    varietyName: variety?.name || '',
    taxonomy: sections.taxonomy,
    names,
    aliases,
    keywords: [],
    tags: [],
    occasions: asStringArray(sections.language?.occasions),
    bloom: sections.bloom,
    careVase: sections.careVase,
    careSoil: sections.careSoil,
    atlas: sections.atlas,
    careGuide: sections.careGuide,
    language: sections.language,
  }

  return {
    kindId: kind._id,
    varietyId: variety?._id || '',
    kindName: kind.name,
    varietyName: variety?.name || '',
    icon: kind.icon || '🌷',
    coverImage: '',
    plantForm: 'cut',
    taxonomy: sections.taxonomy,
    names,
    atlas: sections.atlas,
    bloom: sections.bloom,
    careVase: sections.careVase,
    careSoil: sections.careSoil,
    careGuide: sections.careGuide,
    language: sections.language,
    aliases,
    occasions: asStringArray(sections.language?.occasions),
    profileSyncVersion: PROFILE_SYNC_VERSION,
    ...wikiExtras,
    searchText: buildSearchText(draft),
    enabled: true,
    sort: Number(variety?.sort) || Number(kind.sort) || 0,
  }
}

async function ensureMissingWikiEntries(db) {
  const [kinds, varieties, wikiDocs] = await Promise.all([
    fetchAllDocs(db, 'flower_kinds'),
    fetchAllDocs(db, 'flower_varieties'),
    fetchAllDocs(db, 'flower_wiki'),
  ])

  const existingKeys = new Set()
  for (const doc of wikiDocs) {
    existingKeys.add(`${doc.kindId || ''}:${doc.varietyId || ''}`)
    existingKeys.add(`name:${String(doc.kindName || '').trim()}:${String(doc.varietyName || '').trim()}`)
  }
  let created = 0

  async function ensureKindOnlyEntry(kind, profile) {
    const key = `${kind._id}:`
    const nameKey = `name:${kind.name}:`
    if (existingKeys.has(key) || existingKeys.has(nameKey)) return
    const patch = buildWikiProfilePatch(
      { kindName: kind.name, varietyName: '', aliases: [] },
      profile,
      null,
    )
    await db.collection('flower_wiki').add({
      data: {
        ...buildNewWikiDoc(kind, null, profile, patch),
        sort: (Number(kind.sort) || 0) + 1000,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })
    existingKeys.add(key)
    existingKeys.add(nameKey)
    created += 1
  }

  for (const kind of kinds) {
    if (isExcludedWikiKind(kind.name)) continue
    const profile = getKindProfile(kind.name)
    if (!profile) continue

    const kindVarieties = varieties.filter((item) => item.kindId === kind._id)
    await ensureKindOnlyEntry(kind, profile)

    for (const variety of kindVarieties) {
      const key = `${kind._id}:${variety._id}`
      const nameKey = `name:${kind.name}:${variety.name}`
      if (existingKeys.has(key) || existingKeys.has(nameKey)) continue
      const patch = buildWikiProfilePatch(
        { kindName: kind.name, varietyName: variety.name, varietyId: variety._id, aliases: [] },
        profile,
        variety,
      )
      await db.collection('flower_wiki').add({
        data: {
          ...buildNewWikiDoc(kind, variety, profile, patch),
          createdAt: db.serverDate(),
          updatedAt: db.serverDate(),
        },
      })
      existingKeys.add(key)
      existingKeys.add(nameKey)
      created += 1
    }
  }

  return created
}

async function syncAllKindProfiles(db) {
  const [wikiDocs, varieties] = await Promise.all([
    fetchAllDocs(db, 'flower_wiki'),
    fetchAllDocs(db, 'flower_varieties'),
  ])

  const varietyMap = new Map(varieties.map((item) => [item._id, item]))
  let updated = 0
  let skipped = 0
  const skippedKinds = []

  for (const doc of wikiDocs) {
    if (isExcludedWikiKind(doc.kindName)) continue
    const profile = getKindProfile(doc.kindName || '')
    if (!profile) {
      skipped += 1
      if (doc.kindName && !skippedKinds.includes(doc.kindName)) {
        skippedKinds.push(doc.kindName)
      }
      continue
    }

    const varietyDoc = doc.varietyId ? varietyMap.get(doc.varietyId) : null
    const patch = buildWikiProfilePatch(doc, profile, varietyDoc)
    await db.collection('flower_wiki').doc(doc._id).update({
      data: {
        ...patch,
        updatedAt: db.serverDate(),
      },
    })
    updated += 1
  }

  const created = await ensureMissingWikiEntries(db)
  await bumpCacheModule('wiki')

  return {
    updated,
    skipped,
    created,
    total: wikiDocs.length,
    profileKinds: Object.keys(WIKI_KIND_PROFILES),
    skippedKinds,
    profileSyncVersion: PROFILE_SYNC_VERSION,
  }
}

module.exports = {
  PROFILE_SYNC_VERSION,
  buildWikiProfilePatch,
  syncAllKindProfiles,
  ensureMissingWikiEntries,
}
