export type BizNotificationType =
  | 'staff_message'
  | 'order_context'
  | 'goods_context'
  | 'system'

export type BizNotificationCategory = '' | 'order' | 'stock'

export type BizNotificationAudience = '' | 'customer' | 'merchant'

export type BizNotificationChannel = 'in_app' | 'subscribe_message'

export interface BizNotificationContext {
  orderId?: string
  orderNo?: string
  goodsId?: string
  goodsName?: string
  linkPath?: string
}

export interface BizNotification {
  _id: string
  toUserId: string
  fromUserId: string
  fromName: string
  type: BizNotificationType
  category?: BizNotificationCategory
  eventKey?: string
  audience?: BizNotificationAudience
  title: string
  body: string
  context: BizNotificationContext
  channel: BizNotificationChannel
  read: boolean
  createdAt?: string | Date
}

export interface NotifyRecipient {
  userId: string
  name: string
  role: string
  roleLabel: string
}

export interface NotifySendPayload {
  toUserIds: string[]
  title?: string
  body: string
  type?: BizNotificationType
  context?: BizNotificationContext
  channel?: BizNotificationChannel
}

export type NotifyListCategory = 'all' | 'order' | 'stock'

export function formatNotifyTime(raw?: string | Date): string {
  if (!raw) return ''
  const date = raw instanceof Date ? raw : new Date(raw)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function notifyTypeLabel(item: Pick<BizNotification, 'type' | 'category'>): string {
  if (item.category === 'order' || item.type === 'order_context') return '订单'
  if (item.category === 'stock' || item.type === 'goods_context') return '库存'
  if (item.type === 'system') return '系统'
  return '消息'
}
