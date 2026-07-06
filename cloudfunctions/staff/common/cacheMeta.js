const cloud = require('wx-server-sdk')

const MODULES = ['categories', 'goods', 'wiki', 'flower', 'shop', 'notify']

function getDb() {
  return cloud.database()
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
  const db = getDb()
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

function buildDefaultMeta() {
  const versions = {}
  for (const key of MODULES) {
    versions[key] = 1
  }
  return versions
}

async function ensureCacheMetaDoc() {
  await ensureCollection('cache_meta')
  const db = getDb()
  try {
    const { data } = await db.collection('cache_meta').doc('global').get()
    if (data && data.versions) return data.versions
  } catch (err) {
    if (!isCollectionMissingError(err)) throw err
  }

  const versions = buildDefaultMeta()
  await db.collection('cache_meta').doc('global').set({
    data: {
      versions,
      updatedAt: db.serverDate(),
    },
  })
  return versions
}

async function getCacheVersions() {
  await ensureCacheMetaDoc()
  const db = getDb()
  const { data } = await db.collection('cache_meta').doc('global').get()
  return data?.versions || buildDefaultMeta()
}

async function bumpCacheModule(module) {
  if (!MODULES.includes(module)) return buildDefaultMeta()

  const versions = await ensureCacheMetaDoc()
  const next = { ...versions, [module]: Number(versions[module] || 0) + 1 }
  const db = getDb()
  await db.collection('cache_meta').doc('global').update({
    data: {
      versions: next,
      updatedAt: db.serverDate(),
    },
  })
  return next
}

module.exports = {
  MODULES,
  ensureCacheMetaDoc,
  getCacheVersions,
  bumpCacheModule,
}
