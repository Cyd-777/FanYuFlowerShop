/**
 * 多端账号：users + user_auth
 * 部署前 npm run sync:cloud
 */
const cloud = require('wx-server-sdk')
const { hashWechatOpenId } = require('./authIdentifier')

const AUTH_WECHAT_MP = 'wechat_mp'
const AUTH_PHONE = 'phone'

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

function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (!/^1\d{10}$/.test(digits)) return ''
  return digits
}

function buildDefaultNickName(seed) {
  const tail = String(seed || '')
    .replace(/\W/g, '')
    .slice(-4)
  return `花友${tail || String(Date.now()).slice(-4)}`
}

function pickUser(doc) {
  if (!doc) return null
  return {
    userId: doc.userId || doc._id,
    nickName: doc.nickName || '',
    avatarUrl: doc.avatarUrl || '',
    phone: doc.phone || '',
  }
}

async function findWechatAuth(openid) {
  if (!openid) return null
  return findAuth(AUTH_WECHAT_MP, hashWechatOpenId(openid))
}

async function bindWechatAuth(userId, openid) {
  if (!userId || !openid) return
  const identifier = hashWechatOpenId(openid)
  const existing = await findAuth(AUTH_WECHAT_MP, identifier)
  if (existing) {
    if (existing.userId !== userId) {
      throw new Error('该微信已绑定其他账号')
    }
    return existing
  }
  await bindAuth(userId, AUTH_WECHAT_MP, identifier)
}

async function findAuth(authType, identifier) {
  if (!identifier) return null
  await ensureCollection('user_auth')
  const db = getDb()
  try {
    const { data } = await db
      .collection('user_auth')
      .where({ authType, identifier })
      .limit(1)
      .get()
    return data[0] || null
  } catch (err) {
    if (isCollectionMissingError(err)) return null
    throw err
  }
}

async function getUserById(userId) {
  if (!userId) return null
  await ensureCollection('users')
  const db = getDb()
  try {
    const byKey = await db.collection('users').where({ userId }).limit(1).get()
    if (byKey.data[0]) return byKey.data[0]
    const byDoc = await db.collection('users').doc(userId).get()
    return byDoc.data || null
  } catch (err) {
    if (isCollectionMissingError(err)) return null
    throw err
  }
}

async function createUserRecord(options = {}) {
  const db = getDb()
  await ensureCollection('users')
  const userId = `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const nickName = options.nickName || buildDefaultNickName(options.seed || userId)
  const payload = {
    userId,
    nickName,
    avatarUrl: options.avatarUrl || '',
    phone: options.phone || '',
    createdAt: db.serverDate(),
    updatedAt: db.serverDate(),
  }
  await db.collection('users').add({ data: payload })
  return payload
}

async function bindAuth(userId, authType, identifier) {
  if (!userId || !identifier) return
  const db = getDb()
  await ensureCollection('user_auth')
  const existing = await findAuth(authType, identifier)
  if (existing) {
    if (existing.userId !== userId) {
      throw new Error('该登录方式已绑定其他账号')
    }
    return existing
  }
  await db.collection('user_auth').add({
    data: {
      userId,
      authType,
      identifier,
      createdAt: db.serverDate(),
    },
  })
}

async function updateUserPhone(userId, phone) {
  if (!userId || !phone) return
  const db = getDb()
  const user = await getUserById(userId)
  if (!user?._id) return
  await db.collection('users').doc(user._id).update({
    data: {
      phone,
      updatedAt: db.serverDate(),
    },
  })
}

async function resolveUserByWechatMp(openid) {
  if (!openid) throw new Error('无法获取微信 openid')

  const auth = await findWechatAuth(openid)
  if (auth) {
    const user = await getUserById(auth.userId)
    if (user) return user
  }

  const created = await createUserRecord({ seed: openid })
  await bindWechatAuth(created.userId, openid)
  return getUserById(created.userId)
}

async function resolveUserByPhone(phone, bindOpenid) {
  const normalized = normalizePhone(phone)
  if (!normalized) throw new Error('手机号格式不正确')

  let auth = await findAuth(AUTH_PHONE, normalized)
  let user = null

  if (auth) {
    user = await getUserById(auth.userId)
  }

  if (!user) {
    const created = await createUserRecord({ phone: normalized, seed: normalized })
    await bindAuth(created.userId, AUTH_PHONE, normalized)
    user = await getUserById(created.userId)
  } else if (!user.phone) {
    await updateUserPhone(user.userId, normalized)
    user.phone = normalized
  }

  if (bindOpenid) {
    const wxAuth = await findWechatAuth(bindOpenid)
    if (!wxAuth) {
      await bindWechatAuth(user.userId, bindOpenid)
    } else if (wxAuth.userId !== user.userId) {
      throw new Error('当前微信已绑定其他账号，请使用微信登录')
    }
  }

  return user
}

async function saveSmsCode(phone, code, ttlMs = 5 * 60 * 1000) {
  const db = getDb()
  await ensureCollection('sms_codes')
  const expiresAt = Date.now() + ttlMs
  const { data } = await db.collection('sms_codes').where({ phone }).limit(1).get()
  const payload = {
    phone,
    code,
    expiresAt,
    updatedAt: db.serverDate(),
  }
  if (data[0]?._id) {
    await db.collection('sms_codes').doc(data[0]._id).update({ data: payload })
  } else {
    await db.collection('sms_codes').add({
      data: {
        ...payload,
        createdAt: db.serverDate(),
      },
    })
  }
}

async function verifySmsCode(phone, code) {
  const normalized = normalizePhone(phone)
  if (!normalized || !code) return false
  const db = getDb()
  await ensureCollection('sms_codes')
  const { data } = await db.collection('sms_codes').where({ phone: normalized }).limit(1).get()
  const record = data[0]
  if (!record) return false
  if (Date.now() > Number(record.expiresAt)) return false
  return String(record.code) === String(code).trim()
}

function randomSmsCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

module.exports = {
  AUTH_WECHAT_MP,
  AUTH_PHONE,
  normalizePhone,
  pickUser,
  resolveUserByWechatMp,
  resolveUserByPhone,
  saveSmsCode,
  verifySmsCode,
  randomSmsCode,
  getUserById,
  findAuth,
}
