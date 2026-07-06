/**
 * 类 OA 通知模块 · 公开 API
 * @see docs/类OA通知模块-API.md
 */

export type {
  BizNotification,
  BizNotificationAudience,
  BizNotificationCategory,
  BizNotificationChannel,
  BizNotificationContext,
  BizNotificationType,
  NotifyListCategory,
  NotifyRecipient,
  NotifySendPayload,
} from './types'

export { formatNotifyTime, notifyTypeLabel } from './types'

export {
  fetchBizNotifySubscribeConfig,
  fetchNotifyUnreadCount,
  listBizNotifications,
  listNotifyRecipients,
  markBizNotificationsRead,
  recordBizNotifySubscribe,
  sendBizNotification,
} from './client'

export {
  getCachedSubscribeTmplIds,
  invokeBizNotifySubscribe,
  prefetchSubscribeTmplIds,
  requestSubscribeOnLoginTap,
  resolveSubscribeTmplIds,
  setCachedSubscribeTmplIds,
} from './subscribe'
