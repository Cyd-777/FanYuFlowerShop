const cloud = require('wx-server-sdk')
const { fetchAllDocs } = require('./common/db')
const { canonicalizeVarietyIdentity } = require('./common/flowerCatalogMerge')
const { excludeWikiDocs } = require('./common/wikiExcluded')
const {
  emptyWikiPayload,
  buildMerchantWikiPatch,
  pickWiki,
  pickWikiListItem,
} = require('./wikiSchema')
const {
  bumpWikiRelatedCaches,
  ensureCollection,
  isMerchant,
  resolveWikiEntryIds,
} = require('./helpers')
const { ensureDefaultWikiIfEmpty } = require('./init')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

async function merchantList(event, operatorOpenid) {
  const canManage = await isMerchant(operatorOpenid)
  if (!canManage) return { success: false, errMsg: '无权限查看词条' }

  await ensureDefaultWikiIfEmpty()
  const data = excludeWikiDocs(await fetchAllDocs(db, 'flower_wiki'))
  const list = data.map(pickWikiListItem).sort((a, b) => b.sort - a.sort)
  return { success: true, list }
}

async function merchantGet(event, operatorOpenid) {
  const canManage = await isMerchant(operatorOpenid)
  if (!canManage) return { success: false, errMsg: '无权限查看词条' }

  const id = String(event.id || '').trim()
  if (!id) return { success: false, errMsg: '缺少词条 ID' }

  await ensureCollection('flower_wiki')
  const { data } = await db.collection('flower_wiki').doc(id).get()
  if (!data) return { success: false, errMsg: '词条不存在' }

  return { success: true, wiki: pickWiki(data) }
}

async function merchantAdd(event, operatorOpenid) {
  const canManage = await isMerchant(operatorOpenid)
  if (!canManage) return { success: false, errMsg: '无权限创建词条' }

  const wiki = event.wiki || {}
  const kindName = String(wiki.kindName || '').trim()
  const rawVariety = String(wiki.varietyName || '').trim()
  const identity = rawVariety
    ? canonicalizeVarietyIdentity(kindName, rawVariety, wiki.aliases)
    : { varietyName: '', aliases: wiki.aliases || [] }
  const varietyName = identity.varietyName
  if (!kindName) return { success: false, errMsg: '种类名称不能为空' }

  await ensureCollection('flower_wiki')
  const insert = {
    kindId: '', varietyId: '', kindName, varietyName,
    icon: String(wiki.icon || '🌷').trim() || '🌷', coverImage: '',
    ...emptyWikiPayload(),
    enabled: true, sort: 0,
    createdAt: db.serverDate(), updatedAt: db.serverDate(),
  }

  const addRes = await db.collection('flower_wiki').add({ data: insert })
  const docId = addRes._id
  const ids = await resolveWikiEntryIds(docId, kindName, varietyName)
  const { data: created } = await db.collection('flower_wiki').doc(docId).get()
  const contentPatch = buildMerchantWikiPatch(
    { ...wiki, varietyName, aliases: identity.aliases },
    created,
  )
  await db.collection('flower_wiki').doc(docId).update({
    data: { ...ids, ...contentPatch, updatedAt: db.serverDate() },
  })

  const { data: finalDoc } = await db.collection('flower_wiki').doc(docId).get()
  await bumpWikiRelatedCaches()
  return { success: true, wiki: pickWikiListItem(finalDoc) }
}

async function merchantUpdate(event, operatorOpenid) {
  const canManage = await isMerchant(operatorOpenid)
  if (!canManage) return { success: false, errMsg: '无权限更新词条' }

  const id = String(event.id || '').trim()
  if (!id) return { success: false, errMsg: '缺少词条 ID' }

  const wiki = event.wiki || {}

  await ensureCollection('flower_wiki')
  const { data: existing } = await db.collection('flower_wiki').doc(id).get()
  if (!existing) return { success: false, errMsg: '词条不存在' }

  const nextKind = String(
    wiki.kindName !== undefined ? wiki.kindName : existing.kindName || '',
  ).trim()
  const rawNextVariety = String(
    wiki.varietyName !== undefined ? wiki.varietyName : existing.varietyName || '',
  ).trim()
  const identity = rawNextVariety
    ? canonicalizeVarietyIdentity(
        nextKind, rawNextVariety,
        wiki.aliases !== undefined ? wiki.aliases : existing.aliases,
      )
    : { varietyName: '', aliases: existing.aliases || [] }

  const patch = buildMerchantWikiPatch(
    { ...wiki, varietyName: identity.varietyName, aliases: identity.aliases },
    existing,
  )
  patch.updatedAt = db.serverDate()

  const resolvedKind = patch.kindName !== undefined ? patch.kindName : existing.kindName
  const resolvedVariety = patch.varietyName !== undefined ? patch.varietyName : existing.varietyName
  if (patch.kindName !== undefined || patch.varietyName !== undefined) {
    Object.assign(patch, await resolveWikiEntryIds(id, resolvedKind, resolvedVariety))
  }

  await db.collection('flower_wiki').doc(id).update({ data: patch })
  const { data: updated } = await db.collection('flower_wiki').doc(id).get()
  await bumpWikiRelatedCaches()
  return { success: true, wiki: pickWikiListItem(updated) }
}

async function merchantRemove(event, operatorOpenid) {
  const canManage = await isMerchant(operatorOpenid)
  if (!canManage) return { success: false, errMsg: '无权限删除词条' }

  const id = String(event.id || '').trim()
  if (!id) return { success: false, errMsg: '缺少词条 ID' }

  await ensureCollection('flower_wiki')
  await db.collection('flower_wiki').doc(id).remove()
  await bumpWikiRelatedCaches()
  return { success: true }
}

async function updateCoverImage(event, operatorOpenid) {
  const canManage = await isMerchant(operatorOpenid)
  if (!canManage) return { success: false, errMsg: '无权限修改智库配图' }

  const wikiId = String(event.wikiId || '').trim()
  const fileId = String(event.fileId || '').trim()
  if (!wikiId || !fileId) return { success: false, errMsg: '缺少参数' }

  await ensureCollection('flower_wiki')
  await db.collection('flower_wiki').doc(wikiId).update({
    data: { coverImage: fileId, updatedAt: db.serverDate() },
  })
  return { success: true }
}

module.exports = {
  merchantAdd,
  merchantGet,
  merchantList,
  merchantRemove,
  merchantUpdate,
  updateCoverImage,
}
