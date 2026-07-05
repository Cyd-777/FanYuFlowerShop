import { nextTick, onMounted, ref, watch, type MaybeRefOrGetter, toValue } from 'vue'
import Taro, { useReady } from '@tarojs/taro'
import type { WikiTab } from '@/types/wiki'
import { resolveWikiAnchor } from '@/utils/wikiAnchor'

export const WIKI_DETAIL_SECTIONS: { key: WikiTab; label: string; anchorId: string }[] = [
  { key: 'atlas', label: '介绍', anchorId: 'wiki-section-atlas' },
  { key: 'care', label: '养护方式', anchorId: 'wiki-section-care' },
  { key: 'language', label: '花语', anchorId: 'wiki-section-language' },
]

const SECTION_HEADER_CLASS = '.wiki-detail-section-header'
const MEASURE_DELAYS_MS = [80, 320, 640, 1200]

export function useWikiDetailScrollLink(options: {
  scrollSelector: string
  bodySelector: string
  contentWatchKey?: MaybeRefOrGetter<unknown>
  isContentReady?: () => boolean
  ensurePanelExpanded?: () => Promise<void>
  onInnerScroll?: (event: { detail?: { scrollTop?: number } }) => void
}) {
  const activeTab = ref<WikiTab>('atlas')
  const scrollIntoView = ref('')
  const highlightAnchor = ref('')

  let measures: { key: WikiTab; top: number; anchorId: string }[] = []
  let navHeightMeasure = 48
  let scrollViewportHeight = 0
  let maxScrollTop = 0
  let tapLock = false
  let tapLockTimer: ReturnType<typeof setTimeout> | null = null
  let highlightTimer: ReturnType<typeof setTimeout> | null = null
  let pendingAnchor = ''
  let pendingTab: WikiTab | null = null

  function setHighlight(elementId: string) {
    highlightAnchor.value = elementId
    if (highlightTimer) clearTimeout(highlightTimer)
    highlightTimer = setTimeout(() => {
      highlightAnchor.value = ''
      highlightTimer = null
    }, 3200)
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
    const query = Taro.createSelectorQuery()
    query.select(options.scrollSelector).boundingClientRect()
    query.select(options.scrollSelector).scrollOffset()
    query.select('#wiki-detail-nav').boundingClientRect()
    query.select(options.bodySelector).boundingClientRect()
    query.selectAll(SECTION_HEADER_CLASS).boundingClientRect()

    query.exec((res) => {
      const scrollRect = res?.[0] as { top?: number; height?: number } | undefined
      const scrollOffset = res?.[1] as { scrollTop?: number } | undefined
      const navRect = res?.[2] as { height?: number } | undefined
      const bodyRect = res?.[3] as { height?: number } | undefined
      const headerRects = (res?.[4] || []) as Array<{ top?: number }>

      const baseScrollTop = scrollOffset?.scrollTop ?? 0

      if (navRect && typeof navRect.height === 'number' && navRect.height > 0) {
        navHeightMeasure = navRect.height
      }

      if (scrollRect && typeof scrollRect.height === 'number') {
        scrollViewportHeight = scrollRect.height
      }
      if (bodyRect && typeof bodyRect.height === 'number' && scrollViewportHeight > 0) {
        maxScrollTop = Math.max(0, bodyRect.height - scrollViewportHeight)
      }

      if (!scrollRect || typeof scrollRect.top !== 'number' || !scrollOffset) {
        onDone?.()
        return
      }

      measures = WIKI_DETAIL_SECTIONS.map((section, index) => {
        const headerRect = headerRects[index]
        const top =
          headerRect && typeof headerRect.top === 'number'
            ? baseScrollTop + headerRect.top - scrollRect.top
            : 0
        return { key: section.key, top, anchorId: section.anchorId }
      })

      onDone?.()
    })
  }

  function scheduleMeasure(onDone?: () => void) {
    void nextTick(() => {
      for (const delay of MEASURE_DELAYS_MS) {
        setTimeout(() => measureHeights(onDone), delay)
      }
    })
  }

  function lockTapScroll() {
    tapLock = true
    if (tapLockTimer) clearTimeout(tapLockTimer)
    tapLockTimer = setTimeout(() => {
      tapLock = false
      tapLockTimer = null
      scrollIntoView.value = ''
    }, 360)
  }

  function jumpToAnchor(anchorId: string) {
    if (!anchorId) return
    lockTapScroll()
    scrollIntoView.value = anchorId
  }

  async function clickSectionTab(tab: WikiTab) {
    activeTab.value = tab
    await options.ensurePanelExpanded?.()
    const section = WIKI_DETAIL_SECTIONS.find((item) => item.key === tab)
    if (section) jumpToAnchor(section.anchorId)
  }

  function onContentScroll(event: { detail?: { scrollTop?: number } }) {
    options.onInnerScroll?.(event)
    const scrollTop = event.detail?.scrollTop ?? 0
    if (tapLock) return

    const lastTab = measures[measures.length - 1]?.key ?? 'language'
    const nearBottom =
      maxScrollTop > 0 && scrollTop >= maxScrollTop - (navHeightMeasure + 16)
    if (nearBottom) {
      if (activeTab.value !== lastTab) activeTab.value = lastTab
      return
    }

    if (!measures.length) return
    const tops = measures.map((item) => item.top)
    const lineOffset = navHeightMeasure + 8
    const index = findIndexByScrollTop(scrollTop, tops, lineOffset)
    const nextTab = measures[index]?.key ?? 'atlas'
    if (nextTab !== activeTab.value) {
      activeTab.value = nextTab
    }
  }

  function queueTab(tab?: WikiTab) {
    if (tab === 'atlas' || tab === 'care' || tab === 'language') {
      pendingTab = tab
      activeTab.value = tab
    }
  }

  function queueAnchor(anchor?: string) {
    const next = String(anchor || '').trim()
    if (next) pendingAnchor = next
    void flushPendingScroll()
  }

  /** 仅 anchor / 非默认 Tab（care、language）才强制展开；atlas 保持收起 */
  function shouldExpandPanelForEntry(anchor: string, tab: WikiTab | null) {
    if (anchor) return true
    return tab === 'care' || tab === 'language'
  }

  async function flushPendingScroll() {
    if (!options.isContentReady?.()) return

    const anchor = pendingAnchor
    const tabFromQuery = pendingTab
    if (!anchor && !tabFromQuery) return

    pendingAnchor = ''
    pendingTab = null

    const shouldExpand = shouldExpandPanelForEntry(anchor, tabFromQuery)

    if (tabFromQuery && !shouldExpand) {
      activeTab.value = tabFromQuery
      return
    }

    if (shouldExpand) {
      await options.ensurePanelExpanded?.()
    }

    if (anchor) {
      const { tab, elementId } = resolveWikiAnchor(anchor)
      if (tab) activeTab.value = tab
      const sectionAnchor =
        WIKI_DETAIL_SECTIONS.find((item) => item.key === tab)?.anchorId || ''
      const target = elementId || sectionAnchor
      if (target) {
        scrollIntoView.value = ''
        await nextTick()
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 120)
        })
        jumpToAnchor(target)
        if (elementId) setHighlight(elementId)
      }
      return
    }

    if (tabFromQuery) {
      activeTab.value = tabFromQuery
      const section = WIKI_DETAIL_SECTIONS.find((item) => item.key === tabFromQuery)
      if (!section) return
      scrollIntoView.value = ''
      await nextTick()
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 120)
      })
      jumpToAnchor(section.anchorId)
    }
  }

  if (options.contentWatchKey !== undefined) {
    watch(
      () => toValue(options.contentWatchKey),
      () => {
        scheduleMeasure()
      },
    )
  }

  if (options.isContentReady) {
    watch(
      () => options.isContentReady?.(),
      (ready) => {
        if (ready) scheduleMeasure()
      },
    )
  }

  onMounted(() => scheduleMeasure())
  useReady(() => scheduleMeasure())

  return {
    activeTab,
    scrollIntoView,
    highlightAnchor,
    onContentScroll,
    clickSectionTab,
    queueAnchor,
    queueTab,
    flushPendingScroll,
    remeasure: scheduleMeasure,
  }
}
