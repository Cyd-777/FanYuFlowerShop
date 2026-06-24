const { bumpCacheModule } = require('./cacheMeta')
const { fetchAllDocs } = require('./db')
const { FLOWER_SEED } = require('./flowerSeed')

async function ensureCollection(db, name) {
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

async function addKindWithVarieties(db, kindSeed) {
  const { varieties, ...kindData } = kindSeed
  const addKindRes = await db.collection('flower_kinds').add({
    data: {
      ...kindData,
      enabled: true,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    },
  })

  const kindId = addKindRes._id
  for (const varietySeed of varieties) {
    await db.collection('flower_varieties').add({
      data: {
        kindId,
        name: varietySeed.name,
        aliases: varietySeed.aliases || [],
        defaultUnit: varietySeed.defaultUnit || kindData.defaultUnit || '束',
        description: varietySeed.description || '',
        sort: Number(varietySeed.sort) || 0,
        enabled: true,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })
  }
}

async function ensureMissingKindsFromSeed(db) {
  const existingKinds = await fetchAllDocs(db, 'flower_kinds')
  const existingNames = new Set(existingKinds.map((item) => item.name))
  let added = false

  for (const kindSeed of FLOWER_SEED) {
    if (existingNames.has(kindSeed.name)) continue
    await addKindWithVarieties(db, kindSeed)
    added = true
  }

  if (added) {
    await bumpCacheModule('flower')
    await bumpCacheModule('wiki')
  }
}

/** 确保 flower_kinds / flower_varieties 存在且种子品类已写入 */
async function ensureDefaultFlowerCatalog(db) {
  await ensureCollection(db, 'flower_kinds')
  await ensureCollection(db, 'flower_varieties')

  const { data: existingKinds } = await db.collection('flower_kinds').limit(1).get()
  if (existingKinds.length === 0) {
    for (const kindSeed of FLOWER_SEED) {
      await addKindWithVarieties(db, kindSeed)
    }
    await bumpCacheModule('flower')
    return
  }

  await ensureMissingKindsFromSeed(db)
}

module.exports = {
  ensureDefaultFlowerCatalog,
}
