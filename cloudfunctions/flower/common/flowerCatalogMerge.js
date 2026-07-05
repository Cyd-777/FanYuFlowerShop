/**
 * 将 flowerCatalogCut 清单合并进现有 flower_kinds / flower_varieties / flower_wiki
 * （重命名/归并旧品种，停用冗余词条，不另起平行体系）
 */
const { bumpCacheModule } = require('./cacheMeta')
const { fetchAllDocs } = require('./db')
const { CUT_FLOWER_CATALOG, KIND_META, buildFlowerSeedFromCatalog } = require('./flowerCatalogCut')

const CATALOG_KINDS = new Set(Object.keys(KIND_META))
const FLOWER_SEED = buildFlowerSeedFromCatalog()

/** 旧种子/通用品名 → 清单 canonical 品种名 */
const LEGACY_VARIETY_MAP = {
  '玫瑰:红玫瑰': '卡罗拉',
  '玫瑰:粉玫瑰': '戴安娜',
  '玫瑰:白玫瑰': '白雪山',
  '玫瑰:佛洛依德': '弗洛伊德',
  '百合:白百合': '西伯利亚',
  '百合:粉百合': '索邦',
  '百合:黄百合': '黄天霸',
  '百合:香水百合': '黄天霸',
  '百合:西伯利亚百合': '西伯利亚',
  '康乃馨:红色康乃馨': '马斯特',
  '康乃馨:粉色康乃馨': '粉钻',
  '康乃馨:白色康乃馨': '白雪公主',
  '向日葵:向日葵': '黑芯向日葵',
  '向日葵:迷你向日葵': '泰迪熊',
  '郁金香:红色郁金香': '王朝',
  '郁金香:黄色郁金香': '纯金',
  '郁金香:粉色郁金香': '夜皇后',
  '郁金香:白色郁金香': '白梦',
  '绣球:蓝色绣球': '无尽夏',
  '绣球:粉色绣球': '无尽夏',
  '绣球:白色绣球': '贝拉安娜',
  '洋桔梗:白色洋桔梗': '露西塔系列',
  '洋桔梗:紫色洋桔梗': '波浪系列',
  '洋桔梗:绿色洋桔梗': '花束系列',
  '满天星:白色满天星': '仙女',
  '满天星:彩色满天星': '粉满天星',
  '芍药:粉色芍药': '莎拉',
  '芍药:白色芍药': '奶油碗',
  '芍药:珊瑚芍药': '落日珊瑚',
  '菊花:黄菊花': '乒乓菊',
  '菊花:白菊花': '乒乓菊',
  '马蹄莲:白色马蹄莲': '白马',
  '马蹄莲:黄色马蹄莲': '黄金',
  '马蹄莲:粉色马蹄莲': '粉钻',
  '洋牡丹:粉色洋牡丹': '花毛茛',
  '洋牡丹:白色洋牡丹': '花毛茛',
  '洋牡丹:橙色洋牡丹': '花毛茛',
  '勿忘我:蓝色勿忘我': '勿忘我',
  '勿忘我:粉色勿忘我': '勿忘我',
  '紫罗兰:紫色紫罗兰': '紫罗兰',
  '紫罗兰:白色紫罗兰': '紫罗兰',
  '风信子:蓝色风信子': '蓝星',
  '风信子:粉色风信子': '粉珍珠',
  '风信子:白色风信子': '白珍珠',
  '非洲菊:红色非洲菊': '非洲菊',
  '非洲菊:黄色非洲菊': '非洲菊',
  '非洲菊:粉色非洲菊': '非洲菊',
  '蝴蝶兰:白色蝴蝶兰': '蝴蝶兰',
  '蝴蝶兰:粉色蝴蝶兰': '蝴蝶兰',
  '蝴蝶兰:黄色蝴蝶兰': '蝴蝶兰',
}

/** 旧独立种类并入清单种类 */
const KIND_ABSORB = {
  非洲菊: '菊花',
  蝴蝶兰: '盆栽',
}

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
  const name = String(rawName || '').trim()
  if (!name) return ''
  const legacy = LEGACY_VARIETY_MAP[`${kindName}:${name}`]
  if (legacy) return legacy
  const byAlias = findCanonicalByAlias(kindName, name)
  if (byAlias) return byAlias
  if (catalogRowsForKind(kindName).some((row) => row.variety === name)) return name
  return ''
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

async function mergeWikiForKind(db, kind, varietyIdMap, canonicalIdByName) {
  const idToName = new Map(
    [...canonicalIdByName.entries()].map(([name, id]) => [id, name]),
  )
  const wikiDocs = (await fetchAllDocs(db, 'flower_wiki')).filter(
    (doc) => doc.kindId === kind._id || doc.kindName === kind.name,
  )

  let wikiMerged = 0
  let wikiDisabled = 0

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

  await bumpCacheModule('flower')
  await bumpCacheModule('wiki')
  await bumpCacheModule('categories')

  return stats
}

module.exports = {
  LEGACY_VARIETY_MAP,
  KIND_ABSORB,
  resolveCanonicalVarietyName,
  mergeFlowerCatalog,
}
