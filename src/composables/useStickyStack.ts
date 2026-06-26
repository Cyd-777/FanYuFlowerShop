import { computed, nextTick, ref, watch, type WatchSource } from 'vue'
import Taro, { useDidShow, usePageScroll, useReady } from '@tarojs/taro'
import { useNavBarLayout } from '@/composables/useNavBarLayout'
import { rpxToPx, SEARCH_STICKY_BLOCK_RPX } from '@/composables/usePageSticky'
import { getNavBarLayout, getSearchBarCapsuleLayout } from '@/utils/navBarLayout'

/** 栈内一项：唯一 id + 测量选择器 */
export interface StickyStackItemConfig {
  id: string
  /** 页面内唯一选择器，用于测量高度 */
  selector: string
  /** 仅搜索：吸顶后给胶囊让位 */
  reserveCapsule?: boolean
  pageHorizontalPadRpx?: number
  gapBeforeCapsulePx?: number
  zIndex?: number
  /**
   * 仅 order[0] 有效：该项吸顶时在状态栏区域显示实底遮罩（默认 true）。
   * 非首项配置会被忽略。
   */
  statusBarFill?: boolean
}

export type StickyStackLayout = 'flow-sticky' | 'fixed-header'

export interface UseStickyStackOptions {
  order: StickyStackItemConfig[]
  /** flow-sticky = 文档流 CSS sticky；fixed-header = 头在 scroll-view 外 fixed */
  layout?: StickyStackLayout
  /** page = 整页滚动；content = 由页面 scroll-view 调 onContentScroll */
  scrollMode?: 'page' | 'content'
  /** 首项吸顶时 statusBar 遮罩背景 */
  background?: string
  remeasureDeps?: WatchSource<unknown>[]
}

const MEASURE_RETRY_DELAYS_MS = [0, 50, 150, 400]
const STUCK_TOP_EPSILON_PX = 2
/** 吸顶释放滞回（px）：下滑释放时 top 需回到锚点以下更多距离，避免边界闪动 */
const STUCK_RELEASE_HYSTERESIS_PX = 12

function itemZIndex(index: number, custom?: number) {
  return custom ?? 120 - index * 10
}

/**
 * 统一滚屏吸顶栈：order[] 定序 + 唯一 id；触边吸顶、下滑释放由 CSS sticky + 固定 stackTop 实现。
 */
export function useStickyStack(options: UseStickyStackOptions) {
  const { layout: navLayout } = useNavBarLayout()
  const background = options.background ?? '#f8f8f8'
  const scrollMode = options.scrollMode ?? 'page'
  const stackLayout = options.layout ?? 'flow-sticky'

  const heightById = ref<Record<string, number>>({})
  const stuckById = ref<Record<string, boolean>>({})
  /** flow-sticky + content scroll：各项吸顶对应的 scrollTop 阈值（初始化时测量） */
  const stickScrollTopById = ref<Record<string, number>>({})
  const layoutTick = ref(0)
  const contentScrollTop = ref(0)

  let measurePass = 0
  let lastScrollTop = 0
  let stuckMeasureRaf = 0

  function usesContentScrollEmulation() {
    return stackLayout === 'flow-sticky' && scrollMode === 'content'
  }

  /** fixed-header：首项吸顶触发 scrollTop（滚过 Head 内容区） */
  const fixedHeaderStickThresholdPx = computed(() =>
    Math.max(32, navLayout.value.totalHeight - navLayout.value.statusBarHeight),
  )

  const idToIndex = computed(() => {
    const map = new Map<string, number>()
    options.order.forEach((item, index) => {
      map.set(item.id, index)
    })
    return map
  })

  /** flow-sticky：第 i 项吸顶 top = 状态栏 + 前序高度 */
  function stackTopPx(index: number) {
    let top = navLayout.value.statusBarHeight
    for (let i = 0; i < index; i += 1) {
      const id = options.order[i]?.id
      if (id) top += heightById.value[id] ?? 0
    }
    return top
  }

  function itemVisualTopPx(index: number) {
    if (stackLayout !== 'fixed-header') return stackTopPx(index)
    if (index === 0) return navLayout.value.totalHeight
    let top = itemVisualTopPx(0)
    const firstId = options.order[0]?.id
    top += firstId ? heightById.value[firstId] ?? rpxToPx(SEARCH_STICKY_BLOCK_RPX) : 0
    for (let i = 1; i < index; i += 1) {
      const id = options.order[i]?.id
      if (id) top += heightById.value[id] ?? 0
    }
    return top
  }

  function syncStuckFromScroll(scrollTop: number) {
    if (stackLayout !== 'fixed-header' || !options.order.length) return
    const firstId = options.order[0].id
    const threshold = fixedHeaderStickThresholdPx.value
    stuckById.value = {
      ...stuckById.value,
      [firstId]: scrollTop >= threshold,
    }
    for (let i = 1; i < options.order.length; i += 1) {
      const id = options.order[i].id
      stuckById.value[id] = stuckById.value[firstId]
    }
  }

  /** 元素 top 触及 stackTop 锚点即吸顶（与 CSS sticky 一致，跟手滚动实时判定） */
  function isItemStuckAtViewportTop(top: number, index: number, wasStuck: boolean) {
    const anchor = stackTopPx(index)
    if (wasStuck) {
      return top <= anchor + STUCK_TOP_EPSILON_PX + STUCK_RELEASE_HYSTERESIS_PX
    }
    return top <= anchor + STUCK_TOP_EPSILON_PX
  }

  function syncStuckFromRects(rects: Array<{ id: string; top: number; index: number }>) {
    if (stackLayout === 'fixed-header' || usesContentScrollEmulation()) return
    let changed = false
    const next = { ...stuckById.value }
    for (const { id, top, index } of rects) {
      const wasStuck = !!stuckById.value[id]
      const stuck = isItemStuckAtViewportTop(top, index, wasStuck)
      if (next[id] !== stuck) {
        next[id] = stuck
        changed = true
      }
    }
    if (changed) stuckById.value = next
  }

  function scheduleStuckMeasureFromRect() {
    if (usesContentScrollEmulation()) return
    if (stuckMeasureRaf) return
    stuckMeasureRaf = requestAnimationFrame(() => {
      stuckMeasureRaf = 0
      void measureStuckState()
    })
  }

  /** scroll-view 内无法用 CSS sticky：用实测 scrollTop 阈值判定吸顶/释放 */
  function syncFlowContentStuckFromScroll(scrollTop: number) {
    if (!usesContentScrollEmulation() || !options.order.length) return
    let changed = false
    const next = { ...stuckById.value }
    for (const [index, item] of options.order.entries()) {
      const threshold = stickScrollTopById.value[item.id]
      if (threshold == null) continue
      const wasStuck = !!next[item.id]
      const stuck = wasStuck
        ? scrollTop >= threshold - STUCK_RELEASE_HYSTERESIS_PX
        : scrollTop >= threshold
      if (next[item.id] !== stuck) {
        next[item.id] = stuck
        changed = true
      }
    }
    if (changed) stuckById.value = next
  }

  function measureStickScrollThresholds(): Promise<void> {
    if (!usesContentScrollEmulation()) return Promise.resolve()
    const items = options.order
    if (!items.length) return Promise.resolve()

    return new Promise((resolve) => {
      const query = Taro.createSelectorQuery()
      for (const item of items) {
        query.select(item.selector).boundingClientRect()
      }
      query.exec((res) => {
        const next = { ...stickScrollTopById.value }
        items.forEach((item, index) => {
          const rect = res?.[index] as { top?: number } | undefined
          if (rect?.top == null) return
          const threshold = Math.max(
            0,
            Math.ceil(contentScrollTop.value + rect.top - stackTopPx(index)),
          )
          next[item.id] = threshold
        })
        stickScrollTopById.value = next
        syncFlowContentStuckFromScroll(contentScrollTop.value)
        resolve()
      })
    })
  }

  function measureHeights(): Promise<void> {
    return new Promise((resolve) => {
      const items = options.order
      if (!items.length) {
        resolve()
        return
      }

      const query = Taro.createSelectorQuery()
      for (const item of items) {
        query.select(item.selector).boundingClientRect()
      }
      query.exec((res) => {
        const next = { ...heightById.value }
        items.forEach((item, index) => {
          const rect = res?.[index] as { height?: number } | undefined
          const h = Math.ceil(rect?.height ?? 0)
          if (h > 0) next[item.id] = h
        })
        heightById.value = next
        resolve()
      })
    })
  }

  function measureStuckState(): Promise<void> {
    return new Promise((resolve) => {
      const items = options.order
      if (!items.length) {
        resolve()
        return
      }

      const query = Taro.createSelectorQuery()
      for (const item of items) {
        query.select(item.selector).boundingClientRect()
      }
      query.exec((res) => {
        const rects = items.map((item, index) => {
          const rect = res?.[index] as { top?: number } | undefined
          return {
            id: item.id,
            index,
            top: rect?.top ?? 9999,
          }
        })
        syncStuckFromRects(rects)
        resolve()
      })
    })
  }

  function scheduleMeasure() {
    const pass = ++measurePass
    void nextTick(async () => {
      for (const delay of MEASURE_RETRY_DELAYS_MS) {
        if (pass !== measurePass) return
        if (delay > 0) {
          await new Promise<void>((r) => {
            setTimeout(r, delay)
          })
        }
        if (pass !== measurePass) return
        await measureHeights()
        if (usesContentScrollEmulation()) {
          await measureStickScrollThresholds()
        } else {
          await measureStuckState()
        }
        const hasHeights = options.order.every((item) => (heightById.value[item.id] ?? 0) > 0)
        if (hasHeights) return
      }
    })
  }

  function onScrollUpdate(scrollTop: number) {
    lastScrollTop = scrollTop
    contentScrollTop.value = scrollTop

    if (stackLayout === 'fixed-header') {
      syncStuckFromScroll(scrollTop)
      return
    }
    if (usesContentScrollEmulation()) {
      syncFlowContentStuckFromScroll(scrollTop)
      return
    }
    scheduleStuckMeasureFromRect()
  }

  if (scrollMode === 'page') {
    usePageScroll(({ scrollTop }) => {
      onScrollUpdate(scrollTop)
    })
  }

  useReady(() => {
    getNavBarLayout(true)
    layoutTick.value += 1
    scheduleMeasure()
  })

  useDidShow(() => {
    getNavBarLayout(true)
    layoutTick.value += 1
    lastScrollTop = 0
    scheduleMeasure()
  })

  if (options.remeasureDeps?.length) {
    watch(
      options.remeasureDeps,
      () => scheduleMeasure(),
      { flush: 'post' },
    )
  }

  function isStuck(id: string) {
    return computed(() => !!stuckById.value[id])
  }

  function stickyStyle(id: string) {
    return computed(() => {
      const index = idToIndex.value.get(id)
      if (index == null) return {}
      const zIndex = itemZIndex(index, options.order[index]?.zIndex)
      if (stackLayout === 'fixed-header') {
        return {
          position: 'fixed',
          left: '0',
          right: '0',
          top: `${itemVisualTopPx(index)}px`,
          zIndex,
        } as Record<string, string | number>
      }
      if (usesContentScrollEmulation() && stuckById.value[id]) {
        return {
          position: 'fixed',
          left: '0',
          right: '0',
          top: `${stackTopPx(index)}px`,
          zIndex,
          width: '100%',
          boxSizing: 'border-box',
        } as Record<string, string | number>
      }
      return {
        position: 'sticky',
        top: `${stackTopPx(index)}px`,
        zIndex,
      } as Record<string, string | number>
    })
  }

  /** scroll-view 内吸顶占位：fixed 脱流后保持文档高度，避免列表跳动 */
  function stickySlotStyle(id: string) {
    return computed(() => {
      if (!usesContentScrollEmulation() || !stuckById.value[id]) return {}
      const h = heightById.value[id] ?? 0
      if (h <= 0) return {}
      return {
        height: `${h}px`,
        flexShrink: '0',
      }
    })
  }

  function triggerStyle(id: string) {
    return computed(() => {
      layoutTick.value
      const item = options.order.find((entry) => entry.id === id)
      const reserveCapsule = !!item?.reserveCapsule && !!stuckById.value[id]
      if (!reserveCapsule) return {}
      const { triggerMaxWidthPx } = getSearchBarCapsuleLayout({
        pageHorizontalPadRpx: item.pageHorizontalPadRpx ?? 24,
        gapBeforeCapsulePx: item.gapBeforeCapsulePx ?? 8,
      })
      return { maxWidth: `${triggerMaxWidthPx}px` }
    })
  }

  const firstItemId = computed(() => options.order[0]?.id ?? '')

  const isFirstStuck = computed(() => {
    const id = firstItemId.value
    return id ? !!stuckById.value[id] : false
  })

  const firstItemConfig = computed(() => options.order[0])

  /** order[0] 吸顶时显示的状态栏实底遮罩（fixed，不占位） */
  const isStatusBarFillVisible = computed(() => {
    const first = firstItemConfig.value
    if (!first || first.statusBarFill === false) return false
    return isFirstStuck.value
  })

  const statusBarFillStyle = computed(() => {
    if (!isStatusBarFillVisible.value) return null
    return {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      height: `${navLayout.value.statusBarHeight}px`,
      zIndex: 119,
      background,
    }
  })

  function stuckClass(id: string) {
    return computed(() => (stuckById.value[id] ? 'is-stuck' : ''))
  }

  function onContentScroll(event: { detail?: { scrollTop?: number } }) {
    onScrollUpdate(Number(event.detail?.scrollTop) || 0)
  }

  /** fixed-header：内容区 panel 的 top / height（scroll-view 容器） */
  function contentPanelLayout(extraTopRpx = 0) {
    return computed(() => {
      const lastIndex = options.order.length - 1
      const lastId = options.order[lastIndex]?.id
      const baseTop =
        lastIndex >= 0 && lastId
          ? itemVisualTopPx(lastIndex) + (heightById.value[lastId] ?? 0)
          : navLayout.value.totalHeight
      const top = baseTop + rpxToPx(extraTopRpx)
      const { windowHeight } = Taro.getWindowInfo()
      return {
        top: `${top}px`,
        height: `${Math.max(0, windowHeight - top)}px`,
      }
    })
  }

  return {
    stickyStyle,
    stickySlotStyle,
    triggerStyle,
    stuckClass,
    isStuck,
    isFirstStuck,
    isStatusBarFillVisible,
    statusBarFillStyle,
    heightById,
    stackTopPx,
    contentPanelLayout,
    onContentScroll,
    contentScrollTop,
    lastScrollTop: () => lastScrollTop,
    remeasure: scheduleMeasure,
  }
}
