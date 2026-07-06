/**
 * 微信订阅消息发送 — notify / bizNotifyEmit 共用。
 * 双模板：订单状态（通用）+ 订单发货（配送中）。
 * 部署前 npm run sync:cloud
 */
const cloud = require('wx-server-sdk')

const SUBSCRIBE_PAGE = 'pagesCustomer/notify/list'

const TMPL_ORDER_STATUS = String(
  process.env.BIZ_NOTIFY_SUBSCRIBE_TMPL_ORDER_STATUS ||
    process.env.BIZ_NOTIFY_SUBSCRIBE_TMPL_ID ||
    'cwn2kT7js9vg2xrVrPboO-r2hwetSTQZYOOpfgK7XPQ',
).trim()

const TMPL_ORDER_SHIP = String(
  process.env.BIZ_NOTIFY_SUBSCRIBE_TMPL_ORDER_SHIP ||
    'ybOSKzUv3HjV70sHqZJB8g-ppSx8_3gP0Ek0XGNxOjM',
).trim()

/** 订单状态模板字段（默认：订单编号 + 温馨提示 + 处理人） */
const STATUS_FIELD_KEYS = parseFieldKeys(
  process.env.BIZ_NOTIFY_SUBSCRIBE_STATUS_KEYS,
  'character_string1,thing2,name3',
)

/** 订单发货模板字段（默认：订单编号 + 商品名称 + 发货时间） */
const SHIP_FIELD_KEYS = parseFieldKeys(
  process.env.BIZ_NOTIFY_SUBSCRIBE_SHIP_KEYS,
  'character_string1,thing2,time3',
)

const SHIP_EVENT_KEYS = new Set(['order.delivering'])

function parseFieldKeys(raw, fallback) {
  const source = String(raw || fallback).trim()
  const keys = source.split(',').map((s) => s.trim()).filter(Boolean)
  return keys.length >= 3 ? keys.slice(0, 3) : fallback.split(',').map((s) => s.trim())
}

function clipField(value, max) {
  const s = String(value || '').trim()
  if (!s) return '-'
  if (s.length <= max) return s
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

function formatSubscribeTimeChina(now = new Date()) {
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
    data[key] = { value: clipField(values[index], max) }
  })
  return data
}

function buildOrderStatusData(payload) {
  return buildDataFromKeys(STATUS_FIELD_KEYS, [
    resolveOrderNo(payload),
    payload.body || payload.title || '-',
    payload.fromName || '系统',
  ])
}

function buildOrderShipData(payload) {
  const ctx = payload.context && typeof payload.context === 'object' ? payload.context : {}
  const goodsHint = String(ctx.goodsName || ctx.summary || '').trim()
  return buildDataFromKeys(SHIP_FIELD_KEYS, [
    resolveOrderNo(payload),
    goodsHint || payload.body || '花束',
    formatSubscribeTimeChina(),
  ])
}

function pickTemplate(payload = {}) {
  const eventKey = String(payload.eventKey || '').trim()
  if (SHIP_EVENT_KEYS.has(eventKey) && TMPL_ORDER_SHIP) {
    return {
      templateId: TMPL_ORDER_SHIP,
      data: buildOrderShipData(payload),
    }
  }
  if (TMPL_ORDER_STATUS) {
    return {
      templateId: TMPL_ORDER_STATUS,
      data: buildOrderStatusData(payload),
    }
  }
  return null
}

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
      miniprogramState: process.env.MINIPROGRAM_STATE || 'formal',
      data: picked.data,
    })
    return { sent: true, templateId: picked.templateId }
  } catch (err) {
    console.warn('[subscribeMessage] send failed:', openid, err.errCode || err.code, picked.templateId)
    return { sent: false, errCode: err.errCode || err.code, templateId: picked.templateId }
  }
}

function getSubscribeTemplateId() {
  return TMPL_ORDER_STATUS
}

function getSubscribeTemplateIds() {
  return [...new Set([TMPL_ORDER_STATUS, TMPL_ORDER_SHIP].filter(Boolean))]
}

module.exports = {
  TMPL_ORDER_STATUS,
  TMPL_ORDER_SHIP,
  SUBSCRIBE_PAGE,
  sendBizSubscribeMessage,
  getSubscribeTemplateId,
  getSubscribeTemplateIds,
  buildOrderStatusData,
  buildOrderShipData,
}
