const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const { bumpAccessEpoch } = require('./common/accessControl')
const { getUserById, resolveUserByWechatMp } = require('./common/account')

const db = cloud.database()
const _ = db.command

/** 店长 OpenID 白名单（与 login 云函数保持一致，仅服务端 wxContext 使用） */
const OWNER_OPENIDS = [
  'oiDICxmmuGHJTKQzDsG9X32n2fAs',
]

const ASSIGNABLE_ROLES = ['manager', 'staff']
const USER_ID_PATTERN = /^u_\d+_[a-z0-9]+$/
const INVITE_TTL_MS = 24 * 60 * 60 * 1000

const ROLE_LABELS = {
  manager: '管理员',
  staff: '员工',
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

function normalizeUserId(raw) {
  const text = String(raw || '').trim()
  return USER_ID_PATTERN.test(text) ? text : ''
}

function normalizeRole(role) {
  return ASSIGNABLE_ROLES.includes(role) ? role : 'staff'
}

function normalizeToken(raw) {
  return String(raw || '').trim().replace(/[^a-f0-9]/gi, '').slice(0, 64)
}

const INVITE_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
const INVITE_CODE_LENGTH = 6

function normalizeInviteCode(raw) {
  const text = String(raw || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase()
    .replace(/[^23456789ABCDEFGHJKLMNPQRSTUVWXYZ]/g, '')
    .slice(0, INVITE_CODE_LENGTH)
  return text.length === INVITE_CODE_LENGTH ? text : ''
}

function createInviteCode() {
  let code = ''
  const bytes = crypto.randomBytes(INVITE_CODE_LENGTH)
  for (let i = 0; i < INVITE_CODE_LENGTH; i += 1) {
    code += INVITE_CODE_ALPHABET[bytes[i] % INVITE_CODE_ALPHABET.length]
  }
  return code
}

async function createUniqueInviteCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = createInviteCode()
    const existing = await findInviteByCode(code)
    if (!existing) return code
  }
  throw new Error('无法生成邀请码，请稍后重试')
}

function createInviteToken() {
  return crypto.randomBytes(16).toString('hex')
}

function inviteStatus(doc) {
  if (!doc) return 'invalid'
  if (doc.status === 'used') return 'used'
  if (doc.status === 'expired') return 'expired'
  if (Number(doc.expiresAt) <= Date.now()) return 'expired'
  return 'pending'
}

function formatInvite(doc) {
  const status = inviteStatus(doc)
  return {
    name: doc.name || '工作人员',
    role: doc.role || 'staff',
    roleLabel: ROLE_LABELS[doc.role] || ROLE_LABELS.staff,
    expiresAt: Number(doc.expiresAt) || 0,
    status,
    code: doc.code || '',
  }
}

async function findMerchantByUserId(userId) {
  if (!userId) return null
  await ensureCollection('merchants')
  const { data } = await db.collection('merchants').where({ userId }).limit(1).get()
  return data[0] || null
}

async function isOwner(operatorOpenid) {
  if (OWNER_OPENIDS.includes(operatorOpenid)) return true

  try {
    const operator = await resolveUserByWechatMp(operatorOpenid)
    const merchant = await findMerchantByUserId(operator?.userId)
    return !!(merchant && (merchant.role === 'owner' || !merchant.role))
  } catch (err) {
    if (isCollectionMissingError(err)) return OWNER_OPENIDS.includes(operatorOpenid)
    throw err
  }
}

async function findInviteByToken(token) {
  if (!token) return null
  await ensureCollection('staff_invites')
  const { data } = await db.collection('staff_invites').where({ token }).limit(1).get()
  return data[0] || null
}

async function findInviteByCode(code) {
  if (!code) return null
  await ensureCollection('staff_invites')
  const { data } = await db.collection('staff_invites').where({ code }).limit(1).get()
  return data[0] || null
}

async function resolveInviteFromEvent(event) {
  const code = normalizeInviteCode(event.code)
  if (code) {
    return findInviteByCode(code)
  }
  const token = normalizeToken(event.token)
  if (token) {
    return findInviteByToken(token)
  }
  return null
}

async function markInviteExpired(doc) {
  if (!doc?._id || doc.status === 'used') return
  await db.collection('staff_invites').doc(doc._id).update({
    data: {
      status: 'expired',
      updatedAt: db.serverDate(),
    },
  })
}

function mapStaffItem(item) {
  return {
    _id: item._id,
    userId: item.userId || '',
    name: item.name || '工作人员',
    role: item.role || 'staff',
    createdAt: item.createdAt,
  }
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const operatorOpenid = wxContext.OPENID
  const { action } = event

  if (action === 'previewInvite') {
    const invite = await resolveInviteFromEvent(event)
    if (!invite) {
      return { success: false, errMsg: '邀请不存在或已失效' }
    }

    const status = inviteStatus(invite)
    if (status === 'expired') {
      await markInviteExpired(invite)
    }

    return {
      success: true,
      invite: formatInvite({ ...invite, status }),
    }
  }

  if (action === 'acceptInvite') {
    if (!operatorOpenid) {
      return { success: false, errMsg: '请先登录微信后再接受邀请' }
    }

    const invite = await resolveInviteFromEvent(event)
    if (!invite) {
      return { success: false, errMsg: '邀请不存在或已失效' }
    }

    const token = invite.token

    const status = inviteStatus(invite)
    if (status === 'used') {
      return { success: false, errMsg: '邀请已被使用' }
    }
    if (status === 'expired') {
      await markInviteExpired(invite)
      return { success: false, errMsg: '邀请已过期' }
    }

    const user = await resolveUserByWechatMp(operatorOpenid)
    const userId = user?.userId || ''
    if (!userId) {
      return { success: false, errMsg: '无法识别当前账号' }
    }

    const existing = await findMerchantByUserId(userId)
    if (existing) {
      return { success: false, errMsg: '你已是工作人员，无需重复接受' }
    }

    const redeem = await db
      .collection('staff_invites')
      .where({
        token,
        status: 'pending',
        expiresAt: _.gt(Date.now()),
      })
      .update({
        data: {
          status: 'used',
          usedAt: db.serverDate(),
          usedByUserId: userId,
          updatedAt: db.serverDate(),
        },
      })

    if (!redeem.stats || redeem.stats.updated === 0) {
      return { success: false, errMsg: '邀请已被使用或已过期' }
    }

    const role = normalizeRole(invite.role)
    const name = String(invite.name || '').trim() || user.nickName || '工作人员'

    await ensureCollection('merchants')
    await db.collection('merchants').add({
      data: {
        userId,
        name,
        role,
        addedBy: invite.createdBy || operatorOpenid,
        inviteToken: token,
        createdAt: db.serverDate(),
      },
    })

    await bumpAccessEpoch(userId, 'staff_invite_accepted')

    return {
      success: true,
      role,
      roleLabel: ROLE_LABELS[role] || ROLE_LABELS.staff,
      name,
    }
  }

  if (!operatorOpenid) {
    return { success: false, errMsg: '无法获取操作者身份' }
  }

  if (action === 'createInvite') {
    const canManage = await isOwner(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限创建邀请' }
    }

    const role = normalizeRole(event.role)
    const name = String(event.name || '').trim() || '工作人员'
    const token = createInviteToken()
    const code = await createUniqueInviteCode()
    const expiresAt = Date.now() + INVITE_TTL_MS

    await ensureCollection('staff_invites')
    await db.collection('staff_invites').add({
      data: {
        token,
        code,
        name,
        role,
        status: 'pending',
        createdBy: operatorOpenid,
        expiresAt,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })

    return {
      success: true,
      token,
      code,
      expiresAt,
      sharePath: `/pages/invite/staff/index?token=${token}`,
      roleLabel: ROLE_LABELS[role] || ROLE_LABELS.staff,
    }
  }

  if (action === 'list') {
    const canManage = await isOwner(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限查看工作人员列表' }
    }

    await ensureCollection('merchants')
    const { data } = await db.collection('merchants').get()
    const list = data
      .map(mapStaffItem)
      .filter((item) => item.userId)
      .sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return tb - ta
      })
    return { success: true, list }
  }

  if (action === 'updateRole') {
    const canManage = await isOwner(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限修改工作人员身份' }
    }

    const targetUserId = normalizeUserId(event.targetUserId)
    if (!targetUserId) {
      return { success: false, errMsg: '缺少目标用户' }
    }

    const role = normalizeRole(event.role)
    const existing = await findMerchantByUserId(targetUserId)
    if (!existing) {
      return { success: false, errMsg: '工作人员不存在' }
    }

    if (existing.role === 'owner') {
      return { success: false, errMsg: '无法修改店长身份' }
    }

    await db.collection('merchants').doc(existing._id).update({
      data: {
        role,
        updatedAt: db.serverDate(),
        updatedBy: operatorOpenid,
      },
    })

    await bumpAccessEpoch(targetUserId, 'staff_role_updated')
    return { success: true }
  }

  if (action === 'updateName') {
    const canManage = await isOwner(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限修改工作人员姓名' }
    }

    const targetUserId = normalizeUserId(event.targetUserId)
    if (!targetUserId) {
      return { success: false, errMsg: '缺少目标用户' }
    }

    const name = String(event.name || '').trim()
    if (!name) {
      return { success: false, errMsg: '请填写姓名' }
    }

    const existing = await findMerchantByUserId(targetUserId)
    if (!existing) {
      return { success: false, errMsg: '工作人员不存在' }
    }

    await db.collection('merchants').doc(existing._id).update({
      data: {
        name,
        updatedAt: db.serverDate(),
        updatedBy: operatorOpenid,
      },
    })

    await bumpAccessEpoch(targetUserId, 'staff_name_updated')
    return { success: true }
  }

  if (action === 'remove') {
    const canManage = await isOwner(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限移除工作人员' }
    }

    const targetUserId = normalizeUserId(event.targetUserId)
    if (!targetUserId) {
      return { success: false, errMsg: '缺少目标用户' }
    }

    const existing = await findMerchantByUserId(targetUserId)
    if (!existing) {
      return { success: false, errMsg: '工作人员不存在' }
    }

    if (existing.role === 'owner') {
      return { success: false, errMsg: '无法移除店长账号' }
    }

    await db.collection('merchants').doc(existing._id).remove()
    await bumpAccessEpoch(targetUserId, 'staff_removed')
    return { success: true }
  }

  return { success: false, errMsg: '未知操作' }
}
