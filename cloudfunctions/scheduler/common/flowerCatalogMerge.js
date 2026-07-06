/**
 * 将 flowerCatalogCut 清单合并进现有 flower_kinds / flower_varieties / flower_wiki
 * （重命名/归并旧品种，停用冗余词条，不另起平行体系）
 */
const { bumpCacheModule } = require('./cacheMeta')
const { bumpCacheEvent } = require('./cacheInvalidation')
const { fetchAllDocs } = require('./db')
const { CUT_FLOWER_CATALOG, KIND_META, buildFlowerSeedFromCatalog } = require('./flowerCatalogCut')
const {
  getLegacyVarietyMap,
  getKindAbsorbMap,
  absorbKindName,
} = require('./flowerIdentity')

const CATALOG_KINDS = new Set(Object.keys(KIND_META))
const FLOWER_SEED = buildFlowerSeedFromCatalog()

/** @deprecated 使用 flowerIdentity.getLegacyVarietyMap() */
const LEGACY_VARIETY_MAP = getLegacyVarietyMap()

/** @deprecated 使用 flowerIdentity.getKindAbsorbMap() */
const KIND_ABSORB = getKindAbsorbMap()

function catalogRowsForKind(kindName) {
  return CUT_FLOWER_CATALOG.filter((row) => row.kind === kindName)
}

function findCanonicalByAlias(kindName, rawName) {
  const name = String(rawName || '').trim()
  if (!name) return ''
  const lower = name.toLowerCase()
  for (const row of catalogRowsForKind(kindName)) {
    if (row.variety === name) return row.variety
    if (row.aliases.some((alias) => alias.toLowerCase() === lower)) return row.variety
  }
  return ''
}

function resolveCanonicalVarietyName(kindName, rawName) {
  const kind = absorbKindName(kindName)
  const name = String(rawName || '').trim()
  if (!name) return ''
  const legacy = getLegacyVarietyMap()[`${kind}:${name}`]
  if (legacy) return legacy
  const byAlias = findCanonicalByAlias(kind, name)
  if (byAlias) return byAlias
  if (catalogRowsForKind(kind).some((row) => row.variety === name)) return name
  return ''
}

/** 旧品种名 → canonical；旧名写入 aliases 供搜索 */
function canonicalizeVarietyIdentity(kindName, varietyName, aliases = []) {
  const kind = String(kindName || '').trim()
  const raw = String(varietyName || '').trim()
  if (!kind || !raw) {
    return { varietyName: raw, aliases: aliases || [] }
  }
  const canonical = resolveCanonicalVarietyName(kind, raw)
  if (!canonical || canonical === raw) {
    return { varietyName: raw, aliases: aliases || [] }
  }
  return {
    varietyName: canonical,
    aliases: mergeAliasList(aliases, [raw]),
  }
}

function mergeAliasList(existing, incoming) {
  const out = [...(existing || [])]
  const seen = new Set(out.map((item) => String(item).toLowerCase()))
  for (const item of incoming || []) {
    const text = String(item || '').trim()
    if (!text) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(text)
  }
  return out
}

function buildVarietySeedPayload(kindData, varietySeed) {
  return {
    name: varietySeed.name,
    aliases: varietySeed.aliases || [],
    color: varietySeed.color || '',
    featureTags: varietySeed.featureTags || [],
    defaultUnit: varietySeed.defaultUnit || kindData.defaultUnit || '束',
    description: varietySeed.description || '',
    sort: Number(varietySeed.sort) || 0,
    enabled: true,
  }
}

async function disableVariety(db, varietyId) {
  await db.collection('flower_varieties').doc(varietyId).update({
    data: { enabled: false, updatedAt: db.serverDate() },
  })
}

function resolveExistingCanonical(kindName, absorbFromKindName, existing) {
  return (
    resolveCanonicalVarietyName(kindName, existing.name) ||
    (absorbFromKindName ? resolveCanonicalVarietyName(absorbFromKindName, existing.name) : '')
  )
}

async function mergeVarietiesForKind(db, kind, absorbFromKindName = '') {
  const kindName = kind.name
  const seedKind = FLOWER_SEED.find((item) => item.name === kindName)
  if (!seedKind) {
    return { varietyIdMap: new Map(), canonicalIdByName: new Map(), merged: 0, disabled: 0 }
  }

  const { varieties: seedVarieties, ...kindData } = seedKind
  const targetNames = new Set(seedVarieties.map((item) => item.name))

  let existingVarieties = (await fetchAllDocs(db, 'flower_varieties')).filter(
    (item) => item.kindId === kind._id,
  )

  if (absorbFromKindName) {
    const absorbKind = (await fetchAllDocs(db, 'flower_kinds')).find(
      (item) => item.name === absorbFromKindName,
    )
    if (absorbKind) {
      existingVarieties = [
        ...existingVarieties,
        ...(await fetchAllDocs(db, 'flower_varieties')).filter(
          (item) => item.kindId === absorbKind._id,
        ),
      ]
    }
  }

  const legacyAliasesByCanonical = new Map()
  let disabled = 0

  for (const existing of existingVarieties) {
    const canonical = resolveExistingCanonical(kindName, absorbFromKindName, existing)
    if (!canonical || !targetNames.has(canonical)) {
      if (existing.enabled !== false) {
        await disableVariety(db, existing._id)
        disabled += 1
      }
      continue
    }
    if (existing.name !== canonical) {
      if (!legacyAliasesByCanonical.has(canonical)) legacyAliasesByCanonical.set(canonical, [])
      legacyAliasesByCanonical.get(canonical).push(existing.name)
    }
  }

  const canonicalIdByName = new Map()
  for (const varietySeed of seedVarieties) {
    const legacyNames = legacyAliasesByCanonical.get(varietySeed.name) || []
    const payload = buildVarietySeedPayload(kindData, {
      ...varietySeed,
      aliases: mergeAliasList(varietySeed.aliases, legacyNames),
    })
    const existingCanonical = existingVarieties.find(
      (item) => item.name === varietySeed.name && item.kindId === kind._id,
    )

    if (existingCanonical) {
      await db.collection('flower_varieties').doc(existingCanonical._id).update({
        data: {
          ...payload,
          aliases: mergeAliasList(existingCanonical.aliases, payload.aliases),
          updatedAt: db.serverDate(),
        },
      })
      canonicalIdByName.set(varietySeed.name, existingCanonical._id)
      continue
    }

    const addRes = await db.collection('flower_varieties').add({
      data: {
        kindId: kind._id,
        ...payload,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })
    canonicalIdByName.set(varietySeed.name, addRes._id)
  }

  const varietyIdMap = new Map()
  let merged = 0

  for (const existing of existingVarieties) {
    const canonical = resolveExistingCanonical(kindName, absorbFromKindName, existing)
    if (!canonical || !targetNames.has(canonical)) continue
    const canonicalId = canonicalIdByName.get(canonical)
    if (!canonicalId || existing._id === canonicalId) continue

    varietyIdMap.set(existing._id, canonicalId)
    if (existing.enabled !== false) {
      await disableVariety(db, existing._id)
      disabled += 1
    }
    merged += 1
  }

  return { varietyIdMap, canonicalIdByName, merged, disabled }
}

async function canonicalizeWikiDocsForKind(db, kind, canonicalIdByName) {
  const wikiDocs = (await fetchAllDocs(db, 'flower_wiki')).filter(
    (doc) =>
      doc.enabled !== false &&
      (doc.kindId === kind._id || doc.kindName === kind.name),
  )
  let renamed = 0

  for (const doc of wikiDocs) {
    const kindName = String(doc.kindName || kind.name || '').trim()
    const rawVariety = String(doc.varietyName || '').trim()
    if (!rawVariety) continue

    const { varietyName, aliases } = canonicalizeVarietyIdentity(
      kindName,
      rawVariety,
      doc.aliases,
    )
    if (varietyName === rawVariety) continue

    const canonicalId = canonicalIdByName.get(varietyName) || ''
    const patch = {
      varietyName,
      aliases,
      updatedAt: db.serverDate(),
    }
    if (canonicalId) patch.varietyId = canonicalId

    await db.collection('flower_wiki').doc(doc._id).update({ data: patch })
    renamed += 1
  }

  return renamed
}

async function migrateGoodsVarietyNames(db) {
  let migrated = 0
  const goods = await fetchAllDocs(db, 'goods')

  for (const item of goods) {
    const kindName = String(item.flowerKindName || '').trim()
    const raw = String(item.flowerVarietyName || '').trim()
    if (!kindName || !raw) continue

    const canonical = resolveCanonicalVarietyName(kindName, raw)
    if (!canonical || canonical === raw) continue

    await db.collection('goods').doc(item._id).update({
      data: {
        flowerVarietyName: canonical,
        updatedAt: db.serverDate(),
      },
    })
    migrated += 1
  }

  if (migrated > 0) {
    await bumpCacheModule('goods')
  }

  return migrated
}

async function mergeWikiForKind(db, kind, varietyIdMap, canonicalIdByName) {
  const idToName = new Map(
    [...canonicalIdByName.entries()].map(([name, id]) => [id, name]),
  )

  let wikiMerged = await canonicalizeWikiDocsForKind(db, kind, canonicalIdByName)
  let wikiDisabled = 0

  const wikiDocs = (await fetchAllDocs(db, 'flower_wiki')).filter(
    (doc) => doc.kindId === kind._id || doc.kindName === kind.name,
  )

  for (const doc of wikiDocs) {
    if (!doc.varietyId || !varietyIdMap.has(doc.varietyId)) continue
    const newVarietyId = varietyIdMap.get(doc.varietyId)
    const varietyName = idToName.get(newVarietyId) || doc.varietyName

    await db.collection('flower_wiki').doc(doc._id).update({
      data: {
        kindId: kind._id,
        kindName: kind.name,
        varietyId: newVarietyId,
        varietyName,
        aliases: mergeAliasList(doc.aliases, [doc.varietyName]),
        updatedAt: db.serverDate(),
      },
    })
    wikiMerged += 1
  }

  const refreshed = (await fetchAllDocs(db, 'flower_wiki')).filter(
    (doc) => doc.kindId === kind._id && doc.enabled !== false,
  )

  const keepByVarietyId = new Map()
  for (const doc of refreshed) {
    if (!doc.varietyId) continue
    const kept = keepByVarietyId.get(doc.varietyId)
    if (!kept) {
      keepByVarietyId.set(doc.varietyId, doc)
      continue
    }
    await db.collection('flower_wiki').doc(kept._id).update({
      data: {
        aliases: mergeAliasList(kept.aliases, [
          ...(doc.aliases || []),
          doc.varietyName,
          ...(doc.names?.commonNames || []),
        ]),
        updatedAt: db.serverDate(),
      },
    })
    await db.collection('flower_wiki').doc(doc._id).update({
      data: { enabled: false, updatedAt: db.serverDate() },
    })
    wikiDisabled += 1
    wikiMerged += 1
  }

  let kindOnlyKept = false
  for (const doc of refreshed) {
    if (doc.varietyId) continue
    if (!kindOnlyKept) {
      kindOnlyKept = true
      continue
    }
    await db.collection('flower_wiki').doc(doc._id).update({
      data: { enabled: false, updatedAt: db.serverDate() },
    })
    wikiDisabled += 1
  }

  return { wikiMerged, wikiDisabled }
}

async function absorbLegacyKind(db, fromKindName, toKindName, kinds) {
  const fromKind = kinds.find((item) => item.name === fromKindName)
  const toKind = kinds.find((item) => item.name === toKindName)
  if (!fromKind || !toKind) return { absorbed: false }

  const varietyStats = await mergeVarietiesForKind(db, toKind, fromKindName)
  const wikiStats = await mergeWikiForKind(db, toKind, varietyStats.varietyIdMap, varietyStats.canonicalIdByName)

  const fromWikis = (await fetchAllDocs(db, 'flower_wiki')).filter(
    (doc) => doc.kindId === fromKind._id || doc.kindName === fromKindName,
  )
  for (const doc of fromWikis) {
    await db.collection('flower_wiki').doc(doc._id).update({
      data: { enabled: false, updatedAt: db.serverDate() },
    })
  }

  await db.collection('flower_kinds').doc(fromKind._id).update({
    data: { enabled: false, updatedAt: db.serverDate() },
  })

  return {
    absorbed: true,
    fromKind: fromKindName,
    toKind: toKindName,
    ...varietyStats,
    ...wikiStats,
  }
}

async function mergeFlowerCatalog(db) {
  const kinds = await fetchAllDocs(db, 'flower_kinds')
  const stats = {
    kinds: 0,
    varietiesMerged: 0,
    varietiesDisabled: 0,
    wikiMerged: 0,
    wikiDisabled: 0,
    goodsVarietyRenamed: 0,
    absorbed: [],
  }

  for (const [fromKind, toKind] of Object.entries(KIND_ABSORB)) {
    const result = await absorbLegacyKind(db, fromKind, toKind, kinds)
    if (!result.absorbed) continue
    stats.absorbed.push({ fromKind, toKind })
    stats.varietiesMerged += result.merged || 0
    stats.varietiesDisabled += result.disabled || 0
    stats.wikiMerged += result.wikiMerged || 0
    stats.wikiDisabled += result.wikiDisabled || 0
  }

  const refreshedKinds = await fetchAllDocs(db, 'flower_kinds')

  for (const kindName of CATALOG_KINDS) {
    const kind = refreshedKinds.find((item) => item.name === kindName && item.enabled !== false)
    if (!kind) continue

    const varietyStats = await mergeVarietiesForKind(db, kind)
    const wikiStats = await mergeWikiForKind(db, kind, varietyStats.varietyIdMap, varietyStats.canonicalIdByName)

    stats.kinds += 1
    stats.varietiesMerged += varietyStats.merged
    stats.varietiesDisabled += varietyStats.disabled
    stats.wikiMerged += wikiStats.wikiMerged
    stats.wikiDisabled += wikiStats.wikiDisabled
  }

  stats.goodsVarietyRenamed = await migrateGoodsVarietyNames(db)

  await bumpCacheEvent('flowerCatalog')

  return stats
}

module.exports = {
  LEGACY_VARIETY_MAP,
  KIND_ABSORB,
  resolveCanonicalVarietyName,
  canonicalizeVarietyIdentity,
  mergeFlowerCatalog,
}
