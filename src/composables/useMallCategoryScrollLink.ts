import { onMounted, ref, watch, nextTick, type MaybeRefOrGetter, toValue } from 'vue'
import Taro, { useReady } from '@tarojs/taro'
import type { MallPrimarySection } from '@/utils/mallCategoryNav'

export interface MallCategoryScrollLinkOptions {
  scrollSelector: string
  sections: MaybeRefOrGetter<MallPrimarySection[]>
  contentWatchKey?: MaybeRefOrGetter<unknown>
  /** L2 基线偏移(px)：胶囊按钮容器底边到搜索框底边的距离 */
  secondaryOffsetPx?: MaybeRefOrGetter<number>
}

interface SectionMeasure {
  tabIndex: number
  top: number
  groupTops: number[]
  groupAnchorIds: string[]
}

/**
 * 预量高度区间 + scroll-into-view 跳转 + scroll 查表高亮。
 */
export function useMallCategoryScrollLink(options: MallCategoryScrollLinkOptions) {
  const primaryActiveIndex = ref(0)
  const secondaryActiveIndex = ref(0)
  const contentScrollIntoView = ref('')

  let lastPrimaryTabIndex = 0
  let lastSecondary = 0
  let lastL2BeforeLeaving = 0
  let tapLock = false
  let tapLockTimer: ReturnType<typeof setTimeout> | null = null
  let measures: SectionMeasure[] = []

  function getSections(): MallPrimarySection[] {
    return toValue(options.sections)
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

  function findIndexByScrollTop(scrollTop: number, tops: number[], lineOffset: number, fromTop = true): number {
    if (!tops.length) return 0
    const line = scrollTop + lineOffset
    if (fromTop) {
      for (let i = 0; i < tops.length; i++) {
        if (line <= tops[i]) return i
      }
      return tops.length - 1
    }
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
    }, 600)
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
    const curTop = event.detail?.scrollTop ?? 0
    if (tapLock || !measures.length) return

    const primaryTops = measures.map((m) => m.top)
    const l1Idx = findIndexByScrollTop(curTop, primaryTops, 0, false)
    const l1Tab = measures[l1Idx]?.tabIndex ?? 0
    const hasPill = secondaryPillBarActiveAt(l1Tab)

    // L1 变化时检测胶囊区进出
    let justReturnedToPillSection = false
    if (l1Tab !== lastPrimaryTabIndex) {
      const prevHadPill = secondaryPillBarActiveAt(lastPrimaryTabIndex)
      if (prevHadPill && !hasPill) {
        lastL2BeforeLeaving = lastSecondary
      }
      if (!prevHadPill && hasPill) {
        // 刚从非胶囊区回到胶囊区 → 恢复上次离开时的 L2
        lastSecondary = lastL2BeforeLeaving
        secondaryActiveIndex.value = lastL2BeforeLeaving
        justReturnedToPillSection = true
      }
      lastPrimaryTabIndex = l1Tab
      primaryActiveIndex.value = l1Tab
    }

    if (!hasPill) return

    const measure = measures[l1Idx]
    if (!measure?.groupTops.length) return

    // 刚恢复时跳过首次 scroll 计算（避免 scrollTop 在顶部把 L2 拉回 0）
    if (justReturnedToPillSection) return

    const l2Offset = toValue(options.secondaryOffsetPx) ?? 0
    const l2Idx = findIndexByScrollTop(curTop, measure.groupTops, l2Offset, true)

    if (l2Idx !== lastSecondary) {
      lastSecondary = l2Idx
      secondaryActiveIndex.value = l2Idx
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
