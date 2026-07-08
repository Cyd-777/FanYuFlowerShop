/**
 * 业务通知 · 微信订阅消息模板 ID
 *
 * 与云函数环境变量保持一致（登录/我的页弹窗 + getSubscribeConfig 兜底）：
 * - BIZ_NOTIFY_SUBSCRIBE_TMPL_ORDER_STATUS · 订单状态（顾客）
 * - BIZ_NOTIFY_SUBSCRIBE_TMPL_ORDER_SHIP · 订单发货（顾客）
 * - BIZ_NOTIFY_SUBSCRIBE_TMPL_NEW_ORDER · 新订单提醒（商家）
 */
export const BIZ_NOTIFY_SUBSCRIBE_TMPL_ORDER_STATUS =
  'cwn2kT7js9vg2xrVrPboO-r2hwetSTQZYOOpfgK7XPQ'

export const BIZ_NOTIFY_SUBSCRIBE_TMPL_ORDER_SHIP =
  'ybOSKzUv3HjV70sHqZJB8sO3O1S8fRByeu5SrES0xlw'

export const BIZ_NOTIFY_SUBSCRIBE_TMPL_NEW_ORDER =
  'OZQrzpx-S-CfOdQ5Z90icMfzHDgjIj7gYNoivGpKBaw'

export const BIZ_NOTIFY_SUBSCRIBE_TMPL_IDS: string[] = [
  BIZ_NOTIFY_SUBSCRIBE_TMPL_ORDER_STATUS,
  BIZ_NOTIFY_SUBSCRIBE_TMPL_ORDER_SHIP,
  BIZ_NOTIFY_SUBSCRIBE_TMPL_NEW_ORDER,
]

export function getBizNotifySubscribeTmplIds(): string[] {
  return BIZ_NOTIFY_SUBSCRIBE_TMPL_IDS.filter(Boolean)
}
