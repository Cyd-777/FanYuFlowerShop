import { getCloud, getCloudCallConfig, parseCloudResult, formatCloudError } from './cloud'
import type { CreateOrderInput, Order, OrderStats, OrderStatus, RiderStatus } from '@/types/order'
import {
  MERCHANT_SHOP_ACTION_LABELS,
  getMerchantShopAction,
  getNextRiderStatus,
  normalizeOrderStatus,
  normalizeRiderStatus,
} from '@/types/order'
import type { CartLineItem } from '@/types/cart'

interface OrderCloudResult {
  success: boolean
  errMsg?: string
  order?: Order
  orderId?: string
  list?: Order[]
  stats?: OrderStats
}

async function callOrder<T = OrderCloudResult>(data: Record<string, unknown>): Promise<T> {
  const cloud = getCloud()
  const config = getCloudCallConfig()

  let res: WechatMiniprogram.Cloud.CallFunctionResult
  try {
    res = await cloud.callFunction({
      name: 'order',
      data,
      ...(config ? { config } : {}),
    })
  } catch (err) {
    const msg = formatCloudError(err)
    if (msg.includes('FUNCTION_NOT_FOUND') || msg.includes('FunctionName parameter could not be found')) {
      throw new Error('order 云函数未部署，请先在云开发控制台部署')
    }
    if (msg.includes('Cannot find module') || msg.includes('MODULE_NOT_FOUND')) {
      throw new Error('order 云函数依赖缺失，请先运行 npm run sync:cloud 后重新上传部署')
    }
    throw new Error(`云函数调用失败: ${msg}`)
  }

  const result = parseCloudResult<T & OrderCloudResult>(res.result)
  if (!result || typeof result !== 'object') {
    throw new Error('云函数返回格式异常')
  }
  if (result.success === false && result.errMsg === '未知操作') {
    throw new Error('order 云函数版本过旧，请重新部署后重试')
  }

  return result as T
}

function normalizeOrderFromCloud(order: Order): Order {
  return {
    ...order,
    status: normalizeOrderStatus(order.status),
    riderStatus: normalizeRiderStatus(order.riderStatus),
  }
}

function normalizeOrderList(list: Order[] | undefined): Order[] {
  return Array.isArray(list) ? list.map(normalizeOrderFromCloud) : []
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const result = await callOrder({
    action: 'create',
    items: input.items,
    address: input.address,
    remark: input.remark || '',
  })

  if (result.success !== true || !result.order) {
    throw new Error(result.errMsg || '创建订单失败')
  }

  return normalizeOrderFromCloud(result.order)
}

export function buildCreateOrderInput(
  items: CartLineItem[],
  address: CreateOrderInput['address'],
  remark = '',
): CreateOrderInput {
  return {
    items: items.map((item) => ({
      lineKey: item.lineKey,
      kind: item.kind,
      goodsId: item.goodsId,
      name: item.name,
      price: item.price,
      unit: item.unit,
      count: item.count,
      image: item.image,
      customSummary: item.customSummary,
      customDraft: item.customDraft,
    })),
    address,
    remark: remark.trim(),
  }
}

export async function getOrder(orderId: string): Promise<Order> {
  const result = await callOrder({
    action: 'get',
    id: orderId,
  })

  if (result.success !== true || !result.order) {
    throw new Error(result.errMsg || '获取订单失败')
  }

  return normalizeOrderFromCloud(result.order)
}

export type OrderListTab = OrderStatus | 'all' | 'processing'

export async function listMyOrders(status: OrderListTab = 'all'): Promise<Order[]> {
  const result = await callOrder({
    action: 'list',
    status: status === 'all' ? '' : status,
  })

  if (result.success !== true) {
    throw new Error(result.errMsg || '获取订单列表失败')
  }

  return normalizeOrderList(result.list)
}

export async function getMerchantOrderStats(): Promise<OrderStats> {
  const result = await callOrder({
    action: 'stats',
  })

  if (result.success !== true || !result.stats) {
    throw new Error(result.errMsg || '获取订单统计失败')
  }

  return result.stats
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus | 'cancelled',
): Promise<Order> {
  const result = await callOrder({
    action: 'updateStatus',
    id: orderId,
    status,
  })

  if (result.success !== true || !result.order) {
    throw new Error(result.errMsg || '更新订单失败')
  }

  return normalizeOrderFromCloud(result.order)
}

export async function updateRiderStatus(orderId: string, riderStatus: RiderStatus): Promise<Order> {
  const result = await callOrder({
    action: 'updateStatus',
    id: orderId,
    riderStatus,
  })

  if (result.success !== true || !result.order) {
    throw new Error(result.errMsg || '更新配送状态失败')
  }

  return normalizeOrderFromCloud(result.order)
}

export async function performMerchantShopAction(orderId: string, order: Order): Promise<Order> {
  const action = getMerchantShopAction(order.status)
  if (!action) {
    throw new Error('当前状态无可执行操作')
  }

  const statusMap = {
    accept: 'accepted',
    confirmPreparing: 'preparing',
    finishPrep: 'prep_done',
  } as const

  return updateOrderStatus(orderId, statusMap[action])
}

export function getMerchantShopActionLabel(order: Order): string | null {
  const action = getMerchantShopAction(order.status)
  return action ? MERCHANT_SHOP_ACTION_LABELS[action] : null
}

export function getMerchantRiderActionLabel(order: Order): string | null {
  if (order.status !== 'preparing' && order.status !== 'prep_done') return null
  const next = getNextRiderStatus(order.riderStatus)
  if (!next) return null
  const labels: Record<RiderStatus, string> = {
    none: '',
    waiting: '标记骑手已取货',
    picked_up: '标记配送中',
    on_way: '标记已送达',
    delivered: '',
  }
  return labels[next] || null
}

export async function cancelMyOrder(orderId: string): Promise<Order> {
  return updateOrderStatus(orderId, 'cancelled')
}

export async function listMerchantOrders(status: OrderListTab = 'all'): Promise<Order[]> {
  const result = await callOrder({
    action: 'list',
    scope: 'merchant',
    status: status === 'all' ? '' : status,
  })

  if (result.success !== true) {
    throw new Error(result.errMsg || '获取订单列表失败')
  }

  return normalizeOrderList(result.list)
}
