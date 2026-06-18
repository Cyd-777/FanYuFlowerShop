const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()

/** 与 login / staff / shop 云函数保持一致 */
const OWNER_OPENIDS = [
  'oiDICxmmuGHJTKQzDsG9X32n2fAs',
]

const DEFAULT_SHOP = {
  shopKey: 'default',
  shopName: '梵宇花店',
  phone: '',
  openTime: '09:00',
  closeTime: '21:00',
  deliveryNote: '',
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

async function isMerchant(openid) {
  if (OWNER_OPENIDS.includes(openid)) return true

  try {
    const { data } = await db.collection('merchants').where({ openid }).limit(1).get()
    return data.length > 0
  } catch (err) {
    if (isCollectionMissingError(err)) return OWNER_OPENIDS.includes(openid)
    throw err
  }
}

async function ensureShops() {
  await ensureCollection('shops')

  let data = []
  try {
    const res = await db.collection('shops').where({ shopKey: 'default' }).limit(1).get()
    data = res.data
  } catch (err) {
    if (!isCollectionMissingError(err)) throw err
    await ensureCollection('shops')
  }

  if (data.length > 0) {
    return { created: false, count: data.length }
  }

  await db.collection('shops').add({
    data: {
      ...DEFAULT_SHOP,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    },
  })

  return { created: true, count: 1 }
}

async function ensureMerchants() {
  await ensureCollection('merchants')
  let created = 0

  for (const openid of OWNER_OPENIDS) {
    let exists = false

    try {
      const { data } = await db.collection('merchants').where({ openid }).limit(1).get()
      exists = data.length > 0
    } catch (err) {
      if (!isCollectionMissingError(err)) throw err
      await ensureCollection('merchants')
      exists = false
    }

    if (!exists) {
      await db.collection('merchants').add({
        data: {
          openid,
          name: '店长',
          role: 'owner',
          createdAt: db.serverDate(),
        },
      })
      created += 1
    }
  }

  return { created: created > 0, count: created }
}

async function ensureCategories() {
  await ensureCollection('categories')

  const { data } = await db.collection('categories').limit(1).get()
  if (data.length > 0) {
    return { created: false, count: data.length }
  }

  const DEFAULT_CATEGORIES = [
    { name: '混搭花束', icon: '💐', sort: 100, enabled: true },
    { name: '玫瑰', icon: '🌹', sort: 90, enabled: true },
    { name: '向日葵', icon: '🌻', sort: 80, enabled: true },
    { name: '礼盒', icon: '🎁', sort: 70, enabled: true },
    { name: '求婚', icon: '💍', sort: 60, enabled: true },
  ]

  for (const item of DEFAULT_CATEGORIES) {
    await db.collection('categories').add({
      data: {
        ...item,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })
  }

  return { created: true, count: DEFAULT_CATEGORIES.length }
}

exports.main = async () => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return { success: false, errMsg: '无法获取 openid' }
  }

  const allowed = await isMerchant(openid)
  if (!allowed) {
    return { success: false, errMsg: '仅商家可初始化数据库' }
  }

  try {
    const shops = await ensureShops()
    const merchants = await ensureMerchants()
    const categories = await ensureCategories()

    return {
      success: true,
      message: '数据库初始化完成',
      shops,
      merchants,
      categories,
    }
  } catch (err) {
    return {
      success: false,
      errMsg: err.message || err.errMsg || '数据库初始化失败',
    }
  }
}
