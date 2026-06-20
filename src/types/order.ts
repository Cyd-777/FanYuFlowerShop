import type { CustomBouquetDraft } from './customBouquet'

/** 门店履约状态 */
export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'prep_done'
  | 'completed'
  | 'cancelled'

/** 骑手配送状态（进入「订单处理中」后异步更新） */
export type RiderStatus = 'none' | 'waiting' | 'picked_up' | 'on_way' | 'delivered'

export const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'accepted',
  'preparing',
  'prep_done',
  'completed',
  'cancelled',
]

/** 列表 Tab「处理中」包含的状态（含旧版 processing） */
export const ORDER_IN_PROGRESS_STATUSES: OrderStatus[] = [
  'accepted',
  'preparing',
  'prep_done',
]

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: '待处理',
  accepted: '已接单',
  preparing: '订单处理中',
  prep_done: '制作完成',
  completed: '已完成',
  cancelled: '已取消',
}

export const RIDER_STATUS_LABELS: Record<RiderStatus, string> = {
  none: '未呼叫骑手',
  waiting: '等待骑手',
  picked_up: '已取货',
  on_way: '在路上',
  delivered: '已送达',
}

/** 门店步骤条 */
export const ORDER_SHOP_STEPS = [
  { key: 'pending' as const, label: '待处理' },
  { key: 'accepted' as const, label: '已接单' },
  { key: 'preparing' as const, label: '订单处理中' },
  { key: 'prep_done' as const, label: '制作完成' },
] as const

/** 骑手步骤条 */
export const ORDER_RIDER_STEPS = [
  { key: 'waiting' as const, label: '等待骑手' },
  { key: 'picked_up' as const, label: '已取货' },
  { key: 'on_way' as const, label: '在路上' },
  { key: 'delivered' as const, label: '已送达' },
] as const

const SHOP_STATUS_INDEX: Record<OrderStatus, number> = {
  pending: 0,
  accepted: 1,
  preparing: 2,
  prep_done: 3,
  completed: 4,
  cancelled: -1,
}

const RIDER_STATUS_INDEX: Record<RiderStatus, number> = {
  none: -1,
  waiting: 0,
  picked_up: 1,
  on_way: 2,
  delivered: 3,
}

/** 兼容旧云数据：processing → preparing */
export function normalizeOrderStatus(status: string | undefined): OrderStatus {
  if (status === 'processing') return 'preparing'
  if (
    status === 'pending' ||
    status === 'accepted' ||
    status === 'preparing' ||
    status === 'prep_done' ||
    status === 'completed' ||
    status === 'cancelled'
  ) {
    return status
  }
  return 'pending'
}

export function normalizeRiderStatus(value: string | undefined): RiderStatus {
  if (
    value === 'none' ||
    value === 'waiting' ||
    value === 'picked_up' ||
    value === 'on_way' ||
    value === 'delivered'
  ) {
    return value
  }
  return 'none'
}

export function getShopStepActiveIndex(status: OrderStatus): number {
  if (status === 'cancelled') return -1
  if (status === 'completed') return ORDER_SHOP_STEPS.length
  return SHOP_STATUS_INDEX[status] ?? 0
}

export function getRiderStepActiveIndex(riderStatus: RiderStatus): number {
  return RIDER_STATUS_INDEX[riderStatus] ?? -1
}

/** 骑手步骤条是否应展示（进入订单处理中后） */
export function shouldShowRiderSteps(
  status: OrderStatus,
  riderStatus: RiderStatus,
): boolean {
  if (status === 'cancelled' || status === 'pending' || status === 'accepted') {
    return false
  }
  return riderStatus !== 'none' || status === 'preparing' || status === 'prep_done' || status === 'completed'
}

/** 列表/详情当前进度文案 */
export function getOrderProgressLabel(order: {
  status: OrderStatus
  riderStatus?: RiderStatus
}): string {
  const status = normalizeOrderStatus(order.status)
  const riderStatus = normalizeRiderStatus(order.riderStatus)

  if (status === 'cancelled') return ORDER_STATUS_LABELS.cancelled
  if (status === 'completed') return ORDER_STATUS_LABELS.completed
  if (status === 'prep_done' && riderStatus !== 'none' && riderStatus !== 'delivered') {
    return RIDER_STATUS_LABELS[riderStatus]
  }
  return ORDER_STATUS_LABELS[status] || status
}

/** 顾客是否可取消：仅待处理 */
export function canCustomerCancelOrder(status: OrderStatus | string): boolean {
  return normalizeOrderStatus(status) === 'pending'
}

/** 商家门店侧下一操作 */
export type MerchantShopAction = 'accept' | 'confirmPreparing' | 'finishPrep'

export function getMerchantShopAction(status: OrderStatus): MerchantShopAction | null {
  const normalized = normalizeOrderStatus(status)
  if (normalized === 'pending') return 'accept'
  if (normalized === 'accepted') return 'confirmPreparing'
  if (normalized === 'preparing') return 'finishPrep'
  return null
}

export const MERCHANT_SHOP_ACTION_LABELS: Record<MerchantShopAction, string> = {
  accept: '接单',
  confirmPreparing: '确认订单信息',
  finishPrep: '制作完成',
}

/** 骑手下一状态（调试/人工推进，后续由配送平台回调） */
export function getNextRiderStatus(riderStatus: RiderStatus): RiderStatus | null {
  const flow: RiderStatus[] = ['waiting', 'picked_up', 'on_way', 'delivered']
  const index = flow.indexOf(riderStatus)
  if (index < 0 || index >= flow.length - 1) return null
  return flow[index + 1]
}

export function canMerchantAdvanceRider(order: {
  status: OrderStatus
  riderStatus?: RiderStatus
}): boolean {
  const status = normalizeOrderStatus(order.status)
  const riderStatus = normalizeRiderStatus(order.riderStatus)
  if (status !== 'prep_done' && status !== 'preparing') return false
  return getNextRiderStatus(riderStatus) !== null
}

/** 商家工作台订单统计 */
export interface OrderStats {
  todayOrders: number
  pendingOrders: number
  todayRevenue: number
}

/** 写入订单的行项目快照 */
export interface OrderLineItem {
  lineKey: string
  kind: 'goods' | 'custom'
  goodsId: string
  name: string
  price: number
  unit: string
  count: number
  image: string
  customSummary?: string
}

/** 订单地址快照 */
export interface OrderAddressSnapshot {
  name: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
  fullText: string
}

export interface Order {
  _id: string
  orderNo: string
  customerOpenid: string
  status: OrderStatus
  riderStatus: RiderStatus
  items: OrderLineItem[]
  totalAmount: number
  remark: string
  address: OrderAddressSnapshot
  createdAt?: string | number | Date
  updatedAt?: string | number | Date
  completedAt?: string | number | Date
  acceptedAt?: string | number | Date
  preparingAt?: string | number | Date
  prepDoneAt?: string | number | Date
  riderCalledAt?: string | number | Date
}

/** 创建订单时客户端提交的行（含定制花束明细，供服务端扣库存） */
export interface CreateOrderLineInput {
  lineKey: string
  kind: 'goods' | 'custom'
  goodsId: string
  name: string
  price: number
  unit: string
  count: number
  image: string
  customSummary?: string
  customDraft?: CustomBouquetDraft
}

export interface CreateOrderInput {
  items: CreateOrderLineInput[]
  address: OrderAddressSnapshot
  remark?: string
}
