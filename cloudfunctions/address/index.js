const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()
const COLLECTION = 'user_addresses'

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

function normalizeAddress(raw) {
  if (!raw || typeof raw.id !== 'string') return null

  return {
    id: raw.id,
    name: typeof raw.name === 'string' ? raw.name.trim() : '',
    phone: typeof raw.phone === 'string' ? raw.phone.trim() : '',
    province: typeof raw.province === 'string' ? raw.province.trim() : '',
    city: typeof raw.city === 'string' ? raw.city.trim() : '',
    district: typeof raw.district === 'string' ? raw.district.trim() : '',
    detail: typeof raw.detail === 'string' ? raw.detail.trim() : '',
    isDefault: raw.isDefault === true,
    updatedAt: Number(raw.updatedAt) || 0,
    latitude: typeof raw.latitude === 'number' ? raw.latitude : undefined,
    longitude: typeof raw.longitude === 'number' ? raw.longitude : undefined,
    poiName: typeof raw.poiName === 'string' ? raw.poiName.trim() : undefined,
    source: raw.source === 'wechat' ? 'wechat' : undefined,
  }
}

function validateAddress(address) {
  if (!address.name) return '请填写收件人姓名'
  if (!/^1\d{10}$/.test(address.phone)) return '请填写有效的手机号'
  if (!address.province && !address.city && !address.district && !address.detail) {
    return '地址信息不完整'
  }
  if (!address.detail) return '请填写详细地址'
  return null
}

function normalizeDefault(list, defaultId) {
  if (!list.length) return list
  const targetId = defaultId || list.find((item) => item.isDefault)?.id || list[0].id
  return list.map((item) => ({
    ...item,
    isDefault: item.id === targetId,
  }))
}

async function listByOpenid(openid) {
  await ensureCollection(COLLECTION)
  const { data } = await db.collection(COLLECTION).where({ openid }).get()
  return data
    .map((doc) =>
      normalizeAddress({
        id: doc.addressId,
        name: doc.name,
        phone: doc.phone,
        province: doc.province,
        city: doc.city,
        district: doc.district,
        detail: doc.detail,
        isDefault: doc.isDefault,
        updatedAt: doc.updatedAt,
        latitude: doc.latitude,
        longitude: doc.longitude,
        poiName: doc.poiName,
        source: doc.source,
      }),
    )
    .filter(Boolean)
}

async function replaceAllForOpenid(openid, list) {
  await ensureCollection(COLLECTION)

  const normalized = list
    .map((item) => normalizeAddress(item))
    .filter(Boolean)

  for (const item of normalized) {
    const error = validateAddress(item)
    if (error) {
      return { success: false, errMsg: error }
    }
  }

  const next = normalizeDefault(normalized)
  const { data: existing } = await db.collection(COLLECTION).where({ openid }).get()

  const removeTasks = existing.map((doc) =>
    db.collection(COLLECTION).doc(doc._id).remove(),
  )
  if (removeTasks.length) {
    await Promise.all(removeTasks)
  }

  const now = Date.now()
  for (const item of next) {
    await db.collection(COLLECTION).add({
      data: {
        openid,
        addressId: item.id,
        name: item.name,
        phone: item.phone,
        province: item.province,
        city: item.city,
        district: item.district,
        detail: item.detail,
        isDefault: item.isDefault,
        updatedAt: item.updatedAt || now,
        latitude: item.latitude,
        longitude: item.longitude,
        poiName: item.poiName,
        source: item.source || 'wechat',
        syncedAt: db.serverDate(),
      },
    })
  }

  return { success: true, list: next }
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action } = event

  if (!openid) {
    return { success: false, errMsg: '请先登录' }
  }

  try {
    if (action === 'list') {
      const list = await listByOpenid(openid)
      return { success: true, list: normalizeDefault(list) }
    }

    if (action === 'replaceAll') {
      const list = Array.isArray(event.list) ? event.list : []
      return replaceAllForOpenid(openid, list)
    }

    return { success: false, errMsg: '未知操作' }
  } catch (err) {
    if (isCollectionMissingError(err)) {
      return { success: true, list: [] }
    }
    return {
      success: false,
      errMsg: err.message || err.errMsg || '地址同步失败',
    }
  }
}
