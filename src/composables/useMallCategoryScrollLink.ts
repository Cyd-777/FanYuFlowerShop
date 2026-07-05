import { onMounted, ref, watch, nextTick, type MaybeRefOrGetter, toValue } from 'vue'
import Taro, { useReady } from '@tarojs/taro'
import type { MallPrimarySection } from '@/utils/mallCategoryNav'

export interface MallCategoryScrollLinkOptions {
  scrollSelector: string
  sections: MaybeRefOrGetter<MallPrimarySection[]>
  /** 内容变化时重新量高度 */
  contentWatchKey?: MaybeRefOrGetter<unknown>
  /** 当前分区有二阶胶囊时，scrollTop 判线额外下移（px，通常为胶囊栏高度） */
  getPillInsetPx?: (sectionTabIndex: number) => number
}

interface SectionMeasure {
  tabIndex: number
  /** 分区标题距列表顶部的 scrollTop（px） */
  top: number
  groupTops: number[]
  groupAnchorIds: string[]
}

/**
 * 美团外卖店铺页同构：预量高度区间 + scroll-into-view 跳转 + scroll 查表高亮。
 * 参考：大众点评点餐联动、similar-mt-store-scroll-linkage。
 */
export function useMallCategoryScrollLink(options: MallCategoryScrollLinkOptions) {
  const primaryActiveIndex = ref(0)
  const secondaryActiveIndex = ref(0)
  const contentScrollIntoView = ref('')

  let lastScrollTop = 0
  let lastPrimaryTabIndex = 0
  let lastSecondary = 0
  let tapLock = false
  let tapLockTimer: ReturnType<typeof setTimeout> | null = null
  let measures: SectionMeasure[] = []

  function getSections(): MallPrimarySection[] {
    return toValue(options.sections)
  }

  function pillInsetFor(tabIndex: number): number {
    return options.getPillInsetPx?.(tabIndex) ?? 0
  }

  function sectionAt(tabIndex: number): MallPrimarySection | undefined {
    return getSections().find((s) => s.tabIndex === tabIndex) ?? getSections()[tabIndex]
  }

  function secondaryPillBarActiveAt(tabIndex: number): boolean {
    const section = sectionAt(tabIndex)
    if (!section?.showSecondaryPillBar) return false
    const groups = section.groups.filter((g) => !g.hideAnchor && g.title)
    return groups.length >= 2
  }

  function findIndexByScrollTop(scrollTop: number, tops: number[], lineOffset: number): number {
    if (!tops.length) return 0
    const line = scrollTop + lineOffset
    for (let i = tops.length - 1; i >= 0; i--) {
      if (line >= tops[i]) return i
    }
    return 0
  }

  function measureHeights(onDone?: () => void) {
    const sections = getSections()
    if (!sections.length) {
      measures = []
      onDone?.()
      return
    }

    const groupAnchorIds: string[] = []
    for (const section of sections) {
      for (const group of section.groups) {
        if (group.hideAnchor || !group.title) continue
        groupAnchorIds.push(group.anchorId)
      }
    }

    const query = Taro.createSelectorQuery()
    query.select(options.scrollSelector).boundingClientRect()
    query.select(options.scrollSelector).scrollOffset()
    query.selectAll('.primary-section-header').boundingClientRect()
    for (const anchorId of groupAnchorIds) {
      query.select(`#${anchorId}`).boundingClientRect()
    }

    query.exec((res) => {
      const scrollRect = res?.[0] as { top?: number } | undefined
      const scrollOffset = res?.[1] as { scrollTop?: number } | undefined
      const headerRects = (res?.[2] || []) as Array<{ top?: number }>
      if (!scrollRect || typeof scrollRect.top !== 'number' || !scrollOffset) {
        onDone?.()
        return
      }

      const baseScrollTop = scrollOffset.scrollTop ?? 0
      let groupRectIdx = 3

      measures = sections.map((section, i) => {
        const headerRect = headerRects[i]
        const top =
          headerRect && typeof headerRect.top === 'number'
            ? baseScrollTop + headerRect.top - scrollRect.top
            : 0

        const tops: number[] = []
        const ids: string[] = []

        for (const group of section.groups) {
          if (group.hideAnchor || !group.title) continue
          const rect = res?.[groupRectIdx] as { top?: number } | undefined
          groupRectIdx += 1
          ids.push(group.anchorId)
          tops.push(
            rect && typeof rect.top === 'number'
              ? baseScrollTop + rect.top - scrollRect.top
              : top,
          )
        }

        return {
          tabIndex: section.tabIndex,
          top,
          groupTops: tops,
          groupAnchorIds: ids,
        }
      })

      onDone?.()
    })
  }

  function scheduleMeasure() {
    void nextTick(() => {
      setTimeout(() => measureHeights(), 80)
      setTimeout(() => measureHeights(), 280)
    })
  }

  function lockTapScroll() {
    tapLock = true
    if (tapLockTimer) clearTimeout(tapLockTimer)
    tapLockTimer = setTimeout(() => {
      tapLock = false
      tapLockTimer = null
      contentScrollIntoView.value = ''
    }, 360)
  }

  function jumpToAnchor(anchorId: string) {
    if (!anchorId) return
    lockTapScroll()
    contentScrollIntoView.value = anchorId
  }

  function clickPrimaryTab(tabIndex: number) {
    const section = sectionAt(tabIndex)
    if (!section) return
    primaryActiveIndex.value = tabIndex
    lastPrimaryTabIndex = tabIndex
    secondaryActiveIndex.value = 0
    lastSecondary = 0
    jumpToAnchor(section.primaryAnchorId)
  }

  function clickSecondaryTab(anchorId: string) {
    if (!anchorId) return
    const tabIndex = primaryActiveIndex.value
    const measure = measures.find((m) => m.tabIndex === tabIndex)
    const pillIndex = measure?.groupAnchorIds.indexOf(anchorId) ?? -1
    if (pillIndex >= 0) {
      secondaryActiveIndex.value = pillIndex
      lastSecondary = pillIndex
    }
    jumpToAnchor(anchorId)
  }

  function onContentScroll(event: { detail?: { scrollTop?: number } }) {
    lastScrollTop = event.detail?.scrollTop ?? 0
    if (tapLock || !measures.length) return

    const primaryTops = measures.map((m) => m.top)
    const primaryInset = pillInsetFor(lastPrimaryTabIndex)
    const measureIdx = findIndexByScrollTop(lastScrollTop, primaryTops, primaryInset)
    const nextPrimaryTabIndex = measures[measureIdx]?.tabIndex ?? 0

    if (nextPrimaryTabIndex !== lastPrimaryTabIndex) {
      lastPrimaryTabIndex = nextPrimaryTabIndex
      primaryActiveIndex.value = nextPrimaryTabIndex
      lastSecondary = 0
      secondaryActiveIndex.value = 0
      return
    }

    if (!secondaryPillBarActiveAt(nextPrimaryTabIndex)) return

    const measure = measures[measureIdx]
    if (!measure?.groupTops.length) return

    const nextSecondary = findIndexByScrollTop(
      lastScrollTop,
      measure.groupTops,
      pillInsetFor(nextPrimaryTabIndex),
    )

    if (nextSecondary !== lastSecondary) {
      lastSecondary = nextSecondary
      secondaryActiveIndex.value = nextSecondary
    }
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
    primaryActiveIndex,
    secondaryActiveIndex,
    contentScrollIntoView,
    onContentScroll,
    clickPrimaryTab,
    clickSecondaryTab,
    remeasure: scheduleMeasure,
  }
}
