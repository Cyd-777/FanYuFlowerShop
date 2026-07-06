/**
 * 业务通知 · 微信订阅消息模板 ID
 *
 * 与云函数环境变量保持一致（登录/我的页弹窗 + getSubscribeConfig 兜底）：
 * - BIZ_NOTIFY_SUBSCRIBE_TMPL_ORDER_STATUS · 订单状态
 * - BIZ_NOTIFY_SUBSCRIBE_TMPL_ORDER_SHIP · 订单发货
 */
export const BIZ_NOTIFY_SUBSCRIBE_TMPL_ORDER_STATUS =
  'cwn2kT7js9vg2xrVrPboO-r2hwetSTQZYOOpfgK7XPQ'

export const BIZ_NOTIFY_SUBSCRIBE_TMPL_ORDER_SHIP =
  'ybOSKzUv3HjV70sHqZJB8g-ppSx8_3gP0Ek0XGNxOjM'

export const BIZ_NOTIFY_SUBSCRIBE_TMPL_IDS: string[] = [
  BIZ_NOTIFY_SUBSCRIBE_TMPL_ORDER_STATUS,
  BIZ_NOTIFY_SUBSCRIBE_TMPL_ORDER_SHIP,
]

export function getBizNotifySubscribeTmplIds(): string[] {
  return BIZ_NOTIFY_SUBSCRIBE_TMPL_IDS.filter(Boolean)
}
