/**
 * 业务通知 emit：订单 / 库存事件写 biz_notifications + 尝试订阅消息双发。
 * 部署前 npm run sync:cloud
 */
const cloud = require('wx-server-sdk')
const { bumpCacheModule } = require('./cacheMeta')
const { sendBizSubscribeMessage } = require('./subscribeMessage')
const { resolveUserByWechatMp } = require('./account')

const COLLECTION = 'biz_notifications'
const LOW_STOCK_THRESHOLD = 5

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

async function sendSubscribeMessage(openid, payload) {
  return sendBizSubscribeMessage(openid, payload)
}

async function findMerchantByUserId(userId) {
  const id = String(userId || '').trim()
  if (!id) return null
  const { data } = await getDb().collection('merchants').where({ userId: id }).limit(1).get()
  return data[0] || null
}

async function listAllMerchantRecipients() {
  await ensureCollection('merchants')
  const { data } = await getDb().collection('merchants').get()
  return data
    .map((item) => ({
      userId: String(item.userId || '').trim(),
      openid: String(item.openid || '').trim(),
      name: item.name || item.nickName || '工作人员',
    }))
    .filter((item) => item.userId)
}

async function hasIdempotencyKey(key) {
  const id = String(key || '').trim()
  if (!id) return false
  await ensureCollection(COLLECTION)
  const res = await getDb().collection(COLLECTION).where({ idempotencyKey: id }).limit(1).count()
  return (res.total || 0) > 0
}

async function insertNotification(recipient, payload) {
  const toUserId = String(recipient.userId || '').trim()
  if (!toUserId) return { inserted: false }

  const baseKey = String(payload.idempotencyKey || '').trim()
  const idempotencyKey = baseKey ? `${baseKey}:${toUserId}` : ''
  if (idempotencyKey && (await hasIdempotencyKey(idempotencyKey))) {
    return { inserted: false, skipped: true }
  }

  const db = getDb()
  await ensureCollection(COLLECTION)

  await db.collection(COLLECTION).add({
    data: {
      toUserId,
      fromUserId: '',
      fromName: '系统',
      type: payload.type || 'system',
      category: payload.category || '',
      eventKey: payload.eventKey || '',
      audience: payload.audience || '',
      title: payload.title || '',
      body: payload.body || '',
      context: payload.context && typeof payload.context === 'object' ? payload.context : {},
      channel: 'in_app',
      source: 'system',
      idempotencyKey: idempotencyKey || '',
      read: false,
      createdAt: db.serverDate(),
    },
  })

  await sendSubscribeMessage(recipient.openid, {
    title: payload.title,
    body: payload.body,
    fromName: '系统',
    eventKey: payload.eventKey,
    context: payload.context,
  })

  return { inserted: true }
}

async function emitToRecipients(recipients, payload) {
  let inserted = 0
  for (const recipient of recipients) {
    const result = await insertNotification(recipient, payload)
    if (result.inserted) inserted += 1
  }
  if (inserted > 0) {
    try {
      await bumpCacheModule('notify')
    } catch (err) {
      console.warn('[bizNotifyEmit] bump notify cache failed:', err.message || err)
    }
  }
  return { inserted }
}

function normalizeOrderStatus(status) {
  const s = String(status || '').trim()
  return s === 'processing' ? 'preparing' : s
}

function summarizeOrderItems(items) {
  const list = Array.isArray(items) ? items : []
  if (!list.length) return '商品'
  const first = list[0]
  const name = String(first.goodsName || first.name || '商品').trim()
  if (list.length === 1) return name
  return `${name} 等${list.length}件`
}

function orderLinkPaths(orderId) {
  const id = String(orderId || '').trim()
  return {
    customer: `/pagesCustomer/order/detail?id=${id}`,
    merchant: `/pagesMerchant/order/detail?id=${id}`,
  }
}

function goodsLinkPath(goodsId) {
  return `/pagesMerchant/goods/edit?id=${encodeURIComponent(String(goodsId || '').trim())}`
}

async function resolveCustomerRecipient(customerOpenid) {
  const openid = String(customerOpenid || '').trim()
  if (!openid) return null
  try {
    const user = await resolveUserByWechatMp(openid)
    const userId = String(user?.userId || '').trim()
    if (!userId) return null
    return { userId, openid, name: user.nickName || '顾客' }
  } catch (err) {
    console.warn('[bizNotifyEmit] resolve customer failed:', err.message || err)
    return null
  }
}

async function notifyOrderCreated(orderDoc, customerOpenid, stockApplied = []) {
  const orderId = orderDoc._id || ''
  const orderNo = orderDoc.orderNo || ''
  const links = orderLinkPaths(orderId)
  const summary = summarizeOrderItems(orderDoc.items)
  const addr = orderDoc.address || {}

  const customer = await resolveCustomerRecipient(customerOpenid)
  if (customer) {
    await emitToRecipients([customer], {
      eventKey: 'order.created',
      category: 'order',
      audience: 'customer',
      type: 'order_context',
      title: `订单 ${orderNo}`,
      body: '已提交，等待商家确认',
      idempotencyKey: `order.created:${orderId}:${customer.userId}`,
      context: { orderId, orderNo, linkPath: links.customer },
    })
  }

  const merchants = await listAllMerchantRecipients()
  const customerName = customer?.name || '顾客'
  const addrParts = [addr.province, addr.city, addr.district, addr.detail || addr.address]
    .filter(Boolean)
  const deliveryAddress = addrParts.length ? addrParts.join(' ') : (addr.fullAddress || '到店自取')

  await emitToRecipients(merchants, {
    eventKey: 'order.new',
    category: 'order',
    audience: 'merchant',
    type: 'order_context',
    title: '新订单',
    body: `${customerName} · ${summary}`,
    idempotencyKey: `order.new:${orderId}`,
    context: {
      orderId,
      orderNo,
      linkPath: links.merchant,
      customerName,
      summary,
      deliveryAddress,
    },
  })

  for (const entry of stockApplied) {
    await notifyStockMovement({
      goodsId: entry.goodsId,
      goodsName: entry.goodsName,
      stockBefore: entry.stockBefore,
      stockAfter: entry.stockAfter,
    })
  }
}

async function notifyOrderCancelled(orderDoc) {
  const orderId = orderDoc._id || ''
  const orderNo = orderDoc.orderNo || ''
  const links = orderLinkPaths(orderId)

  const customer = await resolveCustomerRecipient(orderDoc.customerOpenid)
  if (customer) {
    await emitToRecipients([customer], {
      eventKey: 'order.cancelled',
      category: 'order',
      audience: 'customer',
      type: 'order_context',
      title: `订单 ${orderNo}`,
      body: '订单已取消',
      idempotencyKey: `order.cancelled:${orderId}:${customer.userId}`,
      context: { orderId, orderNo, linkPath: links.customer },
    })
  }

  const merchants = await listAllMerchantRecipients()
  await emitToRecipients(merchants, {
    eventKey: 'order.cancelled',
    category: 'order',
    audience: 'merchant',
    type: 'order_context',
    title: '订单已取消',
    body: `#${orderNo}`,
    idempotencyKey: `order.cancelled:${orderId}:merchants`,
    context: { orderId, orderNo, linkPath: links.merchant },
  })
}

async function notifyOrderStatusChange(beforeDoc, afterDoc) {
  const before = normalizeOrderStatus(beforeDoc.status)
  const after = normalizeOrderStatus(afterDoc.status)
  if (before === after) return

  const orderId = afterDoc._id || ''
  const orderNo = afterDoc.orderNo || ''
  const links = orderLinkPaths(orderId)
  const ctxBase = { orderId, orderNo }

  const customer = await resolveCustomerRecipient(afterDoc.customerOpenid)
  const customerEvents = []

  if (after === 'accepted') {
    customerEvents.push({
      eventKey: 'order.accepted',
      body: '商家已确认，正在准备',
    })
  }
  if (after === 'ready' && afterDoc.deliveryMethod === 'pickup') {
    customerEvents.push({
      eventKey: 'order.ready_pickup',
      body: '已备好，请到店取货',
    })
  }
  if (after === 'delivering') {
    customerEvents.push({
      eventKey: 'order.delivering',
      body: '花束配送中',
    })
  }
  if (after === 'completed') {
    customerEvents.push({
      eventKey: 'order.completed',
      body: '订单已完成',
    })
  }

  if (customer) {
    for (const evt of customerEvents) {
      await emitToRecipients([customer], {
        eventKey: evt.eventKey,
        category: 'order',
        audience: 'customer',
        type: 'order_context',
        title: `订单 ${orderNo}`,
        body: evt.body,
        idempotencyKey: `${evt.eventKey}:${orderId}:${customer.userId}`,
        context: { ...ctxBase, linkPath: links.customer },
      })
    }
  }
}

async function notifyOrderPendingTimeout(orderDoc, audience, minutesThreshold) {
  const orderId = orderDoc._id || ''
  const orderNo = orderDoc.orderNo || ''
  const links = orderLinkPaths(orderId)
  const minutes = Number(minutesThreshold) || 0

  if (audience === 'customer') {
    const customer = await resolveCustomerRecipient(orderDoc.customerOpenid)
    if (!customer) return
    await emitToRecipients([customer], {
      eventKey: 'order.pending_timeout',
      category: 'order',
      audience: 'customer',
      type: 'order_context',
      title: `订单 ${orderNo}`,
      body: `仍在等待确认（已 ${minutes} 分钟）`,
      idempotencyKey: `order.pending_timeout:${orderId}:customer:${minutes}`,
      context: { orderId, orderNo, linkPath: links.customer },
    })
    return
  }

  const merchants = await listAllMerchantRecipients()
  await emitToRecipients(merchants, {
    eventKey: 'order.pending_timeout',
    category: 'order',
    audience: 'merchant',
    type: 'order_context',
    title: '订单待确认',
    body: `#${orderNo} 待确认 ${minutes} 分钟`,
    idempotencyKey: `order.pending_timeout:${orderId}:merchant:${minutes}`,
    context: { orderId, orderNo, linkPath: links.merchant },
  })
}

async function notifyOrderDailySummary({ dateKey, orderCount, totalAmountYuan }) {
  const merchants = await listAllMerchantRecipients()
  if (!merchants.length) return

  const count = Number(orderCount) || 0
  const amount = Number(totalAmountYuan) || 0
  const amountText = amount % 1 === 0 ? String(amount) : amount.toFixed(2)

  await emitToRecipients(merchants, {
    eventKey: 'order.daily_summary',
    category: 'order',
    audience: 'merchant',
    type: 'order_context',
    title: '今日订单汇总',
    body: `今日 ${count} 单，¥${amountText}`,
    idempotencyKey: `order.daily_summary:${dateKey}`,
    context: { linkPath: '/pagesMerchant/order/list' },
  })
}

async function notifyStockSlowMoving({ goodsId, goodsName, stock, days }) {
  const id = String(goodsId || '').trim()
  if (!id) return
  const name = String(goodsName || '商品').trim()
  const merchants = await listAllMerchantRecipients()
  if (!merchants.length) return

  await emitToRecipients(merchants, {
    eventKey: 'stock.slow_moving',
    category: 'stock',
    audience: 'merchant',
    type: 'goods_context',
    title: '滞销预警',
    body: `「${name}」${days} 天无销量，剩余 ${stock}`,
    idempotencyKey: `stock.slow_moving:${id}:${days}`,
    context: { goodsId: id, goodsName: name, linkPath: goodsLinkPath(id) },
  })
}

async function notifyStockMovement({ goodsId, goodsName, stockBefore, stockAfter }) {
  const id = String(goodsId || '').trim()
  if (!id) return

  const before = Number(stockBefore) || 0
  const after = Number(stockAfter) || 0
  const name = String(goodsName || '商品').trim()
  const merchants = await listAllMerchantRecipients()
  if (!merchants.length) return

  const linkPath = goodsLinkPath(id)
  const ctx = { goodsId: id, goodsName: name, linkPath }

  if (before > 0 && after === 0) {
    await emitToRecipients(merchants, {
      eventKey: 'stock.sold_out',
      category: 'stock',
      audience: 'merchant',
      type: 'goods_context',
      title: '商品售罄',
      body: `「${name}」库存已归零`,
      idempotencyKey: `stock.sold_out:${id}`,
      context: ctx,
    })
    return
  }

  if (before > LOW_STOCK_THRESHOLD && after > 0 && after <= LOW_STOCK_THRESHOLD) {
    await emitToRecipients(merchants, {
      eventKey: 'stock.low',
      category: 'stock',
      audience: 'merchant',
      type: 'goods_context',
      title: '库存偏低',
      body: `「${name}」剩余 ${after}`,
      idempotencyKey: `stock.low:${id}:${after}`,
      context: ctx,
    })
  }
}

function safeFireAndForget(promiseFactory) {
  Promise.resolve()
    .then(() => promiseFactory())
    .catch((err) => {
      console.warn('[bizNotifyEmit] async notify failed:', err.message || err)
    })
}

module.exports = {
  COLLECTION,
  LOW_STOCK_THRESHOLD,
  notifyOrderCreated,
  notifyOrderCancelled,
  notifyOrderStatusChange,
  notifyOrderPendingTimeout,
  notifyOrderDailySummary,
  notifyStockSlowMoving,
  notifyStockMovement,
  safeFireAndForget,
  emitToRecipients,
  listAllMerchantRecipients,
}
