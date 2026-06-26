const cloud = require('wx-server-sdk')
const {
  pickUser,
  resolveUserByWechatMp,
  resolveUserByPhone,
  saveSmsCode,
  verifySmsCode,
  randomSmsCode,
  normalizePhone,
} = require('./common/account')
const { getAccessEpoch } = require('./common/accessControl')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()

/** 黑箱录入的商家 OpenID（上线前迁移至 merchants 集合） */
const MERCHANT_OPENIDS = [
  'oiDICxmmuGHJTKQzDsG9X32n2fAs',
]

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

async function resolveMerchant(userId, operatorOpenid) {
  let isMerchant = MERCHANT_OPENIDS.includes(operatorOpenid)
  let merchantName = ''

  if (!userId) {
    return { isMerchant, merchantName }
  }

  try {
    await ensureCollection('merchants')
    if (userId) {
      const { data } = await db.collection('merchants').where({ userId }).limit(1).get()
      if (data.length > 0) {
        isMerchant = true
        merchantName = data[0].name || ''
      }
    }
    if (!merchantName && operatorOpenid) {
      const { data } = await db.collection('merchants').where({ openid: operatorOpenid }).limit(1).get()
      if (data.length > 0) {
        isMerchant = true
        merchantName = data[0].name || ''
      }
    }
  } catch (err) {
    if (!isCollectionMissingError(err)) throw err
  }

  return { isMerchant, merchantName }
}

async function buildSession(openid, userDoc) {
  const profile = pickUser(userDoc)
  const userId = profile?.userId || ''
  const { isMerchant, merchantName } = await resolveMerchant(userId, openid)
  const accessEpoch = await getAccessEpoch(userId)
  return {
    success: true,
    userId,
    isMerchant,
    merchantName,
    accessEpoch,
    profile: profile || {},
  }
}

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action } = event

  if (!openid && action !== 'sendSmsCode') {
    return {
      success: false,
      errMsg: '无法获取 openid，请确认已开通云开发',
      userId: '',
      isMerchant: false,
      accessEpoch: 0,
    }
  }

  if (action === 'sendSmsCode') {
    const phone = normalizePhone(event.phone)
    if (!phone) {
      return { success: false, errMsg: '手机号格式不正确' }
    }

    try {
      const code = randomSmsCode()
      await saveSmsCode(phone, code)
      const result = { success: true, message: '验证码已发送', devCode: code }
      return result
    } catch (err) {
      return { success: false, errMsg: err.message || '发送验证码失败' }
    }
  }

  if (action === 'loginPhone') {
    const phone = normalizePhone(event.phone)
    const code = String(event.code || '').trim()
    if (!phone) {
      return { success: false, errMsg: '手机号格式不正确' }
    }
    if (!code) {
      return { success: false, errMsg: '请填写验证码' }
    }

    try {
      const ok = await verifySmsCode(phone, code)
      if (!ok) {
        return { success: false, errMsg: '验证码错误或已过期' }
      }
      const userDoc = await resolveUserByPhone(phone, openid)
      return await buildSession(openid, userDoc)
    } catch (err) {
      return {
        success: false,
        errMsg: err.message || err.errMsg || '手机号登录失败',
      }
    }
  }

  if (action === 'loginWechat' || action === 'login' || action === 'checkAccess') {
    try {
      const userDoc = await resolveUserByWechatMp(openid)
      return await buildSession(openid, userDoc)
    } catch (err) {
      return {
        success: false,
        errMsg: err.message || err.errMsg || '微信登录失败',
        isMerchant: false,
        accessEpoch: 0,
      }
    }
  }

  if (action === 'getProfile') {
    try {
      const userDoc = await resolveUserByWechatMp(openid)
      const profile = pickUser(userDoc)
      return { success: true, profile: profile || {} }
    } catch (err) {
      return { success: false, errMsg: err.message || '获取资料失败' }
    }
  }

  if (action === 'saveProfile') {
    const profile = event.profile || {}
    const nickName = String(profile.nickName || '').trim()
    const avatarUrl = String(profile.avatarUrl || '').trim()

    if (!nickName) {
      return { success: false, errMsg: '请填写昵称' }
    }

    try {
      const userDoc = await resolveUserByWechatMp(openid)
      if (!userDoc?._id) {
        return { success: false, errMsg: '用户不存在' }
      }

      await db.collection('users').doc(userDoc._id).update({
        data: {
          nickName,
          avatarUrl,
          updatedAt: db.serverDate(),
        },
      })

      const refreshed = await resolveUserByWechatMp(openid)
      const saved = pickUser(refreshed)
      if (!saved?.userId) {
        return { success: false, errMsg: '保存后读取资料失败' }
      }

      return {
        success: true,
        profile: saved,
      }
    } catch (err) {
      return { success: false, errMsg: err.message || '保存资料失败' }
    }
  }

  try {
    const userDoc = await resolveUserByWechatMp(openid)
    return await buildSession(openid, userDoc)
  } catch (err) {
    return {
      success: false,
      errMsg: err.message || '登录失败',
      isMerchant: false,
      accessEpoch: 0,
    }
  }
}
