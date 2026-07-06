import { reactive } from 'vue'
import Taro from '@tarojs/taro'
import { NOTIFY_TONE_ICON_SRC_ON_DARK } from '@/assets/icons/notify'
import { getCurrentPageRoute, isTabBarRoute } from '@/config/pageNav'
import { rpxToPx } from '@/composables/usePageSticky'
import { getNavBarLayout } from '@/utils/navBarLayout'
import { scrollTailTabBarInsetPx } from '@/utils/scrollListTailSpacer'
import type {
  AppToastOptions,
  FeedbackTone,
  NotifyAlertOptions,
  NotifyBarOptions,
  NotifyBarPosition,
  NotifyConfirmOptions,
} from '@/types/feedback'

export type {
  AppToastOptions,
  FeedbackTone,
  NotifyAlertOptions,
  NotifyBarOptions,
  NotifyBarPosition,
  NotifyConfirmOptions,
} from '@/types/feedback'

interface BarState {
  visible: boolean
  message: string
  tone: FeedbackTone
  position: NotifyBarPosition
  duration: number
}

interface AlertState {
  visible: boolean
  mode: 'alert' | 'confirm'
  title: string
  message: string
  tone: FeedbackTone
  confirmText: string
  cancelText: string
  onConfirm: (() => void) | null
  onCancel: (() => void) | null
}

export const feedbackBarState = reactive<BarState>({
  visible: false,
  message: '',
  tone: 'primary',
  position: 'head',
  duration: 2500,
})

export const feedbackAlertState = reactive<AlertState>({
  visible: false,
  mode: 'alert',
  title: '提示',
  message: '',
  tone: 'primary',
  confirmText: '确认',
  cancelText: '取消',
  onConfirm: null,
  onCancel: null,
})

/** 下拉刷新顶栏 loading（SWR：回弹后显示滑动条） */
export const pullRefreshLoadingState = reactive({ visible: false, depth: 0 })

export function showPullRefreshLoading() {
  pullRefreshLoadingState.depth += 1
  pullRefreshLoadingState.visible = true
}

export function hidePullRefreshLoading() {
  pullRefreshLoadingState.depth = Math.max(0, pullRefreshLoadingState.depth - 1)
  if (pullRefreshLoadingState.depth === 0) {
    pullRefreshLoadingState.visible = false
  }
}

export interface FeedbackToneStyle {
  background: string
  color: string
  borderColor: string
  iconSrc: string
}

export const FEEDBACK_TONE_STYLES: Record<FeedbackTone, FeedbackToneStyle> = {
  primary: {
    background: '#e53935',
    color: '#ffffff',
    borderColor: 'transparent',
    iconSrc: NOTIFY_TONE_ICON_SRC_ON_DARK.primary,
  },
  success: {
    background: '#2e7d32',
    color: '#ffffff',
    borderColor: 'transparent',
    iconSrc: NOTIFY_TONE_ICON_SRC_ON_DARK.success,
  },
  warning: {
    background: '#e65100',
    color: '#ffffff',
    borderColor: 'transparent',
    iconSrc: NOTIFY_TONE_ICON_SRC_ON_DARK.warning,
  },
  danger: {
    background: '#c62828',
    color: '#ffffff',
    borderColor: 'transparent',
    iconSrc: NOTIFY_TONE_ICON_SRC_ON_DARK.danger,
  },
}

function hideBar() {
  clearBarTimer()
  feedbackBarState.visible = false
}

/** 下拉刷新条：贴屏幕最上沿（statusBar 之上，各页一致） */
export function getPullRefreshTopOffsetPx() {
  return 0
}

/** 底部提示条：Tab 页抬高避开 TabBar，其余页留 safe-area */
export function getNotifyBarBottomOffsetPx() {
  const padding = rpxToPx(24)
  if (isTabBarRoute(getCurrentPageRoute())) {
    return scrollTailTabBarInsetPx() + padding
  }
  const info = Taro.getWindowInfo()
  const safeBottom = Math.max(0, info.screenHeight - (info.safeArea?.bottom ?? info.screenHeight))
  return safeBottom + padding
}

/** 系统状态栏下沿：提示条贴在设备通知栏下方 */
export function getNotifyBarTopOffsetPx(forceLayout = false) {
  return getNavBarLayout(forceLayout).statusBarHeight
}

let barTimer: ReturnType<typeof setTimeout> | null = null

function clearBarTimer() {
  if (barTimer) {
    clearTimeout(barTimer)
    barTimer = null
  }
}

function scheduleBarHide(duration: number) {
  clearBarTimer()
  if (duration <= 0) return
  barTimer = setTimeout(() => {
    hideBar()
  }, duration)
}

/** 默认贴在状态栏下沿（小浮条）；可选 bottom */
export function showNotifyBar(options: NotifyBarOptions) {
  const message = String(options.message || '').trim()
  if (!message) return

  feedbackBarState.message = message
  feedbackBarState.tone = options.tone || 'primary'
  feedbackBarState.position = options.position || 'head'
  feedbackBarState.duration = options.duration ?? 2500
  feedbackBarState.visible = false
  feedbackBarState.visible = true
  scheduleBarHide(feedbackBarState.duration)
}

function resetAlertHandlers() {
  feedbackAlertState.onConfirm = null
  feedbackAlertState.onCancel = null
}

function closeAlert() {
  feedbackAlertState.visible = false
  resetAlertHandlers()
}

/** 重要提示：居中模态 + 确认按钮 */
export function showNotifyAlert(options: NotifyAlertOptions) {
  const message = String(options.message || '').trim()
  if (!message) return

  feedbackAlertState.mode = 'alert'
  feedbackAlertState.title = String(options.title || '提示').trim() || '提示'
  feedbackAlertState.message = message
  feedbackAlertState.tone = options.tone || 'primary'
  feedbackAlertState.confirmText = String(options.confirmText || '确认').trim() || '确认'
  feedbackAlertState.cancelText = '取消'
  feedbackAlertState.onConfirm = options.onConfirm || null
  feedbackAlertState.onCancel = null
  feedbackAlertState.visible = true
}

/** 双按钮确认：确认在左（非主色），取消在右（主色） */
export function showNotifyConfirm(options: NotifyConfirmOptions) {
  const message = String(options.message || '').trim()
  if (!message) return

  feedbackAlertState.mode = 'confirm'
  feedbackAlertState.title = String(options.title || '提示').trim() || '提示'
  feedbackAlertState.message = message
  feedbackAlertState.tone = options.tone || 'primary'
  feedbackAlertState.confirmText = String(options.confirmText || '确认').trim() || '确认'
  feedbackAlertState.cancelText = String(options.cancelText || '取消').trim() || '取消'
  feedbackAlertState.onConfirm = options.onConfirm || null
  feedbackAlertState.onCancel = options.onCancel || null
  feedbackAlertState.visible = true
}

export function onNotifyAlertConfirm() {
  const handler = feedbackAlertState.onConfirm
  closeAlert()
  handler?.()
}

export function onNotifyAlertCancel() {
  const handler = feedbackAlertState.onCancel
  closeAlert()
  handler?.()
}

export function onNotifyBarClose() {
  hideBar()
}

/** 替代 showToast：轻量反馈走提示条，loading 仍用原生 */
export function showToast(options: AppToastOptions) {
  if (typeof options === 'string') {
    showNotifyBar({ message: options, tone: 'primary' })
    return
  }

  const message = String(options.title || '').trim()
  if (!message) return

  if (options.icon === 'loading') {
    wx.showLoading({ title: message, mask: true })
    return
  }

  const tone: FeedbackTone =
    options.icon === 'success' ? 'success' : options.icon === 'error' ? 'danger' : 'primary'

  showNotifyBar({
    message,
    tone,
    duration: options.duration,
  })
}

export function hideToast() {
  hideBar()
  wx.hideLoading()
}
