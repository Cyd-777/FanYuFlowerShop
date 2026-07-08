const cloud = require('wx-server-sdk')
const { fetchAllDocs } = require('./common/db')
const { ensureDefaultFlowerCatalog } = require('./common/ensureFlowerCatalog')
const { excludeWikiDocs, isExcludedWikiKind } = require('./common/wikiExcluded')
const { emptyWikiPayload } = require('./wikiSchema')
const { getKindProfile } = require('./wikiKindProfiles')
const { ensureMissingWikiEntries } = require('./wikiKindSync')
const { bumpWikiRelatedCaches, ensureCollection } = require('./helpers')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function defaultWikiForKind(kind) {
  const profile = getKindProfile(kind.name)
  const baseAtlas = profile?.atlas || {
    summary: kind.description || `${kind.name}是常见鲜花品类，适合多种花艺搭配。`,
    features: ['观赏性强', '适合花艺搭配'],
    bloomSeason: '因品种而异',
    origin: '多地有栽培',
  }
  const baseCare = profile?.careGuide || {
    summary: '保持通风、清洁水质与适当光照，可延长观赏期。',
    light: '明亮散射光',
    water: '见干见湿，切花勤换水',
    soil: '疏松透气',
    temperature: '15—25℃',
    tips: ['避免暴晒', '定期换水', '修剪枯叶'],
  }
  const baseLanguage = profile?.language || {
    summary: `${kind.name}常被用于表达美好祝愿与情感。`,
    meaning: '美好、祝福与心意',
    occasions: ['日常赠礼', '节日祝福'],
    colorMeanings: [],
  }
  return {
    atlas: baseAtlas,
    bloom: profile?.bloom || { vase: '', soil: baseAtlas.bloomSeason || '' },
    careVase: profile?.careVase || { summary: baseCare.summary || '', waterChange: baseCare.water || '' },
    careSoil: profile?.careSoil || {},
    careGuide: baseCare,
    language: baseLanguage,
    taxonomy: profile?.taxonomy || {},
    names: profile?.names || {},
  }
}

function wikiForVariety(kind, variety) {
  const kindWiki = defaultWikiForKind(kind)
  const varietyDesc = variety.description || ''
  return {
    atlas: { ...kindWiki.atlas, summary: varietyDesc || kindWiki.atlas.summary },
    bloom: kindWiki.bloom,
    careVase: kindWiki.careVase,
    careSoil: kindWiki.careSoil,
    careGuide: { ...kindWiki.careGuide },
    taxonomy: kindWiki.taxonomy,
    names: kindWiki.names,
    language: {
      ...kindWiki.language,
      summary: varietyDesc || kindWiki.language.summary,
      meaning: varietyDesc || kindWiki.language.meaning,
    },
  }
}

async function ensureFlowerCollections() {
  await ensureCollection('flower_kinds')
  await ensureCollection('flower_varieties')
}

/** 完整初始化：种子、品种合并、补缺失词条 */
async function ensureDefaultWikiFull() {
  await ensureCollection('flower_wiki')
  await ensureDefaultFlowerCatalog(db)

  const { data: existing } = await db.collection('flower_wiki').limit(1).get()
  if (existing.length > 0) {
    try {
      const created = await ensureMissingWikiEntries(db)
      if (created > 0) await bumpWikiRelatedCaches()
    } catch (err) {
      console.warn('[wiki] ensureMissingWikiEntries failed', err.message || err)
    }
    return
  }

  await ensureFlowerCollections()
  const [kinds, varieties] = await Promise.all([
    fetchAllDocs(db, 'flower_kinds'),
    fetchAllDocs(db, 'flower_varieties'),
  ])

  if (!kinds.length) return

  const wikiExtras = emptyWikiPayload()

  for (const kind of kinds) {
    if (isExcludedWikiKind(kind.name)) continue
    const kindVarieties = varieties.filter((v) => v.kindId === kind._id)

    if (!kindVarieties.length) {
      const sections = defaultWikiForKind(kind)
      await db.collection('flower_wiki').add({
        data: {
          kindId: kind._id, varietyId: '', kindName: kind.name, varietyName: '',
          icon: kind.icon || '🌷', coverImage: '',
          ...sections, ...wikiExtras,
          enabled: true, sort: Number(kind.sort) || 0,
          createdAt: db.serverDate(), updatedAt: db.serverDate(),
        },
      })
      continue
    }

    {
      const sections = defaultWikiForKind(kind)
      await db.collection('flower_wiki').add({
        data: {
          kindId: kind._id, varietyId: '', kindName: kind.name, varietyName: '',
          icon: kind.icon || '🌷', coverImage: '',
          ...sections, ...wikiExtras,
          enabled: true, sort: (Number(kind.sort) || 0) + 1000,
          createdAt: db.serverDate(), updatedAt: db.serverDate(),
        },
      })
    }

    for (const variety of kindVarieties) {
      const sections = wikiForVariety(kind, variety)
      await db.collection('flower_wiki').add({
        data: {
          kindId: kind._id, varietyId: variety._id,
          kindName: kind.name, varietyName: variety.name,
          icon: kind.icon || '🌷', coverImage: '',
          ...sections, ...wikiExtras,
          enabled: true, sort: Number(variety.sort) || Number(kind.sort) || 0,
          createdAt: db.serverDate(), updatedAt: db.serverDate(),
        },
      })
    }
  }

  await bumpWikiRelatedCaches()
}

/** 空库首次访问列表时再跑完整初始化 */
async function ensureDefaultWikiIfEmpty() {
  await ensureCollection('flower_wiki')
  const { data: existing } = await db.collection('flower_wiki').limit(1).get()
  if (existing.length === 0) {
    await ensureDefaultWikiFull()
  }
}

module.exports = {
  ensureDefaultWikiIfEmpty,
}
