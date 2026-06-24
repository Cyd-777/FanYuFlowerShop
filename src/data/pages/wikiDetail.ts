import { showToast } from '@/utils/feedback'
import { computed, ref, watch } from 'vue'
import { hasCacheEntry } from '@/utils/cache'
import { wikiRepository } from '@/data/repository'
import { wikiPublicDetailKey } from '@/data/cacheKeys'
import { useWikiAnchorScroll } from '@/composables/useWikiAnchorScroll'
import type { FlowerWiki, WikiTab } from '@/types/wiki'
import { getWikiDisplayName, getWikiSubtitle, WIKI_TAB_CONFIG } from '@/types/wiki'
import type { PageEnsureContext } from '../types'
import type { PageSetupResult } from '../pageRegistry'

export function setupWikiDetailPageData(): PageSetupResult & Record<string, unknown> {
  const emptySectionText = '暂无相关内容'
  const notFoundText = '未找到百科内容'

  const tabs = WIKI_TAB_CONFIG.map(({ key, label }) => ({ key, label }))

  const wikiId = ref('')
  const activeTab = ref<WikiTab>('atlas')
  const loading = ref(false)
  const wiki = ref<FlowerWiki | null>(null)

  const { scrollIntoView, highlightAnchor, queueAnchor, flushAnchor, clearScrollTarget } =
    useWikiAnchorScroll({
      setActiveTab: (tab) => {
        activeTab.value = tab
      },
      isContentReady: () => !loading.value && !!wiki.value,
    })

  const displayName = computed(() => (wiki.value ? getWikiDisplayName(wiki.value) : ''))
  const displaySubtitle = computed(() => (wiki.value ? getWikiSubtitle(wiki.value) : ''))

  function onLoad(query: Record<string, string | undefined>) {
    wikiId.value = query.id || ''
    const tab = query.tab
    if (tab === 'care' || tab === 'language' || tab === 'atlas') {
      activeTab.value = tab
    }
    queueAnchor(query.anchor)
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
      wx.setNavigationBarTitle({ title: displayName.value || '花卉百科' })
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
    void flushAnchor()
  })

  function switchTab(tab: WikiTab) {
    activeTab.value = tab
    clearScrollTarget()
  }

  async function ensure(ctx: PageEnsureContext) {
    if (!wikiId.value) return
    await loadWiki(!!ctx.force)
  }

  return {
    ensure,
    onLoad,
    refreshOnShow: false,
    pullDownRefresh: false,
    emptySectionText,
    notFoundText,
    tabs,
    wikiId,
    activeTab,
    loading,
    wiki,
    displayName,
    displaySubtitle,
    scrollIntoView,
    highlightAnchor,
    switchTab,
  }
}
