import type { CustomBouquetDraft } from './customBouquet'

/** 门店履约状态 */
export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'prep_done'
  | 'ready'
  | 'delivering'
  | 'completed'
  | 'cancelled'

/** 骑手配送状态（进入「订单处理中」后异步更新） */
export type RiderStatus = 'none' | 'waiting' | 'picked_up' | 'on_way' | 'delivered'

/** 配送方式：顾客下单时选择 */
export type DeliveryMethod = 'home_delivery' | 'pickup'

/** 列表配送 tag：自提 / 商家配送 / 第三方配送 */
export type OrderDeliveryTagKind = 'pickup' | 'merchant' | 'third_party'

export const ORDER_DELIVERY_TAG_LABELS: Record<OrderDeliveryTagKind, string> = {
  pickup: '门店自提',
  merchant: '商家配送',
  third_party: '第三方配送',
}

export function formatOrderListPrice(price: number): string {
  return Number(price).toFixed(2).replace(/\.00$/, '')
}

export function getOrderLineTotalCount(items: OrderLineItem[]): number {
  return items.reduce((sum, item) => sum + item.count, 0)
}

export function getOrderPreviewImage(items: OrderLineItem[]): string {
  return items[0]?.image || ''
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: '待处理',
  accepted: '已接单',
  preparing: '订单处理中',
  prep_done: '制作完成',
  ready: '已备好，等待取货',
  delivering: '商家配送中',
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
  ready: 4,
  delivering: 5,
  completed: 6,
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
    status === 'ready' ||
    status === 'delivering' ||
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

/** 列表项配送 tag（与详情页 merchantDelivery / riderStatus 一致） */
export function getOrderDeliveryTagKind(order: {
  deliveryMethod?: string
  merchantDelivery?: string
  riderStatus?: string
}): OrderDeliveryTagKind {
  if (order.deliveryMethod === 'pickup') return 'pickup'
  if (order.merchantDelivery === 'self') return 'merchant'
  if (normalizeRiderStatus(order.riderStatus) !== 'none') return 'third_party'
  return 'merchant'
}

export function getOrderDeliveryTagLabel(order: {
  deliveryMethod?: string
  merchantDelivery?: string
  riderStatus?: string
}): string {
  return ORDER_DELIVERY_TAG_LABELS[getOrderDeliveryTagKind(order)]
}

export function getShopStepActiveIndex(status: OrderStatus): number {
  if (status === 'cancelled') return -1
  if (status === 'completed') return ORDER_SHOP_STEPS.length
  return SHOP_STATUS_INDEX[status] ?? 0
}

export function getRiderStepActiveIndex(riderStatus: RiderStatus): number {
  return RIDER_STATUS_INDEX[riderStatus] ?? -1
}

/** 骑手步骤条是否应展示——仅当商家已呼叫骑手（riderStatus !== 'none'） */
export function shouldShowRiderSteps(
  status: OrderStatus,
  riderStatus: RiderStatus,
): boolean {
  if (status === 'cancelled') return false
  return riderStatus !== 'none'
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
export type MerchantShopAction = 'accept' | 'confirmPreparing' | 'finishPrep' | 'readyForPickup' | 'scanVerify'

export function getMerchantShopAction(status: OrderStatus, deliveryMethod?: string): MerchantShopAction | null {
  const normalized = normalizeOrderStatus(status)
  if (normalized === 'pending') return 'accept'
  if (normalized === 'accepted') return 'confirmPreparing'
  if (normalized === 'preparing') return 'finishPrep'
  if (normalized === 'ready' && deliveryMethod === 'pickup') return 'scanVerify'
  return null
}

export const MERCHANT_SHOP_ACTION_LABELS: Record<MerchantShopAction, string> = {
  accept: '接单',
  confirmPreparing: '确认订单信息',
  finishPrep: '请选择配送方式',
  readyForPickup: '已备好',
  scanVerify: '扫码核销',
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

export function getShopOrderStatusSteps(deliveryMethod?: string) {
  if (deliveryMethod === 'pickup') {
    return [
      { key: 'pending', label: '待处理' },
      { key: 'accepted', label: '已接单' },
      { key: 'preparing', label: '备货中' },
      { key: 'ready', label: '已备好' },
      { key: 'completed', label: '已完成' },
    ]
  }
  return [
    { key: 'pending', label: '待处理' },
    { key: 'accepted', label: '已接单' },
    { key: 'preparing', label: '备货中' },
    { key: 'prep_done', label: '制作完成' },
  ]
}

export function getSelfDeliveryStatusSteps() {
  return [
    { key: 'delivering', label: '配送中' },
    { key: 'completed', label: '已完成' },
  ]
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
  deliveryMethod: DeliveryMethod
  /** 商家自配送时标记为 self */
  merchantDelivery?: string
  /** 自提核销令牌（下单时生成） */
  verifyToken?: string
  items: OrderLineItem[]
  totalAmount: number
  remark: string
  address?: OrderAddressSnapshot
  createdAt?: string | number | Date
  updatedAt?: string | number | Date
  completedAt?: string | number | Date
  acceptedAt?: string | number | Date
  preparingAt?: string | number | Date
  prepDoneAt?: string | number | Date
  readyAt?: string | number | Date
  deliveringAt?: string | number | Date
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
  address?: OrderAddressSnapshot
  remark?: string
  deliveryMethod: DeliveryMethod
}
