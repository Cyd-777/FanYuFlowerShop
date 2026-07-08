const cloud = require('wx-server-sdk')
const { bumpCacheEvent } = require('./common/cacheInvalidation')
const { isMerchant: gateIsMerchant, ensureCollection } = require('./common/merchantGate')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

async function bumpWikiRelatedCaches() {
  await bumpCacheEvent('wikiContent')
}

async function isMerchant(openid) {
  if (!openid) return true
  return gateIsMerchant(openid)
}

async function ensureWikiReadReady() {
  await ensureCollection('flower_wiki')
}

/** 商户手建词条补全 kindId / varietyId */
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

module.exports = {
  bumpWikiRelatedCaches,
  ensureCollection,
  ensureWikiReadReady,
  isMerchant,
  resolveWikiEntryIds,
}
