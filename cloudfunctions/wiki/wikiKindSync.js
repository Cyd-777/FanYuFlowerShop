/**
 * 按品类 profile 批量写回 flower_wiki，修正库内错误正文并补全缺失词条。
 */

const { bumpCacheModule } = require('./common/cacheMeta')
const { mergeFlowerCatalog } = require('./common/flowerCatalogMerge')
const { isExcludedWikiKind } = require('./common/wikiExcluded')
const { fetchAllDocs } = require('./common/db')
const { getKindProfile, WIKI_KIND_PROFILES } = require('./wikiKindProfiles')
const { getVarietyProfile } = require('./wikiVarietyProfiles')
const { mergeVarietyArticleIntoDraft } = require('./wikiVarietyArticles')
const { isRoseKind, applyRoseCareToDraft } = require('./wikiRoseCare')
const { buildSearchText, emptyWikiPayload } = require('./wikiSchema')

const PROFILE_SYNC_VERSION = 4

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

function mergeVarietyAliases(existingAliases, varietyProfile, names) {
  let merged = mergeAliases(existingAliases, names)
  if (!varietyProfile?.aliases?.length) return merged
  const seen = new Set(merged.map((item) => item.toLowerCase()))
  for (const alias of varietyProfile.aliases) {
    const text = String(alias || '').trim()
    if (!text) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(text)
  }
  return merged
}

function applyVarietyProfileSections(varietyProfile, varietyName, varietyDesc, atlas, language) {
  if (!varietyProfile) return
  const name = String(varietyName || '').trim()
  const desc = String(varietyDesc || '').trim()
  const color = String(varietyProfile.color || '').trim()
  const features = asStringArray(varietyProfile.features)

  if (features.length) {
    atlas.features = features
  }

  const summaryParts = [name]
  if (color && color !== '多色') summaryParts.push(color)
  if (features.length) summaryParts.push(features.slice(0, 4).join('、'))
  const generatedSummary = summaryParts.filter(Boolean).join('，')
  if (desc) {
    atlas.summary = desc
  } else if (generatedSummary) {
    atlas.summary = generatedSummary
  }

  if (desc || generatedSummary) {
    language.summary = desc || generatedSummary
  }

  const colorToken = color.split('/')[0]?.replace(/带.*/, '').trim()
  if (colorToken && colorToken !== '多色' && language.colorMeanings?.length) {
    const matched = language.colorMeanings.find((item) =>
      String(item?.color || '').includes(colorToken.slice(0, 1)),
    )
    if (matched?.meaning) {
      language.meaning = `${colorToken}：${matched.meaning}`.replace(/^：/, '')
    }
  }
}

function buildWikiProfilePatch(doc, profile, varietyDoc) {
  const varietyName = String(doc.varietyName || '').trim()
  const varietyDesc = String(varietyDoc?.description || '').trim()
  const varietyProfile = doc.varietyId ? getVarietyProfile(doc.kindName, varietyName) : null
  const names = mergeNames(profile, varietyName)
  const aliases = mergeVarietyAliases(doc.aliases, varietyProfile, names)
  const atlas = cloneObject(profile.atlas)
  const bloom = buildBloomFromProfile(profile)
  const careVase = cloneObject(profile.careVase)
  const careSoil = cloneObject(profile.careSoil)
  const careGuide = cloneObject(profile.careGuide)
  const language = doc.varietyId
    ? buildVarietyLanguage(profile, varietyName, varietyDesc)
    : cloneObject(profile.language)
  const taxonomy = cloneObject(profile.taxonomy)

  if (varietyProfile) {
    applyVarietyProfileSections(varietyProfile, varietyName, varietyDesc, atlas, language)
  }

  const sectionsDraft = {
    names,
    bloom,
    careVase,
    careSoil,
    atlas,
    careGuide,
    language,
  }
  if (doc.varietyId && varietyName) {
    mergeVarietyArticleIntoDraft(sectionsDraft, doc.kindName, varietyName)
  } else if (isRoseKind(doc.kindName)) {
    applyRoseCareToDraft(sectionsDraft, varietyName)
  }

  const keywords = varietyProfile
    ? asStringArray(varietyProfile.keywords)
    : asStringArray(doc.keywords)
  const tags = varietyProfile ? asStringArray(varietyProfile.tags) : asStringArray(doc.tags)
  const occasions = asStringArray(sectionsDraft.language.occasions)

  const wikiDraft = {
    kindName: doc.kindName || '',
    varietyName,
    taxonomy,
    names: sectionsDraft.names,
    aliases,
    keywords,
    tags,
    occasions,
    bloom: sectionsDraft.bloom,
    careVase: sectionsDraft.careVase,
    careSoil: sectionsDraft.careSoil,
    atlas: sectionsDraft.atlas,
    careGuide: sectionsDraft.careGuide,
    language: sectionsDraft.language,
  }
  wikiDraft.searchText = buildSearchText(wikiDraft)

  return {
    taxonomy,
    names: sectionsDraft.names,
    atlas: sectionsDraft.atlas,
    bloom: sectionsDraft.bloom,
    careVase: sectionsDraft.careVase,
    careSoil: sectionsDraft.careSoil,
    careGuide: sectionsDraft.careGuide,
    language: sectionsDraft.language,
    aliases,
    keywords,
    tags,
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
    plantForm: kind.name === '盆栽' ? 'potted' : 'cut',
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
  const mergeStats = await mergeFlowerCatalog(db)

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
  await bumpCacheModule('categories')

  return {
    updated,
    skipped,
    created,
    total: wikiDocs.length,
    mergeStats,
    profileKinds: Object.keys(WIKI_KIND_PROFILES),
    skippedKinds,
    profileSyncVersion: PROFILE_SYNC_VERSION,
  }
}

/** 仅写回「玫瑰」分类养护（试点；不动其它种类词条正文） */
async function syncRoseCareProfiles(db) {
  const wikiDocs = await fetchAllDocs(db, 'flower_wiki')
  const varieties = await fetchAllDocs(db, 'flower_varieties')
  const varietyMap = new Map(varieties.map((item) => [item._id, item]))
  const roseDocs = wikiDocs.filter((doc) => isRoseKind(doc.kindName) && !isExcludedWikiKind(doc.kindName))
  let updated = 0

  for (const doc of roseDocs) {
    const profile = getKindProfile(doc.kindName || '')
    if (!profile) continue
    const varietyDoc = doc.varietyId ? varietyMap.get(doc.varietyId) : null
    const patch = buildWikiProfilePatch(doc, profile, varietyDoc)
    await db.collection('flower_wiki').doc(doc._id).update({
      data: {
        careVase: patch.careVase,
        bloom: patch.bloom,
        searchText: patch.searchText,
        profileSyncVersion: PROFILE_SYNC_VERSION,
        roseCareSyncVersion: 1,
        updatedAt: db.serverDate(),
      },
    })
    updated += 1
  }

  await bumpCacheModule('wiki')
  await bumpCacheModule('categories')

  return {
    updated,
    total: roseDocs.length,
    profileSyncVersion: PROFILE_SYNC_VERSION,
    pilotVarieties: Object.keys(require('./wikiRoseCare').ROSE_VARIETY_CARE),
  }
}

module.exports = {
  PROFILE_SYNC_VERSION,
  buildWikiProfilePatch,
  syncAllKindProfiles,
  syncRoseCareProfiles,
  ensureMissingWikiEntries,
}
