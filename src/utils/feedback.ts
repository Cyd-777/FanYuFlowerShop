import { reactive } from 'vue'
import { getCurrentPageRoute } from '@/config/pageNav'
import { getNavBarLayout } from '@/utils/navBarLayout'
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
  position: 'top',
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

export const FEEDBACK_TONE_STYLES: Record<FeedbackTone, { background: string; color: string }> = {
  primary: { background: '#e53935', color: '#ffffff' },
  success: { background: '#2e7d32', color: '#ffffff' },
  warning: { background: '#e65100', color: '#ffffff' },
  danger: { background: '#c62828', color: '#ffffff' },
}

function hideBar() {
  clearBarTimer()
  feedbackBarState.visible = false
}

/** 无 AppNavBar 的 Tab 页（仅 AppFeedbackHost）：提示条贴 statusBar 下沿 */
const FEEDBACK_ONLY_TAB_ROUTES = new Set(['pages/home/index', 'pages/mine/index'])

/** 顶部提示条 top 偏移：子页/带 Head 页 = Head 总高；首页/我的 = statusBar + 间距 */
export function getNotifyBarTopOffsetPx(forceLayout = false) {
  const layout = getNavBarLayout(forceLayout)
  if (FEEDBACK_ONLY_TAB_ROUTES.has(getCurrentPageRoute())) {
    return layout.statusBarHeight + 8
  }
  return layout.totalHeight
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

/** 顶部/底部提示条，不遮挡页面阅读 */
export function showNotifyBar(options: NotifyBarOptions) {
  const message = String(options.message || '').trim()
  if (!message) return

  feedbackBarState.message = message
  feedbackBarState.tone = options.tone || 'primary'
  feedbackBarState.position = options.position || 'top'
  feedbackBarState.duration = options.duration ?? 2500
  feedbackBarState.visible = false
  feedbackBarState.visible = true
  scheduleBarHide(feedbackBarState.duration)
}

export function showSuccessBar(message: string, options?: Omit<NotifyBarOptions, 'message' | 'tone'>) {
  showNotifyBar({ ...options, message, tone: 'success' })
}

export function showWarningBar(message: string, options?: Omit<NotifyBarOptions, 'message' | 'tone'>) {
  showNotifyBar({ ...options, message, tone: 'warning' })
}

export function showDangerBar(message: string, options?: Omit<NotifyBarOptions, 'message' | 'tone'>) {
  showNotifyBar({ ...options, message, tone: 'danger' })
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
