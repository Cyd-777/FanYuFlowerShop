import { getCloud, getCloudCallConfig, parseCloudResult } from '@/services/cloud'
import type {
  BizNotification,
  NotifyRecipient,
  NotifySendPayload,
} from './types'

interface NotifyCloudResult {
  success: boolean
  errMsg?: string
  list?: BizNotification[]
  unread?: number
  isMerchant?: boolean
  sent?: number
  updated?: number | 'all'
}

async function callNotify<T = NotifyCloudResult>(data: Record<string, unknown>): Promise<T> {
  const cloud = getCloud()
  const config = getCloudCallConfig()
  const res = await cloud.callFunction({
    name: 'notify',
    data,
    ...(config ? { config } : {}),
  })
  const result = parseCloudResult<T & NotifyCloudResult>(res.result)
  if (!result || typeof result !== 'object') {
    throw new Error('云函数返回格式异常')
  }
  return result as T
}

export async function fetchNotifyUnreadCount(): Promise<{ unread: number; isMerchant: boolean }> {
  const result = await callNotify({ action: 'unreadCount' })
  if (result.success !== true) {
    throw new Error(result.errMsg || '获取未读数失败')
  }
  return {
    unread: Number(result.unread) || 0,
    isMerchant: result.isMerchant === true,
  }
}

export async function listBizNotifications(
  limit = 50,
  category?: 'order' | 'stock',
): Promise<{
  list: BizNotification[]
  unread: number
}> {
  const result = await callNotify({
    action: 'list',
    limit,
    ...(category ? { category } : {}),
  })
  if (result.success !== true) {
    throw new Error(result.errMsg || '获取通知失败')
  }
  return {
    list: Array.isArray(result.list) ? result.list : [],
    unread: Number(result.unread) || 0,
  }
}

export async function markBizNotificationsRead(options: { ids?: string[]; all?: boolean }) {
  const result = await callNotify({
    action: 'markRead',
    ids: options.ids,
    all: options.all === true,
  })
  if (result.success !== true) {
    throw new Error(result.errMsg || '标记已读失败')
  }
  return Number(result.unread) || 0
}

export async function listNotifyRecipients(): Promise<NotifyRecipient[]> {
  const result = await callNotify({ action: 'listRecipients' })
  if (result.success !== true) {
    throw new Error(result.errMsg || '获取同事列表失败')
  }
  return Array.isArray(result.list) ? (result.list as NotifyRecipient[]) : []
}

/** @deprecated 同事互发已下线，仅保留云 action 兼容 */
export async function sendBizNotification(payload: NotifySendPayload): Promise<number> {
  const result = await callNotify({
    action: 'send',
    ...payload,
  })
  if (result.success !== true) {
    throw new Error(result.errMsg || '发送失败')
  }
  return Number(result.sent) || 0
}

export async function recordBizNotifySubscribe(tmplIds: string[]) {
  const ids = [...new Set(tmplIds.map((id) => String(id || '').trim()).filter(Boolean))]
  if (!ids.length) return
  const result = await callNotify({ action: 'recordSubscribe', tmplIds: ids })
  if (result.success !== true) {
    throw new Error(result.errMsg || '记录订阅失败')
  }
}

export async function fetchBizNotifySubscribeConfig(): Promise<string[]> {
  const result = await callNotify<{ tmplIds?: string[] }>({ action: 'getSubscribeConfig' })
  if (result.success !== true) {
    throw new Error(result.errMsg || '获取订阅配置失败')
  }
  return Array.isArray(result.tmplIds)
    ? result.tmplIds.map((id) => String(id || '').trim()).filter(Boolean)
    : []
}

/**
 * 测试：主动向当前用户发送一条微信服务通知。
 * 仅用于开发调试，验证订阅消息链路是否正常。
 */
export async function testSubscribeMessage(): Promise<{ sent: boolean; errCode?: string; errMsg?: string }> {
  const result = await callNotify<{ sent: boolean; errCode?: string; errMsg?: string }>({ action: 'testSubscribe' })
  if (result.success !== true) {
    throw new Error(result.errMsg || '测试发送失败')
  }
  return { sent: result.sent === true, errCode: result.errCode, errMsg: result.errMsg }
}
