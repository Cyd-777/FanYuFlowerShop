import { nextTick, ref } from 'vue'
import type { WikiTab } from '@/types/wiki'
import { resolveWikiAnchor } from '@/utils/wikiAnchor'

export function useWikiAnchorScroll(options: {
  setActiveTab: (tab: WikiTab) => void
  isContentReady: () => boolean
}) {
  const scrollIntoView = ref('')
  const highlightAnchor = ref('')
  let pendingAnchor = ''
  let highlightTimer: ReturnType<typeof setTimeout> | null = null

  function setHighlight(elementId: string) {
    highlightAnchor.value = elementId
    if (highlightTimer) clearTimeout(highlightTimer)
    highlightTimer = setTimeout(() => {
      highlightAnchor.value = ''
      highlightTimer = null
    }, 3200)
  }

  function queueAnchor(anchor?: string) {
    pendingAnchor = String(anchor || '').trim()
    void flushAnchor()
  }

  async function flushAnchor() {
    const anchor = pendingAnchor
    if (!anchor || !options.isContentReady()) return

    const { tab, elementId } = resolveWikiAnchor(anchor)
    if (tab) options.setActiveTab(tab)
    if (!elementId) {
      pendingAnchor = ''
      return
    }

    scrollIntoView.value = ''
    await nextTick()
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 120)
    })

    if (pendingAnchor !== anchor) return
    scrollIntoView.value = elementId
    setHighlight(elementId)
    pendingAnchor = ''
  }

  function clearScrollTarget() {
    scrollIntoView.value = ''
  }

  return {
    scrollIntoView,
    highlightAnchor,
    queueAnchor,
    flushAnchor,
    clearScrollTarget,
  }
}
