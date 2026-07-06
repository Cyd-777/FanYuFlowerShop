const cloud = require('wx-server-sdk')
/**
 * 历史原型：pending 超时 / 日汇总 / 滞销定时扫描。
 * 产品决策（2026-07-05）：不启用云端定时触发器 — 见 docs/类OA通知模块-通知清单与双通道.md §不做·云端定时
 * config.json triggers 为空；勿在控制台创建 timer。
 */
const {
  notifyOrderPendingTimeout,
  notifyOrderDailySummary,
  notifyStockSlowMoving,
} = require('./common/bizNotifyEmit')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const CUSTOMER_PENDING_MINUTES = 30
const MERCHANT_PENDING_MINUTES = 15
const SLOW_MOVING_DAYS = 15

function normalizeCloudDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'number') return new Date(value)
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? null : new Date(parsed)
  }
  if (typeof value === 'object' && value.$date) {
    return new Date(value.$date)
  }
  return null
}

function chinaDateKey(date = new Date()) {
  const offsetMs = 8 * 60 * 60 * 1000
  const cn = new Date(date.getTime() + offsetMs)
  const y = cn.getUTCFullYear()
  const m = String(cn.getUTCMonth() + 1).padStart(2, '0')
  const d = String(cn.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function dayRangeUtcForChina(dateKey) {
  const startCn = Date.parse(`${dateKey}T00:00:00+08:00`)
  const endCn = startCn + 24 * 60 * 60 * 1000
  return { start: new Date(startCn), end: new Date(endCn) }
}

async function runPendingTimeoutCheck() {
  const { data } = await db.collection('orders').where({ status: 'pending' }).limit(200).get()
  const now = Date.now()
  let customerNotified = 0
  let merchantNotified = 0

  for (const doc of data || []) {
    const createdAt = normalizeCloudDate(doc.createdAt)
    if (!createdAt) continue
    const ageMinutes = Math.floor((now - createdAt.getTime()) / 60000)

    if (ageMinutes >= CUSTOMER_PENDING_MINUTES) {
      await notifyOrderPendingTimeout(doc, 'customer', CUSTOMER_PENDING_MINUTES)
      customerNotified += 1
    }
    if (ageMinutes >= MERCHANT_PENDING_MINUTES) {
      await notifyOrderPendingTimeout(doc, 'merchant', MERCHANT_PENDING_MINUTES)
      merchantNotified += 1
    }
  }

  return { success: true, customerNotified, merchantNotified, scanned: (data || []).length }
}

async function runDailySummary() {
  const dateKey = chinaDateKey()
  const { start, end } = dayRangeUtcForChina(dateKey)
  const { data } = await db.collection('orders').orderBy('createdAt', 'desc').limit(500).get()

  let orderCount = 0
  let totalAmount = 0
  for (const doc of data || []) {
    const createdAt = normalizeCloudDate(doc.createdAt)
    if (!createdAt || createdAt < start || createdAt >= end) continue
    if (doc.status === 'cancelled') continue
    orderCount += 1
    totalAmount += Number(doc.totalAmount) || 0
  }

  await notifyOrderDailySummary({
    dateKey,
    orderCount,
    totalAmountYuan: Math.round(totalAmount * 100) / 100,
  })

  return { success: true, dateKey, orderCount, totalAmount }
}

async function runSlowMovingStockCheck() {
  const cutoff = Date.now() - SLOW_MOVING_DAYS * 24 * 60 * 60 * 1000
  const { data } = await db.collection('goods').where({ onSale: true }).limit(200).get()
  let notified = 0

  for (const doc of data || []) {
    const stock = Number(doc.stock) || 0
    if (stock <= 0) continue

    const lastSoldAt = normalizeCloudDate(doc.lastSoldAt || doc.updatedAt || doc.createdAt)
    if (!lastSoldAt || lastSoldAt.getTime() > cutoff) continue

    await notifyStockSlowMoving({
      goodsId: doc._id,
      goodsName: doc.name || '商品',
      stock,
      days: SLOW_MOVING_DAYS,
    })
    notified += 1
  }

  return { success: true, notified }
}

exports.main = async (event) => {
  const trigger = event.TriggerName || event.triggerName || event.action || ''

  if (trigger === 'orderPendingCheck' || event.action === 'orderPendingCheck') {
    return runPendingTimeoutCheck()
  }
  if (trigger === 'orderDailySummary' || event.action === 'orderDailySummary') {
    return runDailySummary()
  }
  if (trigger === 'stockSlowMovingCheck' || event.action === 'stockSlowMovingCheck') {
    return runSlowMovingStockCheck()
  }

  return { success: false, errMsg: `未知定时任务：${trigger || '(empty)'}` }
}
