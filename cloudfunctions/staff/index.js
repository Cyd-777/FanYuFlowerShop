const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()

/** 店长 OpenID 白名单（与 login 云函数保持一致） */
const OWNER_OPENIDS = [
  'oiDICxmmuGHJTKQzDsG9X32n2fAs',
]

async function isOwner(openid) {
  if (OWNER_OPENIDS.includes(openid)) return true

  const { data } = await db.collection('merchants').where({ openid }).limit(1).get()
  if (data.length === 0) return false
  return data[0].role === 'owner' || !data[0].role
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

    const { targetOpenid, name } = event
    if (!targetOpenid) {
      return { success: false, errMsg: '无效的身份码' }
    }

    const { data: existing } = await db
      .collection('merchants')
      .where({ openid: targetOpenid })
      .limit(1)
      .get()

    if (existing.length > 0) {
      return { success: false, errMsg: '该人员已是工作人员' }
    }

    await db.collection('merchants').add({
      data: {
        openid: targetOpenid,
        name: name || '工作人员',
        role: 'staff',
        addedBy: operatorOpenid,
        createdAt: db.serverDate(),
      },
    })

    return { success: true }
  }

  if (action === 'remove') {
    const canManage = await isOwner(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限移除工作人员' }
    }

    const { targetOpenid } = event
    if (!targetOpenid) {
      return { success: false, errMsg: '缺少目标 OpenID' }
    }

    if (OWNER_OPENIDS.includes(targetOpenid)) {
      return { success: false, errMsg: '无法移除店长账号' }
    }

    const { data } = await db.collection('merchants').where({ openid: targetOpenid }).limit(1).get()
    if (data.length === 0) {
      return { success: false, errMsg: '工作人员不存在' }
    }

    await db.collection('merchants').doc(data[0]._id).remove()
    return { success: true }
  }

  return { success: false, errMsg: '未知操作' }
}
