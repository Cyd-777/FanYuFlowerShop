/**
 * 微信订阅消息发送 — notify / bizNotifyEmit 共用。
 * 三模板：订单状态（顾客）· 订单发货（顾客）· 新订单提醒（商家）。
 * 部署前 npm run sync:cloud
 */
const cloud = require('wx-server-sdk')

const SUBSCRIBE_PAGE = 'pagesCustomer/notify/list'

// ---- 模板 ID（环境变量优先，其次硬编码） ----

const TMPL_ORDER_STATUS = String(
  process.env.BIZ_NOTIFY_SUBSCRIBE_TMPL_ORDER_STATUS ||
    process.env.BIZ_NOTIFY_SUBSCRIBE_TMPL_ID ||
    'cwn2kT7js9vg2xrVrPboO-r2hwetSTQZYOOpfgK7XPQ',
).trim()

const TMPL_ORDER_SHIP = String(
  process.env.BIZ_NOTIFY_SUBSCRIBE_TMPL_ORDER_SHIP ||
    'ybOSKzUv3HjV70sHqZJB8sO3O1S8fRByeu5SrES0xlw',
).trim()

const TMPL_NEW_ORDER = String(
  process.env.BIZ_NOTIFY_SUBSCRIBE_TMPL_NEW_ORDER ||
    'OZQrzpx-S-CfOdQ5Z90icMfzHDgjIj7gYNoivGpKBaw',
).trim()

// ---- 字段 key（环境变量可覆盖） ----

const STATUS_FIELD_KEYS = parseFieldKeys(
  process.env.BIZ_NOTIFY_SUBSCRIBE_STATUS_KEYS,
  'character_string2,thing8,phrase3,time1',
)

const SHIP_FIELD_KEYS = parseFieldKeys(
  process.env.BIZ_NOTIFY_SUBSCRIBE_SHIP_KEYS,
  'character_string1,name2,thing9,time4',
)

const NEW_ORDER_FIELD_KEYS = parseFieldKeys(
  process.env.BIZ_NOTIFY_SUBSCRIBE_NEW_ORDER_KEYS,
  'character_string1,thing2,thing5,thing10,time6',
)

// ---- 事件路由表 ----

const ORDER_STATUS_EVENTS = new Set([
  'order.created',
  'order.accepted',
  'order.ready_pickup',
  'order.completed',
  'order.cancelled',
  'order.pending_timeout',
])

const SHIP_EVENTS = new Set(['order.delivering'])

const NEW_ORDER_EVENTS = new Set(['order.new', 'order.daily_summary'])

const STOCK_EVENTS = new Set(['stock.sold_out', 'stock.low', 'stock.slow_moving'])

// ---- 工具函数 ----

function parseFieldKeys(raw, fallback) {
  const source = String(raw || fallback).trim()
  const keys = source.split(',').map((s) => s.trim()).filter(Boolean)
  if (!keys.length) return fallback.split(',').map((s) => s.trim()).filter(Boolean)
  return keys
}

function clipField(value, max, fieldKey) {
  const s = String(value || '').trim()
  if (!s) return '-'
  if (s.length <= max) return s
  if (fieldKey && fieldKey.startsWith('phrase')) {
    return s.slice(0, max)
  }
  return `${s.slice(0, max - 1)}…`
}

function resolveOrderNo(payload = {}) {
  const ctx = payload.context && typeof payload.context === 'object' ? payload.context : {}
  const fromCtx = String(ctx.orderNo || '').trim()
  if (fromCtx) return fromCtx
  const title = String(payload.title || '').trim()
  const match = title.match(/^订单\s*(.+)$/i)
  if (match) return match[1].trim()
  return title || '-'
}

function formatSubscribeTimeChina(now) {
  if (!now || typeof now.getTime !== 'function' || Number.isNaN(now.getTime())) {
    now = new Date()
    if (Number.isNaN(now.getTime())) return '现在'
  }
  const offsetMs = (8 * 60 + now.getTimezoneOffset()) * 60 * 1000
  const local = new Date(now.getTime() + offsetMs)
  const y = local.getUTCFullYear()
  const m = local.getUTCMonth() + 1
  const day = local.getUTCDate()
  const h = String(local.getUTCHours()).padStart(2, '0')
  const min = String(local.getUTCMinutes()).padStart(2, '0')
  return `${y}年${m}月${day}日 ${h}:${min}`
}

function maxLenForFieldKey(key) {
  if (key.startsWith('character_string')) return 32
  if (key.startsWith('name')) return 10
  if (key.startsWith('phrase')) return 5
  if (key.startsWith('time') || key.startsWith('date')) return 32
  return 20
}

function buildDataFromKeys(keys, values) {
  const data = {}
  keys.forEach((key, index) => {
    const max = maxLenForFieldKey(key)
    data[key] = { value: clipField(values[index], max, key) }
  })
  return data
}

// ---- 状态标签映射 ----

function shortStatusLabel(eventKey) {
  const map = {
    'order.created': '已提交',
    'order.accepted': '已确认',
    'order.ready_pickup': '已备好',
    'order.delivering': '配送中',
    'order.completed': '已完成',
    'order.cancelled': '已取消',
    'order.pending_timeout': '待确认',
  }
  return map[eventKey] || '通知'
}

// ---- 各模板数据构建 ----

function buildOrderStatusData(payload) {
  return buildDataFromKeys(STATUS_FIELD_KEYS, [
    resolveOrderNo(payload),
    payload.fromName || '花店',
    shortStatusLabel(payload.eventKey),
    formatSubscribeTimeChina() || '现在',
  ])
}

function buildOrderShipData(payload) {
  const ctx = payload.context && typeof payload.context === 'object' ? payload.context : {}
  const goodsHint = String(ctx.goodsName || ctx.summary || '').trim()
  return buildDataFromKeys(SHIP_FIELD_KEYS, [
    resolveOrderNo(payload),
    ctx.carrier || '花店自送',
    goodsHint || '鲜花',
    formatSubscribeTimeChina() || '现在',
  ])
}

/** 新订单提醒（商家端）：订单号 + 商品信息 + 买家 + 地址 + 时间 */
function buildNewOrderMerchantData(payload) {
  const ctx = payload.context && typeof payload.context === 'object' ? payload.context : {}
  return buildDataFromKeys(NEW_ORDER_FIELD_KEYS, [
    resolveOrderNo(payload),
    ctx.summary || ctx.goodsName || '鲜花',
    ctx.customerName || '顾客',
    ctx.deliveryAddress || '到店自取',
    formatSubscribeTimeChina() || '现在',
  ])
}

// ---- 模板路由 ----

function pickTemplate(payload = {}) {
  const eventKey = String(payload.eventKey || '').trim()

  if (SHIP_EVENTS.has(eventKey) && TMPL_ORDER_SHIP) {
    return { templateId: TMPL_ORDER_SHIP, data: buildOrderShipData(payload) }
  }

  if (ORDER_STATUS_EVENTS.has(eventKey) && TMPL_ORDER_STATUS) {
    return { templateId: TMPL_ORDER_STATUS, data: buildOrderStatusData(payload) }
  }

  if (NEW_ORDER_EVENTS.has(eventKey) && TMPL_NEW_ORDER) {
    return { templateId: TMPL_NEW_ORDER, data: buildNewOrderMerchantData(payload) }
  }

  // 库存事件暂无可用的订阅消息模板 → 跳过推送，app 内通知仍正常写入
  if (STOCK_EVENTS.has(eventKey)) {
    return null
  }

  // 兜底：尝试用订单状态模板
  if (TMPL_ORDER_STATUS) {
    return { templateId: TMPL_ORDER_STATUS, data: buildOrderStatusData(payload) }
  }

  return null
}

// ---- 发送入口 ----

async function sendBizSubscribeMessage(openid, payload = {}) {
  const picked = pickTemplate(payload)
  if (!picked?.templateId || !openid) {
    return { sent: false, skipped: true, reason: 'no_template_or_openid' }
  }
  try {
    await cloud.openapi.subscribeMessage.send({
      touser: openid,
      templateId: picked.templateId,
      page: SUBSCRIBE_PAGE,
      lang: 'zh_CN',
      miniprogramState: process.env.MINIPROGRAM_STATE || 'trial',
      data: picked.data,
    })
    return { sent: true, templateId: picked.templateId }
  } catch (err) {
    const errCode = err.errCode || err.code || 'unknown'
    const errMsg = err.errMsg || err.message || ''
    console.warn('[subscribeMessage] send failed:', openid, errCode, errMsg, picked.templateId)
    return { sent: false, errCode, errMsg, templateId: picked.templateId }
  }
}

function getSubscribeTemplateId() {
  return TMPL_ORDER_STATUS
}

function getSubscribeTemplateIds() {
  return [...new Set([TMPL_ORDER_STATUS, TMPL_ORDER_SHIP, TMPL_NEW_ORDER].filter(Boolean))]
}

module.exports = {
  TMPL_ORDER_STATUS,
  TMPL_ORDER_SHIP,
  TMPL_NEW_ORDER,
  SUBSCRIBE_PAGE,
  sendBizSubscribeMessage,
  getSubscribeTemplateId,
  getSubscribeTemplateIds,
  buildOrderStatusData,
  buildOrderShipData,
  buildNewOrderMerchantData,
}
