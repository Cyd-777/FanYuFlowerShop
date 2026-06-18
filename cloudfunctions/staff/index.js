const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()

/** 店长 OpenID 白名单（与 login 云函数保持一致） */
const OWNER_OPENIDS = [
  'oiDICxmmuGHJTKQzDsG9X32n2fAs',
]

const ASSIGNABLE_ROLES = ['manager', 'staff']

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

function normalizeOpenid(raw) {
  const text = String(raw || '').trim()
  if (!text) return ''

  const prefix = 'fanuy:identity:'
  if (text.startsWith(prefix)) {
    return text.slice(prefix.length)
  }

  if (/^o[A-Za-z0-9_-]{20,}$/.test(text)) {
    return text
  }

  return ''
}

function normalizeRole(role) {
  return ASSIGNABLE_ROLES.includes(role) ? role : 'staff'
}

async function isOwner(openid) {
  if (OWNER_OPENIDS.includes(openid)) return true

  try {
    const { data } = await db.collection('merchants').where({ openid }).limit(1).get()
    if (data.length === 0) return false
    return data[0].role === 'owner' || !data[0].role
  } catch (err) {
    if (isCollectionMissingError(err)) return OWNER_OPENIDS.includes(openid)
    throw err
  }
}

async function findMerchantByOpenid(openid) {
  await ensureCollection('merchants')
  const { data } = await db.collection('merchants').where({ openid }).limit(1).get()
  return data[0] || null
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const operatorOpenid = wxContext.OPENID
  const { action } = event

  if (!operatorOpenid) {
    return { success: false, errMsg: '无法获取操作者身份' }
  }

  if (action === 'list') {
    const canManage = await isOwner(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限查看工作人员列表' }
    }

    await ensureCollection('merchants')
    const { data } = await db.collection('merchants').orderBy('createdAt', 'desc').get()
    return {
      success: true,
      list: data.map((item) => ({
        _id: item._id,
        openid: item.openid,
        name: item.name || '工作人员',
        role: item.role || 'staff',
        createdAt: item.createdAt,
      })),
    }
  }

  if (action === 'add') {
    const canManage = await isOwner(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限添加工作人员' }
    }

    const targetOpenid = normalizeOpenid(event.targetOpenid)
    if (!targetOpenid) {
      return { success: false, errMsg: 'OpenID 格式无效' }
    }

    if (OWNER_OPENIDS.includes(targetOpenid)) {
      return { success: false, errMsg: '该账号已是店长，无需添加' }
    }

    const existing = await findMerchantByOpenid(targetOpenid)
    if (existing) {
      return { success: false, errMsg: '该人员已是工作人员' }
    }

    const role = normalizeRole(event.role)
    const name = String(event.name || '').trim() || '工作人员'

    await db.collection('merchants').add({
      data: {
        openid: targetOpenid,
        name,
        role,
        addedBy: operatorOpenid,
        createdAt: db.serverDate(),
      },
    })

    return { success: true }
  }

  if (action === 'updateRole') {
    const canManage = await isOwner(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限修改工作人员身份' }
    }

    const targetOpenid = normalizeOpenid(event.targetOpenid)
    if (!targetOpenid) {
      return { success: false, errMsg: 'OpenID 格式无效' }
    }

    if (OWNER_OPENIDS.includes(targetOpenid)) {
      return { success: false, errMsg: '无法修改店长身份' }
    }

    const role = normalizeRole(event.role)
    const existing = await findMerchantByOpenid(targetOpenid)
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

    return { success: true }
  }

  if (action === 'updateName') {
    const canManage = await isOwner(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限修改工作人员姓名' }
    }

    const targetOpenid = normalizeOpenid(event.targetOpenid)
    if (!targetOpenid) {
      return { success: false, errMsg: 'OpenID 格式无效' }
    }

    const name = String(event.name || '').trim()
    if (!name) {
      return { success: false, errMsg: '请填写姓名' }
    }

    const existing = await findMerchantByOpenid(targetOpenid)
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

    return { success: true }
  }

  if (action === 'remove') {
    const canManage = await isOwner(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限移除工作人员' }
    }

    const targetOpenid = normalizeOpenid(event.targetOpenid)
    if (!targetOpenid) {
      return { success: false, errMsg: '缺少目标 OpenID' }
    }

    if (OWNER_OPENIDS.includes(targetOpenid)) {
      return { success: false, errMsg: '无法移除店长账号' }
    }

    const existing = await findMerchantByOpenid(targetOpenid)
    if (!existing) {
      return { success: false, errMsg: '工作人员不存在' }
    }

    await db.collection('merchants').doc(existing._id).remove()
    return { success: true }
  }

  return { success: false, errMsg: '未知操作' }
}
