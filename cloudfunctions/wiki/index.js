const cloud = require('wx-server-sdk')
const { bumpCacheModule } = require('./common/cacheMeta')

/** 智库变更会衍生 wiki: 分类，一并刷新分类缓存版本 */
async function bumpWikiRelatedCaches() {
  await bumpCacheModule('wiki')
  await bumpCacheModule('categories')
}
const { fetchAllDocs } = require('./common/db')
const { ensureDefaultFlowerCatalog } = require('./common/ensureFlowerCatalog')
const { excludeWikiDocs, isExcludedWikiKind } = require('./common/wikiExcluded')
const {
  emptyWikiPayload,
  pickWiki,
  pickWikiListItem,
  normalizeWikiQuery,
  tokenizeQuery,
  filterAndSortWikiDocs,
  searchWikiDocs,
} = require('./wikiSchema')
const { getKindProfile } = require('./wikiKindProfiles')
const { syncAllKindProfiles, ensureMissingWikiEntries, syncRoseCareProfiles } = require('./wikiKindSync')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()

const OWNER_OPENIDS = [
  'oiDICxmmuGHJTKQzDsG9X32n2fAs',
]

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
    bloom: profile?.bloom || {
      vase: '',
      soil: baseAtlas.bloomSeason || '',
    },
    careVase: profile?.careVase || {
      summary: baseCare.summary || '',
      waterChange: baseCare.water || '',
    },
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
    atlas: {
      ...kindWiki.atlas,
      summary: varietyDesc || kindWiki.atlas.summary,
    },
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

function isCollectionMissingError(err) {
  const msg = [err.errMsg, err.message, String(err.errCode), String(err.code)]
    .filter(Boolean)
    .join(' ')
  return (
    msg.includes('DATABASE_COLLECTION_NOT_EXIST') ||
    msg.includes('collection not exists') ||
    msg.includes('Db or Table not exist') ||
    msg.includes('-502005') ||
    msg.includes('50200')
  )
}

async function ensureCollection(name) {
  try {
    await db.createCollection(name)
  } catch (err) {
    const msg = [err.errMsg, err.message].filter(Boolean).join(' ')
    const alreadyExists =
      msg.includes('already exist') ||
      msg.includes('已存在') ||
      msg.includes('ResourceExist') ||
      msg.includes('Table exist')
    if (!alreadyExists && !msg.includes('createCollection is not a function')) {
      throw err
    }
  }
}

async function ensureFlowerCollections() {
  await ensureCollection('flower_kinds')
  await ensureCollection('flower_varieties')
}

async function isMerchant(openid) {
  if (!openid) return true
  if (OWNER_OPENIDS.includes(openid)) return true

  try {
    const { data } = await db.collection('merchants').where({ openid }).limit(1).get()
    return data.length > 0
  } catch (err) {
    if (isCollectionMissingError(err)) return OWNER_OPENIDS.includes(openid)
    throw err
  }
}

/** 商户手建词条补全 kindId / varietyId，供花卉选择与 match 使用 */
async function resolveWikiEntryIds(docId, kindName, varietyName) {
  const variety = String(varietyName || '').trim()
  if (!variety) {
    return { kindId: docId, varietyId: '' }
  }

  const { data: kindOnlyRows } = await db
    .collection('flower_wiki')
    .where({ kindName, varietyName: '' })
    .limit(1)
    .get()
  const kindAnchor = kindOnlyRows[0]
  if (kindAnchor) {
    return {
      kindId: kindAnchor.kindId || kindAnchor._id,
      varietyId: docId,
    }
  }

  const { data: siblings } = await db.collection('flower_wiki').where({ kindName }).limit(20).get()
  const siblingKindId = siblings
    .map((row) => String(row.kindId || row._id || '').trim())
    .find(Boolean)

  return {
    kindId: siblingKindId || docId,
    varietyId: docId,
  }
}

/** C 端读路径：只保证集合存在，不跑品种合并 / 补词条（否则单次请求易超时） */
async function ensureWikiReadReady() {
  await ensureCollection('flower_wiki')
}

/** 空库首次访问列表时再跑完整初始化 */
async function ensureDefaultWikiIfEmpty() {
  await ensureCollection('flower_wiki')
  const { data: existing } = await db.collection('flower_wiki').limit(1).get()
  if (existing.length === 0) {
    await ensureDefaultWikiFull()
  }
}

/** 完整初始化：种子、品种合并、补缺失词条 — 管理端 / 空库专用 */
async function ensureDefaultWikiFull() {
  await ensureCollection('flower_wiki')
  await ensureDefaultFlowerCatalog(db)

  const { data: existing } = await db.collection('flower_wiki').limit(1).get()
  if (existing.length > 0) {
    try {
      const created = await ensureMissingWikiEntries(db)
      if (created > 0) {
        await bumpWikiRelatedCaches()
      }
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
          kindId: kind._id,
          varietyId: '',
          kindName: kind.name,
          varietyName: '',
          icon: kind.icon || '🌷',
          coverImage: '',
          ...sections,
          ...wikiExtras,
          enabled: true,
          sort: Number(kind.sort) || 0,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate(),
        },
      })
      continue
    }

    {
      const sections = defaultWikiForKind(kind)
      await db.collection('flower_wiki').add({
        data: {
          kindId: kind._id,
          varietyId: '',
          kindName: kind.name,
          varietyName: '',
          icon: kind.icon || '🌷',
          coverImage: '',
          ...sections,
          ...wikiExtras,
          enabled: true,
          sort: (Number(kind.sort) || 0) + 1000,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate(),
        },
      })
    }

    for (const variety of kindVarieties) {
      const sections = wikiForVariety(kind, variety)
      await db.collection('flower_wiki').add({
        data: {
          kindId: kind._id,
          varietyId: variety._id,
          kindName: kind.name,
          varietyName: variety.name,
          icon: kind.icon || '🌷',
          coverImage: '',
          ...sections,
          ...wikiExtras,
          enabled: true,
          sort: Number(variety.sort) || Number(kind.sort) || 0,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate(),
        },
      })
    }
  }

  await bumpWikiRelatedCaches()
}

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

exports.main = async (event) => {
  const { action } = event
  const wxContext = cloud.getWXContext()
  const operatorOpenid = wxContext.OPENID

  try {
    if (action === 'syncKindProfiles') {
      const canManage = await isMerchant(operatorOpenid)
      if (!canManage) {
        return { success: false, errMsg: '无权限同步百科品类资料' }
      }
      await ensureCollection('flower_wiki')
      const result = await syncAllKindProfiles(db)
      return { success: true, ...result }
    }

    if (action === 'syncRoseCare') {
      const canManage = await isMerchant(operatorOpenid)
      if (!canManage) {
        return { success: false, errMsg: '无权限同步玫瑰养护' }
      }
      await ensureCollection('flower_wiki')
      const result = await syncRoseCareProfiles(db)
      return { success: true, ...result }
    }

    if (action === 'publicList') {
      const { keyword = '', query } = event
      if (query && typeof query === 'object') {
        const result = await searchWiki(query)
        return { success: true, list: result.list, answer: result.answer || null }
      }
      const list = await listWiki(keyword)
      return { success: true, list }
    }

    if (action === 'publicSearch') {
      const { query = {} } = event
      const result = await searchWiki(query)
      return { success: true, list: result.list, answer: result.answer || null }
    }

    if (action === 'publicGet') {
      const { id } = event
      if (!id) return { success: false, errMsg: '缺少智库 ID' }
      const wiki = await getWikiById(id)
      if (!wiki) return { success: false, errMsg: '智库内容不存在' }
      return { success: true, wiki }
    }

    if (action === 'publicMatch') {
      const { kindId = '', varietyId = '' } = event
      const wiki = await matchWiki(kindId, varietyId)
      return { success: true, wiki }
    }

    if (action === 'updateCoverImage') {
      const canManage = await isMerchant(operatorOpenid)
      if (!canManage) {
        return { success: false, errMsg: '无权限修改智库配图' }
      }

      const wikiId = String(event.wikiId || '').trim()
      const fileId = String(event.fileId || '').trim()
      if (!wikiId || !fileId) {
        return { success: false, errMsg: '缺少参数' }
      }

      await ensureCollection('flower_wiki')
      await db.collection('flower_wiki').doc(wikiId).update({
        data: {
          coverImage: fileId,
          updatedAt: db.serverDate(),
        },
      })

      return { success: true }
    }

    // ====== 商户端词条 CRUD ======

    if (action === 'list') {
      const canManage = await isMerchant(operatorOpenid)
      if (!canManage) {
        return { success: false, errMsg: '无权限查看词条' }
      }

      await ensureDefaultWikiIfEmpty()
      const data = excludeWikiDocs(await fetchAllDocs(db, 'flower_wiki'))
      const list = data.map(pickWikiListItem).sort((a, b) => b.sort - a.sort)
      return { success: true, list }
    }

    if (action === 'get') {
      const canManage = await isMerchant(operatorOpenid)
      if (!canManage) {
        return { success: false, errMsg: '无权限查看词条' }
      }

      const id = String(event.id || '').trim()
      if (!id) return { success: false, errMsg: '缺少词条 ID' }

      await ensureCollection('flower_wiki')
      const { data } = await db.collection('flower_wiki').doc(id).get()
      if (!data) return { success: false, errMsg: '词条不存在' }

      return { success: true, wiki: pickWiki(data) }
    }

    if (action === 'add') {
      const canManage = await isMerchant(operatorOpenid)
      if (!canManage) {
        return { success: false, errMsg: '无权限创建词条' }
      }

      const wiki = event.wiki || {}
      const kindName = String(wiki.kindName || '').trim()
      const varietyName = String(wiki.varietyName || '').trim()
      if (!kindName) {
        return { success: false, errMsg: '种类名称不能为空' }
      }

      await ensureCollection('flower_wiki')
      const insert = {
        kindId: '',
        varietyId: '',
        kindName,
        varietyName,
        icon: String(wiki.icon || '🌷').trim() || '🌷',
        coverImage: '',
        ...emptyWikiPayload(),
        enabled: true,
        sort: 0,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      }

      const addRes = await db.collection('flower_wiki').add({ data: insert })
      const docId = addRes._id
      const ids = await resolveWikiEntryIds(docId, kindName, varietyName)
      await db.collection('flower_wiki').doc(docId).update({
        data: {
          ...ids,
          updatedAt: db.serverDate(),
        },
      })

      const { data: created } = await db.collection('flower_wiki').doc(docId).get()
      await bumpWikiRelatedCaches()
      return { success: true, wiki: pickWikiListItem(created) }
    }

    if (action === 'update') {
      const canManage = await isMerchant(operatorOpenid)
      if (!canManage) {
        return { success: false, errMsg: '无权限更新词条' }
      }

      const id = String(event.id || '').trim()
      if (!id) return { success: false, errMsg: '缺少词条 ID' }

      const wiki = event.wiki || {}
      const patch = {}
      if (wiki.kindName !== undefined) patch.kindName = String(wiki.kindName || '').trim()
      if (wiki.varietyName !== undefined) patch.varietyName = String(wiki.varietyName || '').trim()
      if (wiki.icon !== undefined) patch.icon = String(wiki.icon || '🌷').trim() || '🌷'
      if (wiki.enabled !== undefined) patch.enabled = wiki.enabled !== false
      patch.updatedAt = db.serverDate()

      await ensureCollection('flower_wiki')
      await db.collection('flower_wiki').doc(id).update({ data: patch })

      const { data: updated } = await db.collection('flower_wiki').doc(id).get()
      await bumpWikiRelatedCaches()
      return { success: true, wiki: pickWikiListItem(updated) }
    }

    if (action === 'remove') {
      const canManage = await isMerchant(operatorOpenid)
      if (!canManage) {
        return { success: false, errMsg: '无权限删除词条' }
      }

      const id = String(event.id || '').trim()
      if (!id) return { success: false, errMsg: '缺少词条 ID' }

      await ensureCollection('flower_wiki')
      await db.collection('flower_wiki').doc(id).remove()
      await bumpWikiRelatedCaches()
      return { success: true }
    }

    return { success: false, errMsg: '未知操作' }
  } catch (err) {
    return {
      success: false,
      errMsg: err.message || err.errMsg || '智库服务异常',
    }
  }
}
