import { goodsLiveSync } from '@/services/goodsLiveSync'
import {
  BROWSE_HOLD_TRIGGER_MS,
  BROWSE_MIN_TRIGGER_INTERVAL_MS,
  isQuickTapGesture,
  shouldTriggerBrowseRefreshOnMove,
  type BrowseTouchPoint,
  type BrowseTouchSession,
} from '@/utils/goodsBrowseGesture'

type TouchLikeEvent = {
  touches: Array<{ clientX: number; clientY: number }>
  changedTouches?: Array<{ clientX: number; clientY: number }>
}

/**
 * 浏览手势触发的局部热加载（补充 20s 轮询）。
 *
 * **满足条件即触发（手指仍在屏上）**：
 * - 轻微滑动（欲滑未滑）或按住浏览 → 立刻异步 patch，不等 touchend
 * - 用户仍按着屏幕时即可看到价位/名称等变动
 *
 * **不阻断点击进详情**：
 * - 仅 `bind` 监听 touch，不 `catch`，不 `preventDefault` / `stopPropagation`
 * - 快速点击（短时长 + 小位移）不会触发刷新
 */
export function useGoodsBrowseRefresh(options?: { debugLog?: boolean }) {
  let session: BrowseTouchSession | null = null
  /** 本次手势已触发过刷新，避免 move + hold 重复 */
  let sessionTriggered = false
  let holdTimer: ReturnType<typeof setTimeout> | null = null
  let lastTriggerAt = 0
  const debugLog = options?.debugLog === true

  function clearHoldTimer() {
    if (!holdTimer) return
    clearTimeout(holdTimer)
    holdTimer = null
  }

  function resetTouchSession() {
    session = null
    sessionTriggered = false
    clearHoldTimer()
  }

  function triggerRefresh(reason: 'move' | 'hold') {
    if (sessionTriggered) return
    sessionTriggered = true
    clearHoldTimer()

    const now = Date.now()
    if (now - lastTriggerAt < BROWSE_MIN_TRIGGER_INTERVAL_MS) {
      if (debugLog) {
        console.info('[goodsBrowseRefresh] skipped (min interval)', reason)
      }
      return
    }
    lastTriggerAt = now

    if (debugLog) {
      console.info('[goodsBrowseRefresh] trigger while touching', reason)
    }
    void goodsLiveSync.triggerSync({ source: 'gesture' })
  }

  function onTouchStart(event: TouchLikeEvent) {
    const touch = event.touches[0]
    if (!touch) return

    session = {
      startPoint: { clientX: touch.clientX, clientY: touch.clientY },
      startTime: Date.now(),
    }
    sessionTriggered = false
    clearHoldTimer()

    holdTimer = setTimeout(() => {
      holdTimer = null
      if (!session) return
      triggerRefresh('hold')
    }, BROWSE_HOLD_TRIGGER_MS)
  }

  function onTouchMove(event: TouchLikeEvent) {
    const touch = event.touches[0]
    if (!touch || !session) return

    if (shouldTriggerBrowseRefreshOnMove(session.startPoint, touch, sessionTriggered)) {
      triggerRefresh('move')
    }
  }

  function onTouchEnd(event: TouchLikeEvent) {
    const endTouch = event.changedTouches?.[0]

    if (debugLog && session && endTouch) {
      const endPoint = { clientX: endTouch.clientX, clientY: endTouch.clientY }
      console.info('[goodsBrowseRefresh] touchend', {
        quickTap: isQuickTapGesture(session, endPoint),
        triggeredDuringTouch: sessionTriggered,
        durationMs: Date.now() - session.startTime,
        ...logGestureMetrics(session, endPoint),
      })
    }

    resetTouchSession()
  }

  return {
    browseTouchHandlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel: onTouchEnd,
    },
  }
}

function logGestureMetrics(
  current: BrowseTouchSession | null,
  endPoint?: BrowseTouchPoint,
) {
  if (!current) return {}
  const end = endPoint || current.startPoint
  return {
    movePx: Math.round(
      Math.sqrt(
        (end.clientX - current.startPoint.clientX) ** 2 +
          (end.clientY - current.startPoint.clientY) ** 2,
      ) * 10,
    ) / 10,
  }
}
