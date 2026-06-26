import { computed, nextTick, ref, type Ref } from 'vue'
import { stopPullDownRefresh, usePullDownRefresh } from '@tarojs/taro'
import { hidePullRefreshLoading, showPullRefreshLoading } from '@/utils/feedback'

export type PullRefreshMode = 'page' | 'content'

export interface PullRefreshOptions {
  scrollTopRef?: Ref<number | undefined>
}

type TouchLikeEvent = {
  touches: Array<{ clientX: number; clientY: number }>
  changedTouches?: Array<{ clientX: number; clientY: number }>
}

export type ContentPullTouchHandlers = {
  onTouchStart: (event: TouchLikeEvent) => void
  onTouchMove: (event: TouchLikeEvent) => void
  onTouchEnd: (event: TouchLikeEvent) => void
  onTouchCancel: (event: TouchLikeEvent) => void
}

/** 手指下拉超过该距离（px）松手后：先回弹，再刷新 */
const CONTENT_PULL_THRESHOLD_PX = 72
const CONTENT_SCROLL_TOP_EPSILON = 4
const CONTENT_PULL_MAX_OFFSET_PX = 96
const CONTENT_PULL_DAMPING = 0.52
const CONTENT_PULL_SNAP_MS = 320

function stopNativePullDownRefresh() {
  try {
    stopPullDownRefresh()
  } catch {
    /* ignore */
  }
}

/** SWR：顶栏 loading 条 + 后台 force 刷新 */
export async function runPullRefreshSWR(refresh: (force?: boolean) => Promise<void>) {
  showPullRefreshLoading()
  try {
    await refresh(true)
  } finally {
    hidePullRefreshLoading()
  }
}

export function mergeTouchHandlers(
  ...groups: Array<Partial<ContentPullTouchHandlers> | undefined>
): ContentPullTouchHandlers {
  const chain =
    (key: keyof ContentPullTouchHandlers) =>
    (event: TouchLikeEvent) => {
      for (const group of groups) {
        group?.[key]?.(event)
      }
    }

  return {
    onTouchStart: chain('onTouchStart'),
    onTouchMove: chain('onTouchMove'),
    onTouchEnd: chain('onTouchEnd'),
    onTouchCancel: chain('onTouchCancel'),
  }
}

/**
 * 统一下拉刷新：
 * - page：整页原生下拉，stop 回弹后顶栏 loading + 刷新
 * - content：手势跟手 + 松手回弹动画，回弹结束后再顶栏 loading + 刷新（无 scroll-view refresher）
 */
export function usePullRefresh(
  refresh: (force?: boolean) => Promise<void>,
  mode: PullRefreshMode,
  options: PullRefreshOptions = {},
) {
  let restoreRefreshPending = false
  let refreshStarted = false
  let reboundTimer: ReturnType<typeof setTimeout> | null = null

  const contentScrollTop = ref(0)
  const pullOffsetPx = ref(0)
  const pullTransition = ref('')

  let pullStartY = 0
  let pullTracking = false
  let contentRefreshActive = false

  const contentPullWrapStyle = computed(() => {
    const style: Record<string, string> = {}
    if (pullOffsetPx.value > 0) {
      style.transform = `translate3d(0, ${pullOffsetPx.value}px, 0)`
    }
    if (pullTransition.value) {
      style.transition = pullTransition.value
    }
    return style
  })

  function clearReboundTimer() {
    if (!reboundTimer) return
    clearTimeout(reboundTimer)
    reboundTimer = null
  }

  async function triggerRefreshAfterRebound() {
    if (!restoreRefreshPending || refreshStarted) return
    refreshStarted = true
    restoreRefreshPending = false
    clearReboundTimer()
    contentRefreshActive = true
    try {
      await runPullRefreshSWR(refresh)
    } catch {
      /* runPullRefreshSWR 已处理 loading */
    } finally {
      contentRefreshActive = false
    }
  }

  function snapBack(refreshAfter: boolean) {
    clearReboundTimer()
    if (refreshAfter) {
      restoreRefreshPending = true
      refreshStarted = false
    } else {
      restoreRefreshPending = false
    }

    pullTransition.value = `transform ${CONTENT_PULL_SNAP_MS}ms cubic-bezier(0.33, 1, 0.68, 1)`
    pullOffsetPx.value = 0

    if (refreshAfter) {
      reboundTimer = setTimeout(() => {
        void triggerRefreshAfterRebound()
      }, CONTENT_PULL_SNAP_MS + 60)
    }
  }

  function trackContentScroll(event: { detail?: { scrollTop?: number } }) {
    contentScrollTop.value = Number(event.detail?.scrollTop) || 0
  }

  function onPullTouchStart(event: TouchLikeEvent) {
    if (contentRefreshActive || contentScrollTop.value > CONTENT_SCROLL_TOP_EPSILON) return
    const touch = event.touches[0]
    if (!touch) return
    pullStartY = touch.clientY
    pullTracking = true
    pullTransition.value = ''
  }

  function onPullTouchMove(event: TouchLikeEvent) {
    if (!pullTracking || contentRefreshActive) return
    const touch = event.touches[0]
    if (!touch) return

    if (contentScrollTop.value > CONTENT_SCROLL_TOP_EPSILON) {
      pullTracking = false
      if (pullOffsetPx.value > 0) snapBack(false)
      return
    }

    const deltaY = touch.clientY - pullStartY
    if (deltaY <= 0) {
      pullTransition.value = ''
      pullOffsetPx.value = 0
      return
    }

    pullTransition.value = ''
    pullOffsetPx.value = Math.min(deltaY * CONTENT_PULL_DAMPING, CONTENT_PULL_MAX_OFFSET_PX)
  }

  function onPullTouchEnd(event: TouchLikeEvent) {
    const wasTracking = pullTracking
    pullTracking = false
    if (!wasTracking || contentRefreshActive) return

    const touch = event.changedTouches?.[0]
    const deltaY = touch ? touch.clientY - pullStartY : 0
    const shouldRefresh =
      contentScrollTop.value <= CONTENT_SCROLL_TOP_EPSILON &&
      deltaY >= CONTENT_PULL_THRESHOLD_PX

    if (pullOffsetPx.value > 0 || shouldRefresh) {
      snapBack(shouldRefresh)
    }
  }

  function onPullWrapTransitionEnd(event: { detail?: { propertyName?: string } }) {
    const prop = event.detail?.propertyName
    if (prop && prop !== 'transform') return
    void triggerRefreshAfterRebound()
  }

  const contentPullHandlers: ContentPullTouchHandlers = {
    onTouchStart: onPullTouchStart,
    onTouchMove: onPullTouchMove,
    onTouchEnd: onPullTouchEnd,
    onTouchCancel: onPullTouchEnd,
  }

  /** 整页原生：stop = 回弹，回弹后顶栏 loading + 刷新 */
  function onPagePullDownRefresh() {
    stopNativePullDownRefresh()
    void nextTick(() => {
      stopNativePullDownRefresh()
      setTimeout(stopNativePullDownRefresh, 0)
      restoreRefreshPending = true
      refreshStarted = false
      void triggerRefreshAfterRebound()
    })
  }

  if (mode === 'page') {
    usePullDownRefresh(onPagePullDownRefresh)
  }

  return {
    mode,
    ...(mode === 'content'
      ? {
          contentPullHandlers,
          trackContentScroll,
          contentPullWrapStyle,
          onPullWrapTransitionEnd,
        }
      : {}),
  }
}
