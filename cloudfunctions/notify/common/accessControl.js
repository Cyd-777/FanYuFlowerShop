/**
 * 商家权限版本号：staff 增删改时 bump，客户端对比后立即收回 B 端入口。
 */
const cloud = require('wx-server-sdk')

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

async function getAccessRecord(userId) {
  if (!userId) return null
  await ensureCollection('user_access')
  const db = getDb()
  try {
    const { data } = await db.collection('user_access').where({ userId }).limit(1).get()
    return data[0] || null
  } catch (err) {
    if (isCollectionMissingError(err)) return null
    throw err
  }
}

async function getAccessEpoch(userId) {
  const record = await getAccessRecord(userId)
  return Number(record?.accessEpoch) || 0
}

async function bumpAccessEpoch(userId, reason) {
  if (!userId) return 0

  await ensureCollection('user_access')
  const existing = await getAccessRecord(userId)
  const nextEpoch = (Number(existing?.accessEpoch) || 0) + 1
  const db = getDb()

  if (existing?._id) {
    await db.collection('user_access').doc(existing._id).update({
      data: {
        accessEpoch: nextEpoch,
        lastReason: reason || '',
        updatedAt: db.serverDate(),
      },
    })
  } else {
    await db.collection('user_access').add({
      data: {
        userId,
        accessEpoch: nextEpoch,
        lastReason: reason || '',
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })
  }

  return nextEpoch
}

module.exports = {
  getAccessEpoch,
  bumpAccessEpoch,
  getAccessRecord,
}
