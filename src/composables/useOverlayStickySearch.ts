import { computed, nextTick, ref, watch, type WatchSource } from 'vue'
import Taro, { useDidShow, usePageScroll, useReady } from '@tarojs/taro'
import { useNavBarLayout } from '@/composables/useNavBarLayout'
import { rpxToPx, SEARCH_TRIGGER_RPX } from '@/composables/usePageSticky'
import { getNavBarLayout, getSearchBarCapsuleLayout } from '@/utils/navBarLayout'

/** 进入吸顶：scrollTop 略低于测量阈值即触发（px） */
const STICK_ENTER_BEFORE_PX = 2
/** 退出吸顶：须滚回阈值以下更远距离，形成滞回带（px） */
const STICK_EXIT_LAG_PX = 24
/** 吸顶后 Tab sticky-top 上移，与搜索条底重叠消除子像素缝（px） */
const TABS_STUCK_OVERLAP_PX = 1
/** 测量失败时的重试间隔（ms） */
const MEASURE_RETRY_DELAYS_MS = [0, 50, 150, 400]

export interface UseOverlayStickySearchOptions {
  /** 页面内搜索条容器选择器（须唯一） */
  searchSelector: string
  /** 搜索条外层上下 padding 之和（rpx） */
  wrapPadYRpx?: number
  /** 吸顶时状态栏遮罩 / 搜索条背景色 */
  background?: string
  /** 与页面 .home-search 等左右 padding 一致（rpx） */
  pageHorizontalPadRpx?: number
  /** 搜索条右缘与胶囊左缘间距（px） */
  gapBeforeCapsulePx?: number
  /** 上方区块异步撑高 / NavBar 就绪后重测阈值 */
  remeasureDeps?: WatchSource<unknown>[]
}

/**
 * Tab 浮层页搜索 + 次级 Tab 吸顶。
 * 常态全宽；滚过搜索条原位置后（isSearchStuck）才加状态栏遮罩与胶囊留白。
 * sticky 的 top 始终为 0，勿在吸顶后改 top（会破坏 position:sticky）。
 *
 * 吸顶态仅用 scrollTop + 滞回判定，避免 rect 与 scroll 双通道打架导致抖动。
 */
export function useOverlayStickySearch(options: UseOverlayStickySearchOptions) {
  const isSearchStuck = ref(false)
  /** 页面 scrollTop 达到此值时，搜索条应已吸顶 */
  const stickAtScrollPx = ref(0)
  const { layout } = useNavBarLayout()
  const wrapPadYRpx = options.wrapPadYRpx ?? 24
  const background = options.background ?? '#f8f8f8'
  const pageHorizontalPadRpx = options.pageHorizontalPadRpx ?? 24
  const gapBeforeCapsulePx = options.gapBeforeCapsulePx ?? 8
  /** 触发 didShow / ready 后重算胶囊与搜索宽度 */
  const layoutTick = ref(0)

  let lastScrollTop = 0
  let measurePass = 0

  const searchTriggerPx = computed(() => rpxToPx(SEARCH_TRIGGER_RPX))
  /** 容器 CSS 仅保留下 padding（吸顶时 inline paddingTop 已换成 statusBar） */
  const searchBottomPadPx = computed(() => rpxToPx(wrapPadYRpx / 2))

  const searchBodyHeightPx = computed(() =>
    rpxToPx(SEARCH_TRIGGER_RPX + wrapPadYRpx),
  )

  /** 吸顶后搜索条占位高：statusBar + 触发条 + 下 padding（向上取整，与真机 layout 对齐） */
  const searchStuckBlockHeightPx = computed(() =>
    Math.ceil(
      layout.value.statusBarHeight + searchTriggerPx.value + searchBottomPadPx.value,
    ),
  )

  const statusBarFillStyle = computed(() => ({
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    height: `${layout.value.statusBarHeight}px`,
    zIndex: 119,
    background,
  }))

  /** sticky top 固定 0；吸顶后仅用 padding 下移内容，宽度由 searchTriggerStyle 避让胶囊 */
  const searchStickyStyle = computed(() => {
    const style: Record<string, string> = { top: '0px' }
    if (!isSearchStuck.value) return style
    return {
      ...style,
      paddingTop: `${layout.value.statusBarHeight}px`,
    }
  })

  /** 吸顶后按设备胶囊 left 限制搜索触发条宽度 */
  const searchTriggerStyle = computed(() => {
    layoutTick.value
    if (!isSearchStuck.value) return {}
    const { triggerMaxWidthPx } = getSearchBarCapsuleLayout({
      pageHorizontalPadRpx,
      gapBeforeCapsulePx,
    })
    return { maxWidth: `${triggerMaxWidthPx}px` }
  })

  const searchCapsuleLayout = computed(() => {
    layoutTick.value
    return getSearchBarCapsuleLayout({
      pageHorizontalPadRpx,
      gapBeforeCapsulePx,
    })
  })

  const belowSearchStickyTop = computed(() => {
    if (isSearchStuck.value) {
      return `${searchStuckBlockHeightPx.value - TABS_STUCK_OVERLAP_PX}px`
    }
    return `${searchBodyHeightPx.value}px`
  })

  const tabsStickyStyle = computed(() => ({
    top: belowSearchStickyTop.value,
  }))

  /** 单一滞回：已吸顶与未吸顶使用不对称阈值，避免边界来回切换 */
  function syncStuckByScroll(scrollTop: number) {
    const threshold = stickAtScrollPx.value
    if (threshold <= 0) return

    if (isSearchStuck.value) {
      if (scrollTop <= threshold - STICK_EXIT_LAG_PX) {
        isSearchStuck.value = false
      }
      return
    }

    if (scrollTop >= threshold - STICK_ENTER_BEFORE_PX) {
      isSearchStuck.value = true
    }
  }

  function measureStickThreshold(): Promise<boolean> {
    return new Promise((resolve) => {
      Taro.createSelectorQuery()
        .select(options.searchSelector)
        .boundingClientRect()
        .selectViewport()
        .scrollOffset()
        .exec((res) => {
          const rect = res?.[0] as { top?: number } | undefined
          const scroll = res?.[1] as { scrollTop?: number } | undefined
          if (rect?.top == null) {
            resolve(false)
            return
          }
          const scrollTop = scroll?.scrollTop ?? lastScrollTop
          stickAtScrollPx.value = Math.max(0, Math.round(rect.top + scrollTop))
          syncStuckByScroll(lastScrollTop)
          resolve(true)
        })
    })
  }

  function scheduleMeasureStickThreshold() {
    const pass = ++measurePass
    void nextTick(async () => {
      for (const delay of MEASURE_RETRY_DELAYS_MS) {
        if (pass !== measurePass) return
        if (delay > 0) {
          await new Promise<void>((resolve) => {
            setTimeout(resolve, delay)
          })
        }
        if (pass !== measurePass) return
        const ok = await measureStickThreshold()
        if (ok && stickAtScrollPx.value > 0) return
      }
    })
  }

  usePageScroll(({ scrollTop }) => {
    lastScrollTop = scrollTop
    syncStuckByScroll(scrollTop)
  })

  useReady(() => {
    getNavBarLayout(true)
    layoutTick.value += 1
    scheduleMeasureStickThreshold()
  })

  useDidShow(() => {
    getNavBarLayout(true)
    layoutTick.value += 1
    scheduleMeasureStickThreshold()
  })

  if (options.remeasureDeps?.length) {
    watch(
      options.remeasureDeps,
      () => {
        scheduleMeasureStickThreshold()
      },
      { flush: 'post' },
    )
  }

  return {
    isSearchStuck,
    statusBarFillStyle,
    searchStickyStyle,
    searchTriggerStyle,
    searchCapsuleLayout,
    belowSearchStickyTop,
    tabsStickyStyle,
    remeasureStickThreshold: scheduleMeasureStickThreshold,
  }
}
