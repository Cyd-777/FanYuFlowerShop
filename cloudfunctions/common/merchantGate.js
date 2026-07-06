/**
 * 商家鉴权单一入口：白名单 + merchants 集合。
 * 部署前 npm run sync:cloud
 */
const cloud = require('wx-server-sdk')
const { resolveUserByWechatMp } = require('./account')

/** 店长 OpenID 白名单 — 全仓库唯一维护处 */
const OWNER_OPENIDS = ['oiDICxmmuGHJTKQzDsG9X32n2fAs']

const ROLE_LABELS = {
  owner: '店长',
  manager: '管理员',
  staff: '员工',
}

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

function isWhitelistedOwner(openid) {
  return OWNER_OPENIDS.includes(String(openid || '').trim())
}

async function findMerchantByOpenid(openid) {
  const id = String(openid || '').trim()
  if (!id) return null
  await ensureCollection('merchants')
  const { data } = await getDb().collection('merchants').where({ openid: id }).limit(1).get()
  return data[0] || null
}

async function findMerchantByUserId(userId) {
  const id = String(userId || '').trim()
  if (!id) return null
  await ensureCollection('merchants')
  const { data } = await getDb().collection('merchants').where({ userId: id }).limit(1).get()
  return data[0] || null
}

/** 是否商家团队成员（含白名单店长） */
async function isMerchant(openid) {
  if (isWhitelistedOwner(openid)) return true

  try {
    const merchant = await findMerchantByOpenid(openid)
    return !!merchant
  } catch (err) {
    if (isCollectionMissingError(err)) return isWhitelistedOwner(openid)
    throw err
  }
}

/** 是否店长（白名单或 merchants.role=owner） */
async function isOwner(openid) {
  if (isWhitelistedOwner(openid)) return true

  try {
    const user = await resolveUserByWechatMp(openid)
    const merchant = user?.userId ? await findMerchantByUserId(user.userId) : null
    return !!(merchant && (merchant.role === 'owner' || !merchant.role))
  } catch (err) {
    if (isCollectionMissingError(err)) return isWhitelistedOwner(openid)
    throw err
  }
}

/** 解析商家操作者（notify 等场景） */
async function resolveMerchantActor(openid) {
  const id = String(openid || '').trim()
  if (!id) return null

  const user = await resolveUserByWechatMp(id)
  const userId = String(user?.userId || '').trim()
  let merchant = userId ? await findMerchantByUserId(userId) : null
  if (!merchant) {
    merchant = await findMerchantByOpenid(id)
  }

  const whitelisted = isWhitelistedOwner(id)
  if (!whitelisted && !merchant) {
    return null
  }

  const role = merchant?.role || (whitelisted ? 'owner' : 'staff')
  const displayName =
    merchant?.name || user?.nickName || (whitelisted ? '店长' : '工作人员')

  return {
    userId: merchant?.userId || userId,
    openid: id,
    role,
    roleLabel: ROLE_LABELS[role] || ROLE_LABELS.staff,
    displayName,
    nickName: user?.nickName || '',
    avatarUrl: user?.avatarUrl || '',
  }
}

module.exports = {
  OWNER_OPENIDS,
  ROLE_LABELS,
  isWhitelistedOwner,
  isMerchant,
  isOwner,
  findMerchantByOpenid,
  findMerchantByUserId,
  resolveMerchantActor,
  ensureCollection,
  isCollectionMissingError,
}
