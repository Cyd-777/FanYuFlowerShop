/**
 * 浏览手势 → 局部热加载 的判定参数（逻辑像素 px / ms）。
 *
 * 暂定值（改后需真机复测）：
 * - TAP_MAX_DURATION_MS = 220 — 短于该时长且位移小 → 点卡片，不触发
 * - TAP_MAX_MOVE_PX = 8 — 与上组合界定点击
 * - BROWSE_MOVE_THRESHOLD_PX = 12 — 位移 ≥ 该值 → 手指未抬起时立即触发热加载
 * - BROWSE_HOLD_TRIGGER_MS = 280 — 按住超过该时长 → 手指未抬起时立即触发热加载
 *
 * 后续待确认（需交互实测 / 简单埋点）：
 * 1. 点击时长：统计 touchstart→touchend 的 P50/P90（TAP_MAX 应高于 P90 点击）
 * 2. 滑动距离：慢滑 vs 点偏位移（阈值应低于慢滑 P10、高于点击抖动 P90）
 *
 * 参考量级（非本店实测）：常见点击约 100–200ms；系统 scroll slop 约 8–12px。
 */

/** 点击：按下到抬起间隔上限（ms）。超过则可能是按住浏览 */
export const TAP_MAX_DURATION_MS = 220

/** 点击：允许的最大位移（px），与 TAP_MAX_DURATION_MS 同时满足才视为点击 */
export const TAP_MAX_MOVE_PX = 8

/** 滑动：位移 ≥ 该值（px）视为「轻微滑动」，在手指未抬起时触发热加载 */
export const BROWSE_MOVE_THRESHOLD_PX = 12

/** 按住：按下超过该时长（ms）仍未抬起则触发热加载 */
export const BROWSE_HOLD_TRIGGER_MS = 280

/** 两次热加载之间的最短间隔（ms） */
export const BROWSE_MIN_TRIGGER_INTERVAL_MS = 2_000

/** 集中导出，便于文档与调试页引用 */
export const BROWSE_GESTURE_TUNING = {
  tapMaxDurationMs: TAP_MAX_DURATION_MS,
  tapMaxMovePx: TAP_MAX_MOVE_PX,
  browseMoveThresholdPx: BROWSE_MOVE_THRESHOLD_PX,
  browseHoldTriggerMs: BROWSE_HOLD_TRIGGER_MS,
  minTriggerIntervalMs: BROWSE_MIN_TRIGGER_INTERVAL_MS,
} as const

export interface BrowseTouchPoint {
  clientX: number
  clientY: number
}

export interface BrowseTouchSession {
  startPoint: BrowseTouchPoint
  startTime: number
}

export function browseTouchDistance(
  start: BrowseTouchPoint,
  current: BrowseTouchPoint,
) {
  const dx = current.clientX - start.clientX
  const dy = current.clientY - start.clientY
  return Math.sqrt(dx * dx + dy * dy)
}

/** 是否为「点卡片」式快速点击（不应触发热加载） */
export function isQuickTapGesture(
  session: BrowseTouchSession,
  endPoint: BrowseTouchPoint,
  endTime = Date.now(),
) {
  const duration = endTime - session.startTime
  const move = browseTouchDistance(session.startPoint, endPoint)
  return duration <= TAP_MAX_DURATION_MS && move < TAP_MAX_MOVE_PX
}

export function shouldTriggerBrowseRefreshOnMove(
  start: BrowseTouchPoint,
  current: BrowseTouchPoint,
  alreadyTriggered: boolean,
) {
  if (alreadyTriggered) return false
  return browseTouchDistance(start, current) >= BROWSE_MOVE_THRESHOLD_PX
}
