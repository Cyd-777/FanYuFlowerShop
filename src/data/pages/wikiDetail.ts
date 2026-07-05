import { showToast } from '@/utils/feedback'
import { computed, nextTick, ref, watch } from 'vue'
import { hasCacheEntry } from '@/utils/cache'
import { wikiRepository } from '@/data/repository'
import { wikiPublicDetailKey } from '@/data/cacheKeys'
import { useNavBarLayout } from '@/composables/useNavBarLayout'
import { useWikiFloatingPanel } from '@/composables/useWikiFloatingPanel'
import { useWikiDetailScrollLink } from '@/composables/useWikiDetailScrollLink'
import type { FlowerWiki, WikiTab } from '@/types/wiki'
import { getWikiDisplayName, getWikiSubtitle } from '@/types/wiki'
import type { PageEnsureContext } from '../types'
import type { PageSetupResult } from '../pageRegistry'

export function setupWikiDetailPageData(): PageSetupResult & Record<string, unknown> {
  const emptySectionText = '暂无相关内容'
  const notFoundText = '未找到百科内容'

  const wikiId = ref('')
  const loading = ref(false)
  const wiki = ref<FlowerWiki | null>(null)
  const { layout } = useNavBarLayout()

  const floatingPanel = useWikiFloatingPanel({
    heroSelector: '#wiki-detail-hero',
    innerScrollSelector: '#wiki-panel-scroll',
    contentWatchKey: () => (wiki.value ? wiki.value._id : ''),
    isContentReady: () => !loading.value && !!wiki.value,
    navTotalHeight: () => layout.value.totalHeight,
    /** 进入页时面板可见高度 ≈ 55vh；改此值即可调初始「弹出多少」 */
    collapsedPeekRatio: 0.55,
  })

  const scrollLink = useWikiDetailScrollLink({
    scrollSelector: '#wiki-panel-scroll',
    bodySelector: '#wiki-panel-scroll-body',
    contentWatchKey: () => (wiki.value ? wiki.value._id : ''),
    isContentReady: () => !loading.value && !!wiki.value,
    ensurePanelExpanded: floatingPanel.ensureExpanded,
    onInnerScroll: floatingPanel.onPanelBodyScroll,
  })

  const displayName = computed(() => (wiki.value ? getWikiDisplayName(wiki.value) : ''))
  const displaySubtitle = computed(() => (wiki.value ? getWikiSubtitle(wiki.value) : ''))

  function onLoad(query: Record<string, string | undefined>) {
    wikiId.value = query.id || ''
    const tab = query.tab as WikiTab | undefined
    if (tab === 'care' || tab === 'language' || tab === 'atlas') {
      scrollLink.queueTab(tab)
    }
    if (query.anchor) {
      scrollLink.queueAnchor(query.anchor)
    }
  }

  async function loadWiki(force = false) {
    if (!wikiId.value) return
    loading.value = !hasCacheEntry(wikiPublicDetailKey(wikiId.value))
    try {
      const { data } = await wikiRepository.ensureDetail(wikiId.value, {
        force,
        onUpdate: (updated) => {
          wiki.value = updated
          wx.setNavigationBarTitle({ title: getWikiDisplayName(updated) || '花卉百科' })
        },
      })
      wiki.value = data
      wx.setNavigationBarTitle({ title: getWikiDisplayName(data) || '花卉百科' })
    } catch (err) {
      wiki.value = null
      showToast({
        title: err instanceof Error ? err.message : '加载失败',
        icon: 'none',
      })
    } finally {
      loading.value = false
    }
  }

  watch([wiki, loading], () => {
    void scrollLink.flushPendingScroll()
  })

  watch(loading, (isLoading) => {
    if (!isLoading && wiki.value) {
      void nextTick(() => remeasure())
    }
  })

  async function ensure(ctx: PageEnsureContext) {
    if (!wikiId.value) return
    await loadWiki(!!ctx.force)
  }

  function remeasure() {
    floatingPanel.remeasure()
    scrollLink.remeasure()
  }

  return {
    ensure,
    onLoad,
    refreshOnShow: false,
    pullDownRefresh: false,
    emptySectionText,
    notFoundText,
    wikiId,
    loading,
    wiki,
    displayName,
    displaySubtitle,
    remeasure,
    ...floatingPanel,
    ...scrollLink,
  }
}
