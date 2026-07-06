export type FeedbackTone = 'primary' | 'success' | 'warning' | 'danger'

export type NotifyBarPosition = 'head' | 'bottom'

export interface NotifyBarOptions {
  message: string
  tone?: FeedbackTone
  position?: NotifyBarPosition
  duration?: number
}

export interface NotifyAlertOptions {
  title?: string
  message: string
  tone?: FeedbackTone
  confirmText?: string
  onConfirm?: () => void
}

export interface NotifyConfirmOptions {
  title?: string
  message: string
  tone?: FeedbackTone
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  onCancel?: () => void
}

export type AppToastOptions = string | {
  title: string
  icon?: 'success' | 'error' | 'loading' | 'none'
  duration?: number
}
