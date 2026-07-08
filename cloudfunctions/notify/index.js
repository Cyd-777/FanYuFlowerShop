const cloud = require('wx-server-sdk')
const { bumpCacheModule } = require('./common/cacheMeta')
const { bumpCacheEvent } = require('./common/cacheInvalidation')
const { resolveUserByWechatMp } = require('./common/account')
const {
  ROLE_LABELS,
  resolveMerchantActor,
  findMerchantByUserId,
  ensureCollection,
} = require('./common/merchantGate')
const {
  sendBizSubscribeMessage,
  getSubscribeTemplateId,
  getSubscribeTemplateIds,
} = require('./common/subscribeMessage')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()
const _ = db.command

const COLLECTION = 'biz_notifications'

const NOTIFY_CHANNELS = ['in_app', 'subscribe_message']

async function recordSubscribeAcceptance(userId, tmplIds, options = {}) {
  const ids = [...new Set((tmplIds || []).map((id) => String(id || '').trim()).filter(Boolean))]
  if (!ids.length) return { recorded: 0 }

  const payload = {
    bizNotifySubscribe: {
      tmplIds: ids,
      acceptedAt: db.serverDate(),
    },
  }

  if (options.isMerchant) {
    await ensureCollection('merchants')
    const merchant = await findMerchantByUserId(userId)
    if (!merchant?._id) {
      return { recorded: 0 }
    }
    await db.collection('merchants').doc(merchant._id).update({ data: payload })
    return { recorded: ids.length }
  }

  await ensureCollection('users')
  const { data } = await db.collection('users').where({ userId }).limit(1).get()
  const userDoc = data[0]
  if (!userDoc?._id) {
    return { recorded: 0 }
  }
  await db.collection('users').doc(userDoc._id).update({ data: payload })
  return { recorded: ids.length }
}

async function sendSubscribeMessageToRecipient(recipient, payload) {
  const openid = String(recipient?.openid || '').trim()
  return sendBizSubscribeMessage(openid, payload)
}

function pickNotification(doc) {
  return {
    _id: doc._id,
    toUserId: doc.toUserId || '',
    fromUserId: doc.fromUserId || '',
    fromName: doc.fromName || '',
    type: doc.type || 'staff_message',
    category: doc.category || '',
    eventKey: doc.eventKey || '',
    audience: doc.audience || '',
    title: doc.title || '',
    body: doc.body || '',
    context: doc.context || {},
    channel: doc.channel || 'in_app',
    read: doc.read === true,
    createdAt: doc.createdAt,
  }
}

function normalizeType(raw) {
  const type = String(raw || '').trim()
  if (['staff_message', 'order_context', 'goods_context', 'system'].includes(type)) {
    return type
  }
  return 'staff_message'
}

function buildDefaultTitle(type, context = {}) {
  if (type === 'order_context') {
    const orderNo = String(context.orderNo || '').trim()
    return orderNo ? `订单通知 · ${orderNo}` : '订单通知'
  }
  if (type === 'goods_context') {
    const name = String(context.goodsName || '').trim()
    return name ? `商品通知 · ${name}` : '商品通知'
  }
  if (type === 'system') return '系统通知'
  return '同事消息'
}

async function resolveNotifyActor(openid) {
  const merchant = await resolveMerchantActor(openid)
  if (merchant?.userId) {
    return {
      userId: merchant.userId,
      openid,
      isMerchant: true,
      displayName: merchant.displayName,
    }
  }

  const user = await resolveUserByWechatMp(openid)
  const userId = String(user?.userId || '').trim()
  if (!userId) return null

  return {
    userId,
    openid,
    isMerchant: false,
    displayName: user.nickName || '花友',
  }
}

async function listNotifications(userId, options = {}) {
  await ensureCollection(COLLECTION)
  const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 100)
  const category = String(options.category || '').trim()

  let query = db.collection(COLLECTION).where({ toUserId: userId })
  if (category === 'order' || category === 'stock') {
    query = db.collection(COLLECTION).where({ toUserId: userId, category })
  }

  const { data } = await query.orderBy('createdAt', 'desc').limit(limit).get()
  return data.map(pickNotification)
}

async function countUnread(userId) {
  await ensureCollection(COLLECTION)
  const res = await db
    .collection(COLLECTION)
    .where({ toUserId: userId, read: false })
    .count()
  return res.total || 0
}

async function markNotificationsRead(userId, ids = [], markAll = false) {
  await ensureCollection(COLLECTION)
  if (markAll) {
    await db
      .collection(COLLECTION)
      .where({ toUserId: userId, read: false })
      .update({
        data: { read: true, readAt: db.serverDate() },
      })
    return { updated: 'all' }
  }

  const idList = (ids || []).map((id) => String(id || '').trim()).filter(Boolean)
  if (!idList.length) {
    return { updated: 0 }
  }

  let updated = 0
  for (const id of idList) {
    const { data } = await db.collection(COLLECTION).doc(id).get()
    if (!data || data.toUserId !== userId) continue
    await db.collection(COLLECTION).doc(id).update({
      data: { read: true, readAt: db.serverDate() },
    })
    updated += 1
  }
  return { updated }
}

async function listRecipientStaff(excludeUserId) {
  await ensureCollection('merchants')
  const { data } = await db.collection('merchants').get()
  return data
    .filter((item) => {
      const uid = String(item.userId || '').trim()
      return uid && uid !== excludeUserId
    })
    .map((item) => ({
      userId: item.userId,
      name: item.name || item.nickName || '工作人员',
      role: item.role || 'staff',
      roleLabel: ROLE_LABELS[item.role] || ROLE_LABELS.staff,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
}

async function sendNotifications(actor, payload) {
  const toUserIds = [...new Set((payload.toUserIds || []).map((id) => String(id || '').trim()).filter(Boolean))]
  if (!toUserIds.length) {
    throw new Error('请选择接收人')
  }

  const type = normalizeType(payload.type)
  const context = payload.context && typeof payload.context === 'object' ? payload.context : {}
  const title = String(payload.title || '').trim() || buildDefaultTitle(type, context)
  const body = String(payload.body || '').trim()
  if (!body) {
    throw new Error('请填写通知内容')
  }

  const channel = NOTIFY_CHANNELS.includes(payload.channel) ? payload.channel : 'in_app'
  await ensureCollection(COLLECTION)

  const created = []
  let subscribeSent = 0
  let subscribeFailed = 0

  for (const toUserId of toUserIds) {
    if (toUserId === actor.userId) continue

    const recipient = await findMerchantByUserId(toUserId)

    const addRes = await db.collection(COLLECTION).add({
      data: {
        toUserId,
        fromUserId: actor.userId,
        fromName: actor.displayName,
        type,
        title,
        body,
        context,
        channel,
        source: 'internal',
        read: false,
        createdAt: db.serverDate(),
      },
    })
    created.push(addRes._id)

    const subResult = await sendSubscribeMessageToRecipient(recipient, {
      title,
      body,
      fromName: actor.displayName,
    })
    if (subResult.sent) {
      subscribeSent += 1
    } else if (!subResult.skipped) {
      subscribeFailed += 1
    }
  }

  if (!created.length) {
    throw new Error('没有有效的接收人')
  }

  await bumpCacheModule('notify')
  return { sent: created.length, ids: created, subscribeSent, subscribeFailed }
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const operatorOpenid = wxContext.OPENID
  const action = String(event.action || '').trim()

  try {
    if (action === 'unreadCount') {
      const actor = await resolveNotifyActor(operatorOpenid)
      if (!actor?.userId) {
        return { success: true, unread: 0, isMerchant: false }
      }
      const unread = await countUnread(actor.userId)
      return { success: true, unread, isMerchant: actor.isMerchant }
    }

    if (action === 'list') {
      const actor = await resolveNotifyActor(operatorOpenid)
      if (!actor?.userId) {
        return { success: false, errMsg: '请先登录' }
      }
      const list = await listNotifications(actor.userId, {
        limit: event.limit,
        category: event.category,
      })
      const unread = await countUnread(actor.userId)
      return { success: true, list, unread, isMerchant: actor.isMerchant }
    }

    if (action === 'markRead') {
      const actor = await resolveNotifyActor(operatorOpenid)
      if (!actor?.userId) {
        return { success: false, errMsg: '请先登录' }
      }
      const ids = Array.isArray(event.ids) ? event.ids : event.id ? [event.id] : []
      const result = await markNotificationsRead(actor.userId, ids, event.all === true)
      const unread = await countUnread(actor.userId)
      await bumpCacheModule('notify')
      return { success: true, ...result, unread }
    }

    if (action === 'listRecipients') {
      const actor = await resolveMerchantActor(operatorOpenid)
      if (!actor?.userId) {
        return { success: false, errMsg: '仅商家团队成员可发送通知' }
      }
      const list = await listRecipientStaff(actor.userId)
      return { success: true, list }
    }

    if (action === 'getSubscribeConfig') {
      const tmplIds = getSubscribeTemplateIds()
      return { success: true, tmplIds, tmplId: tmplIds[0] || '' }
    }

    if (action === 'testSubscribe') {
      const tmplId = getSubscribeTemplateIds()[0] || ''
      const payload = {
        eventKey: 'order.new',
        title: '新订单',
        body: '顾客 · 鲜花',
        fromName: '梵宇花店',
        context: {
          orderNo: 'TEST20260706',
          customerName: '花友',
          summary: '红玫瑰 3枝',
          deliveryAddress: '北京市朝阳区建国路88号',
        },
      }
      const result = await sendBizSubscribeMessage(operatorOpenid, payload)
      return { success: true, sent: result.sent, errCode: result.errCode, errMsg: result.errMsg }
    }

    if (action === 'recordSubscribe') {
      const actor = await resolveNotifyActor(operatorOpenid)
      if (!actor?.userId) {
        return { success: false, errMsg: '请先登录' }
      }
      const tmplIds = Array.isArray(event.tmplIds) ? event.tmplIds : []
      const result = await recordSubscribeAcceptance(actor.userId, tmplIds, {
        isMerchant: actor.isMerchant,
      })
      return { success: true, ...result }
    }

    /** @deprecated §C 同事协作 · 非产品范围；保留仅供兼容，勿扩展 */
    if (action === 'send') {
      const actor = await resolveMerchantActor(operatorOpenid)
      if (!actor?.userId) {
        return { success: false, errMsg: '仅商家团队成员可发送通知' }
      }
      const result = await sendNotifications(actor, {
        toUserIds: event.toUserIds,
        title: event.title,
        body: event.body,
        type: event.type,
        context: event.context,
        channel: event.channel,
      })
      return { success: true, ...result }
    }

    return { success: false, errMsg: '未知操作' }
  } catch (err) {
    return {
      success: false,
      errMsg: err.message || err.errMsg || '通知服务异常',
    }
  }
}
