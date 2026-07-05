import { computed, nextTick, onMounted, ref, watch, type MaybeRefOrGetter, toValue } from 'vue'
import Taro, { useReady } from '@tarojs/taro'
import { rpxToPx } from '@/composables/usePageSticky'
import { getNavBarLayout } from '@/utils/navBarLayout'

/** Hero 与面板顶部的视觉叠合量（rpx，对应原 -20rpx margin） */
const HERO_PANEL_OVERLAP_RPX = 20
/** 默认：收起时面板可见高度占内容区比例（≈原 min-height: 55vh） */
export const WIKI_FLOATING_PANEL_DEFAULT_PEEK_RATIO = 0.55
/** 视为「面板已贴满屏幕」的 translateY 容差（px） */
const PANEL_EXPANDED_EPSILON_PX = 2
/** 内层 scroll 视为在顶部的容差（px） */
const INNER_SCROLL_TOP_EPSILON_PX = 8
const MEASURE_DELAYS_MS = [80, 320, 640, 1200]

export interface WikiFloatingPanelOptions {
  heroSelector: string
  innerScrollSelector: string
  contentWatchKey?: MaybeRefOrGetter<unknown>
  isContentReady?: () => boolean
  navTotalHeight: MaybeRefOrGetter<number>
  collapsedPeekRatio?: MaybeRefOrGetter<number>
  initialOffsetY?: MaybeRefOrGetter<number | undefined>
  ensureHeroVisible?: boolean
}

function clampRatio(value: number) {
  return Math.max(0.15, Math.min(0.92, value))
}

function computeCollapsedOffsetY(
  navTotalHeight: number,
  peekRatio: number,
  heroHeightPx = 0,
  ensureHeroVisible = true,
) {
  const { windowHeight } = Taro.getWindowInfo()
  const contentHeight = Math.max(320, windowHeight - navTotalHeight)
  const peekOffset = Math.round(contentHeight * (1 - clampRatio(peekRatio)))
  if (ensureHeroVisible && heroHeightPx > 0) {
    const overlap = rpxToPx(HERO_PANEL_OVERLAP_RPX)
    const heroOffset = Math.round(heroHeightPx - overlap)
    return Math.max(peekOffset, heroOffset, 160)
  }
  return Math.max(peekOffset, 160)
}

export function useWikiFloatingPanel(options: WikiFloatingPanelOptions) {
  const ensureHeroVisible = options.ensureHeroVisible !== false

  function resolvePeekRatio() {
    const raw =
      options.collapsedPeekRatio !== undefined
        ? toValue(options.collapsedPeekRatio)
        : WIKI_FLOATING_PANEL_DEFAULT_PEEK_RATIO
    return clampRatio(raw)
  }

  function resolveMaxOffsetY(heroHeightPx = 0) {
    const navH = toValue(options.navTotalHeight)
    return computeCollapsedOffsetY(navH, resolvePeekRatio(), heroHeightPx, ensureHeroVisible)
  }

  function resolveInitialOffsetY(maxOffset: number) {
    const explicit =
      options.initialOffsetY !== undefined ? toValue(options.initialOffsetY) : undefined
    if (typeof explicit === 'number' && Number.isFinite(explicit)) {
      return Math.max(0, Math.min(maxOffset, Math.round(explicit)))
    }
    return maxOffset
  }

  const navHeightOnInit = toValue(options.navTotalHeight)
  const initialMaxOffset = computeCollapsedOffsetY(
    navHeightOnInit,
    resolvePeekRatio(),
    0,
    ensureHeroVisible,
  )

  const panelOffsetY = ref(resolveInitialOffsetY(initialMaxOffset))
  const maxOffsetY = ref(initialMaxOffset)
  const innerScrollTop = ref(0)
  const panelDragActive = ref(false)
  let preferCollapsedStart = true
  let lastHeroHeight = 0

  const panelExpanded = computed(() => panelOffsetY.value <= PANEL_EXPANDED_EPSILON_PX)
  const innerScrollEnabled = computed(() => panelExpanded.value && !panelDragActive.value)
  const panelCatchMove = computed(() => panelDragActive.value)

  const panelStyle = computed(() => {
    const navH = toValue(options.navTotalHeight)
    return {
      top: `${navH}px`,
      transform: `translate3d(0, ${panelOffsetY.value}px, 0)`,
    }
  })

  let touchStartY = 0
  let touchStartOffset = 0
  let lastTouchY = 0
  let bodyPanelHandoff = false

  function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value))
  }

  function isInnerAtTop() {
    return innerScrollTop.value <= INNER_SCROLL_TOP_EPSILON_PX
  }

  function setPanelOffsetByClientY(clientY: number) {
    panelDragActive.value = true
    panelOffsetY.value = clamp(touchStartOffset + (clientY - touchStartY), 0, maxOffsetY.value)
  }

  function applyCollapsedOffset(heroHeightPx = 0) {
    if (heroHeightPx > 0) lastHeroHeight = heroHeightPx
    const hero = heroHeightPx > 0 ? heroHeightPx : lastHeroHeight
    maxOffsetY.value = resolveMaxOffsetY(hero)
    if (preferCollapsedStart) {
      panelOffsetY.value = resolveInitialOffsetY(maxOffsetY.value)
    } else {
      panelOffsetY.value = clamp(panelOffsetY.value, 0, maxOffsetY.value)
    }
  }

  function resetToCollapsed() {
    preferCollapsedStart = true
    innerScrollTop.value = 0
    bodyPanelHandoff = false
    panelDragActive.value = false
    applyCollapsedOffset()
  }

  function measureLayout() {
    const query = Taro.createSelectorQuery()
    query.select(options.heroSelector).boundingClientRect()
    query.exec((res) => {
      const heroRect = res?.[0] as { height?: number } | undefined
      const heroHeight = heroRect?.height ?? 0
      applyCollapsedOffset(heroHeight > 0 ? heroHeight : 0)
    })
  }

  function scheduleMeasure() {
    getNavBarLayout(true)
    applyCollapsedOffset()
    void nextTick(() => {
      for (const delay of MEASURE_DELAYS_MS) {
        setTimeout(measureLayout, delay)
      }
    })
  }

  function onPanelTouchStart(event: { touches?: Array<{ clientY?: number }> }) {
    preferCollapsedStart = false
    bodyPanelHandoff = false
    const clientY = event.touches?.[0]?.clientY ?? 0
    touchStartY = clientY
    lastTouchY = clientY
    touchStartOffset = panelOffsetY.value
  }

  function onPanelTouchMove(event: {
    touches?: Array<{ clientY?: number }>
    stopPropagation?: () => void
    preventDefault?: () => void
  }) {
    const clientY = event.touches?.[0]?.clientY ?? touchStartY
    lastTouchY = clientY
    setPanelOffsetByClientY(clientY)
    event.stopPropagation?.()
    event.preventDefault?.()
    return true
  }

  function onChromeTouchStart(event: { touches?: Array<{ clientY?: number }> }) {
    onPanelTouchStart(event)
  }

  function onChromeTouchMove(event: Parameters<typeof onPanelTouchMove>[0]) {
    onPanelTouchMove(event)
  }

  function onBodyTouchStart(event: { touches?: Array<{ clientY?: number }> }) {
    onPanelTouchStart(event)
  }

  function onBodyTouchMove(event: {
    touches?: Array<{ clientY?: number }>
    stopPropagation?: () => void
    preventDefault?: () => void
  }) {
    const clientY = event.touches?.[0]?.clientY ?? lastTouchY
    const frameDeltaY = clientY - lastTouchY
    lastTouchY = clientY

    const draggingPanel =
      panelOffsetY.value > PANEL_EXPANDED_EPSILON_PX || bodyPanelHandoff || panelDragActive.value

    if (draggingPanel) {
      setPanelOffsetByClientY(clientY)
      event.stopPropagation?.()
      event.preventDefault?.()
      return true
    }

    if (panelExpanded.value && isInnerAtTop() && frameDeltaY > 0) {
      bodyPanelHandoff = true
      touchStartY = clientY
      touchStartOffset = panelOffsetY.value
      setPanelOffsetByClientY(clientY)
      event.stopPropagation?.()
      event.preventDefault?.()
      return true
    }

    panelDragActive.value = false
    return false
  }

  function onPanelTouchEnd() {
    bodyPanelHandoff = false
    panelDragActive.value = false
  }

  function expandPanel() {
    preferCollapsedStart = false
    panelOffsetY.value = 0
    bodyPanelHandoff = false
    panelDragActive.value = false
  }

  function collapsePanel() {
    preferCollapsedStart = false
    panelOffsetY.value = maxOffsetY.value
    innerScrollTop.value = 0
    bodyPanelHandoff = false
    panelDragActive.value = false
  }

  function onPanelBodyScroll(event: { detail?: { scrollTop?: number } }) {
    innerScrollTop.value = Math.max(0, event.detail?.scrollTop ?? 0)
  }

  function onPanelScrollToUpper() {
    innerScrollTop.value = 0
  }

  async function ensureExpanded() {
    expandPanel()
    await nextTick()
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 80)
    })
  }

  if (options.collapsedPeekRatio !== undefined) {
    watch(
      () => toValue(options.collapsedPeekRatio!),
      () => {
        if (preferCollapsedStart) applyCollapsedOffset()
      },
    )
  }

  if (options.contentWatchKey !== undefined) {
    watch(
      () => toValue(options.contentWatchKey!),
      () => {
        resetToCollapsed()
        scheduleMeasure()
      },
      { flush: 'sync' },
    )
  }

  if (options.isContentReady) {
    watch(
      () => options.isContentReady?.(),
      (ready) => {
        if (!ready) return
        resetToCollapsed()
        scheduleMeasure()
      },
      { flush: 'sync' },
    )
  }

  onMounted(() => scheduleMeasure())
  useReady(() => scheduleMeasure())

  return {
    panelOffsetY,
    maxOffsetY,
    panelExpanded,
    innerScrollEnabled,
    panelCatchMove,
    panelStyle,
    innerScrollTop,
    panelDragActive,
    expandPanel,
    collapsePanel,
    ensureExpanded,
    onChromeTouchStart,
    onChromeTouchMove,
    onBodyTouchStart,
    onBodyTouchMove,
    onPanelTouchEnd,
    onPanelBodyScroll,
    onPanelScrollToUpper,
    remeasure: scheduleMeasure,
  }
}
