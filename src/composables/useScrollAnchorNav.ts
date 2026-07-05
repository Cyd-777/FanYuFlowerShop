import { onMounted, ref, watch, nextTick, type MaybeRefOrGetter, toValue } from 'vue'
import Taro, { useReady } from '@tarojs/taro'
import type { ScrollAnchorTab } from '@/types/scrollAnchorNav'

export interface UseScrollAnchorNavOptions {
  scrollSelector: string
  tabs: MaybeRefOrGetter<ScrollAnchorTab[]>
  /** 滚动高亮判定：锚点距 scroll 顶部的额外容差（px） */
  activeOffsetPx?: MaybeRefOrGetter<number>
  /**
   * scroll 视口顶部被浮层占用的 inset（px），如胶囊栏高度。
   * 跳转时从 scrollTop 减去；高亮判定时与 activeOffsetPx 相加。
   */
  viewportTopInsetPx?: MaybeRefOrGetter<number>
  /** 按 tab 下标解析 inset（一阶跳转/高亮随目标分区变化时使用） */
  getViewportTopInsetForTabIndex?: (tabIndex: number) => number
  /** 与另一 ScrollAnchorNav 实例共用，避免跳转动画期间双端 sync 打架 */
  jumpLockRef?: { value: boolean }
  /** true 时 onScroll 只更新 scrollTop，由页面按权重调度 syncFromScroll */
  deferScrollSync?: boolean
  /** syncScopeIndex 变化时仅重置 activeIndex，不立即 sync（低权重实例用） */
  scopeChangeMode?: 'sync' | 'reset'
  /** 内容变化时重新量锚点 */
  contentWatchKey?: MaybeRefOrGetter<unknown>
  /** false 时不根据滚动更新选中态 */
  enabled?: MaybeRefOrGetter<boolean>
  /**
   * 二阶嵌套时：滚动联动只作用于 scopeIndex 匹配的 tab；
   * 锚点仍全量测量，切换一阶不会清空缓存。
   */
  syncScopeIndex?: MaybeRefOrGetter<number | undefined>
  /**
   * 一阶标题等：selectAll 按 DOM 顺序与 tabs 下标对齐，比逐个 #id 查询更稳。
   */
  anchorHeaderSelector?: string
}

/** 微信 SelectorQuery 单次 batch 建议上限 */
const ANCHOR_QUERY_BATCH = 15

const CLICK_JUMP_MS = 420

type ScrollViewNode = {
  scrollTo?: (options: { top: number; animated?: boolean; duration?: number }) => void
}

/**
 * 滚动容器 ↔ Tab 锚点联动原语。
 * 每个调用方独立闭包（activeIndex / anchorTops / lastScrollTop 互不共享）；
 * 可选 jumpLockRef 与另一实例共用，避免跳转期间双端 sync。
 */
export function useScrollAnchorNav(options: UseScrollAnchorNavOptions) {
  const activeIndex = ref(0)
  const anchorTopsByKey = ref<Record<string, number>>({})

  let lastScrollTop = 0
  let localJumpLock = false
  let measureTimer: ReturnType<typeof setTimeout> | null = null

  function isJumpLocked(): boolean {
    return options.jumpLockRef?.value ?? localJumpLock
  }

  function setJumpLock(locked: boolean) {
    if (options.jumpLockRef) {
      options.jumpLockRef.value = locked
    } else {
      localJumpLock = locked
    }
  }

  function getTabs(): ScrollAnchorTab[] {
    return toValue(options.tabs)
  }

  /** 当前参与 scroll↔选中 联动的 tab（可按一阶 scope 过滤） */
  function getSyncTabs(): ScrollAnchorTab[] {
    const tabs = getTabs()
    if (options.syncScopeIndex === undefined) return tabs
    const scope = toValue(options.syncScopeIndex)
    if (scope === undefined) return []
    return tabs.filter((t) => t.scopeIndex === scope)
  }

  function isEnabled(): boolean {
    return options.enabled === undefined ? true : Boolean(toValue(options.enabled))
  }

  function resolveInsetTabIndex(forJumpPrimaryTabIndex?: number): number | undefined {
    if (options.syncScopeIndex !== undefined) {
      return toValue(options.syncScopeIndex)
    }
    if (forJumpPrimaryTabIndex !== undefined) return forJumpPrimaryTabIndex
    return activeIndex.value
  }

  function resolveViewportTopInsetPx(forJumpPrimaryTabIndex?: number): number {
    const tabIndex = resolveInsetTabIndex(forJumpPrimaryTabIndex)
    if (tabIndex !== undefined && options.getViewportTopInsetForTabIndex) {
      return options.getViewportTopInsetForTabIndex(tabIndex)
    }
    return toValue(options.viewportTopInsetPx) ?? 0
  }

  function resolveScrollAlignOffsetPx(forJumpPrimaryTabIndex?: number): number {
    const inset = resolveViewportTopInsetPx(forJumpPrimaryTabIndex)
    const margin = toValue(options.activeOffsetPx) ?? 8
    return inset + margin
  }

  function resolveActiveIndex(): number {
    const tabs = getSyncTabs()
    if (!tabs.length) return 0

    const offset = resolveScrollAlignOffsetPx()
    const sorted = [...tabs].sort((a, b) => {
      const ta = anchorTopsByKey.value[a.key] ?? Infinity
      const tb = anchorTopsByKey.value[b.key] ?? Infinity
      return ta - tb
    })

    let nextIdx = 0
    for (const tab of sorted) {
      const top = anchorTopsByKey.value[tab.key]
      if (top === undefined) continue
      const idx = tabs.findIndex((t) => t.key === tab.key)
      if (idx < 0) continue
      if (top - lastScrollTop <= offset) nextIdx = idx
      else break
    }
    return nextIdx
  }

  function syncFromScroll(): boolean {
    if (isJumpLocked() || !isEnabled()) return false
    const prev = activeIndex.value
    const next = resolveActiveIndex()
    if (activeIndex.value !== next) {
      activeIndex.value = next
    }
    return activeIndex.value !== prev
  }

  function trackScroll(event: { detail?: { scrollTop?: number } }) {
    lastScrollTop = event.detail?.scrollTop ?? 0
    ensureAnchorsForScroll()
  }

  function measureAnchors(onMeasured?: () => void, syncAfter = true) {
    const tabs = getTabs()
    if (!tabs.length) {
      anchorTopsByKey.value = {}
      onMeasured?.()
      return
    }

    if (options.anchorHeaderSelector) {
      const query = Taro.createSelectorQuery()
      query.select(options.scrollSelector).boundingClientRect()
      query.selectAll(options.anchorHeaderSelector).boundingClientRect()
      query.exec((res) => {
        const scrollRect = res?.[0] as { top?: number } | undefined
        const headerRects = (res?.[1] || []) as Array<{ top?: number }>
        if (!scrollRect || typeof scrollRect.top !== 'number') {
          onMeasured?.()
          return
        }

        const tops: Record<string, number> = { ...anchorTopsByKey.value }
        for (let i = 0; i < tabs.length; i++) {
          const tab = tabs[i]
          const top = headerRects[i]?.top
          if (!tab || typeof top !== 'number') continue
          tops[tab.key] = top - scrollRect.top + lastScrollTop
        }
        anchorTopsByKey.value = tops
        if (syncAfter && !isJumpLocked() && isEnabled()) {
          syncFromScroll()
        }
        onMeasured?.()
      })
      return
    }

    const measurable = tabs.filter((t) => t.anchorId)
    if (!measurable.length) {
      onMeasured?.()
      return
    }

    const tops: Record<string, number> = { ...anchorTopsByKey.value }
    let batchStart = 0

    function runBatch() {
      const batch = measurable.slice(batchStart, batchStart + ANCHOR_QUERY_BATCH)
      if (!batch.length) {
        anchorTopsByKey.value = tops
        if (syncAfter && !isJumpLocked() && isEnabled()) {
          syncFromScroll()
        }
        onMeasured?.()
        return
      }

      const query = Taro.createSelectorQuery()
      query.select(options.scrollSelector).boundingClientRect()
      for (const tab of batch) {
        query.select(`#${tab.anchorId}`).boundingClientRect()
      }
      query.exec((res) => {
        const scrollRect = res?.[0] as { top?: number } | undefined
        if (!scrollRect || typeof scrollRect.top !== 'number') {
          batchStart += ANCHOR_QUERY_BATCH
          runBatch()
          return
        }

        batch.forEach((tab, i) => {
          const rect = res?.[i + 1] as { top?: number } | undefined
          if (rect && typeof rect.top === 'number') {
            tops[tab.key] = rect.top - scrollRect.top + lastScrollTop
          }
        })

        batchStart += ANCHOR_QUERY_BATCH
        runBatch()
      })
    }

    runBatch()
  }

  function scheduleMeasure() {
    void nextTick(() => {
      setTimeout(() => measureAnchors(), 80)
      setTimeout(() => measureAnchors(), 240)
    })
  }

  function ensureAnchorsForScroll() {
    const tabs = getTabs()
    const hasAny = tabs.some((t) => anchorTopsByKey.value[t.key] !== undefined)
    if (hasAny) return
    if (measureTimer) return
    measureTimer = setTimeout(() => {
      measureTimer = null
      measureAnchors()
    }, 16)
  }

  function finishJump(onDone?: () => void) {
    setJumpLock(false)
    measureAnchors(onDone, false)
  }

  function scrollToTop(top: number, onDone?: () => void) {
    Taro.createSelectorQuery()
      .select(options.scrollSelector)
      .node()
      .exec((nodeRes) => {
        const node = (nodeRes?.[0] as { node?: ScrollViewNode } | undefined)?.node
        if (node?.scrollTo) {
          node.scrollTo({ top, animated: true, duration: CLICK_JUMP_MS })
          setTimeout(() => finishJump(onDone), CLICK_JUMP_MS + 24)
          return
        }
        setJumpLock(false)
        onDone?.()
      })
  }

  function jumpToAnchor(anchorId: string, onDone?: () => void) {
    if (!anchorId) {
      onDone?.()
      return
    }

    const syncTabs = getSyncTabs()
    const scopedIdx = syncTabs.findIndex((t) => t.anchorId === anchorId)
    if (scopedIdx >= 0) activeIndex.value = scopedIdx

    setJumpLock(true)

    const query = Taro.createSelectorQuery()
    query.select(options.scrollSelector).boundingClientRect()
    query.select(`#${anchorId}`).boundingClientRect()
    query.exec((res) => {
      const scrollRect = res?.[0] as { top?: number } | undefined
      const anchorRect = res?.[1] as { top?: number } | undefined
      if (
        !scrollRect
        || !anchorRect
        || typeof scrollRect.top !== 'number'
        || typeof anchorRect.top !== 'number'
      ) {
        setJumpLock(false)
        onDone?.()
        return
      }

      const jumpPrimaryTabIndex =
        options.syncScopeIndex === undefined && scopedIdx >= 0 ? scopedIdx : undefined
      const alignOffset = resolveScrollAlignOffsetPx(jumpPrimaryTabIndex)
      const top = Math.max(
        0,
        Math.floor(anchorRect.top - scrollRect.top + lastScrollTop - alignOffset),
      )
      scrollToTop(top, onDone)
    })
  }

  function jumpToIndex(index: number, onDone?: () => void) {
    const tab = getSyncTabs()[index]
    if (!tab) {
      onDone?.()
      return
    }
    jumpToAnchor(tab.anchorId, onDone)
  }

  function clickTab(index: number, onDone?: () => void) {
    jumpToIndex(index, onDone)
  }

  function onScroll(event: { detail?: { scrollTop?: number } }) {
    trackScroll(event)
    if (!options.deferScrollSync) {
      syncFromScroll()
    }
  }

  /** 仅 anchorId 集合变化时清空缓存；换 scope 不清 */
  watch(
    () => getTabs().map((t) => t.anchorId).filter(Boolean).sort().join('|'),
    (next, prev) => {
      if (next === prev) return
      anchorTopsByKey.value = {}
      scheduleMeasure()
    },
  )

  if (options.syncScopeIndex !== undefined) {
    watch(
      () => toValue(options.syncScopeIndex),
      () => {
        activeIndex.value = 0
        if (options.scopeChangeMode === 'reset') return
        if (isJumpLocked() || !isEnabled()) return
        syncFromScroll()
      },
    )
  }

  if (options.contentWatchKey !== undefined) {
    watch(
      () => toValue(options.contentWatchKey),
      () => scheduleMeasure(),
    )
  }

  onMounted(() => scheduleMeasure())
  useReady(() => scheduleMeasure())

  return {
    activeIndex,
    onScroll,
    trackScroll,
    syncFromScroll,
    clickTab,
    jumpToIndex,
    jumpToAnchor,
    remeasure: scheduleMeasure,
    measureAnchors,
  }
}
