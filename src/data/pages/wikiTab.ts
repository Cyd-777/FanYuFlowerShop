import { showToast } from '@/utils/feedback'
import { ref, computed } from 'vue'
import { hasCacheEntry } from '@/utils/cache'
import { wikiRepository } from '@/data/repository'
import { startAggressivePrefetch } from '@/data/prefetch/aggressivePrefetch'
import { prefetchOtherCustomerTabs } from '@/data/prefetch/routeP0'
import { CACHE_KEYS } from '@/data/cacheKeys'
import { navigateTo } from '@/utils/router'
import type { SearchSuggestion, WikiAnswerSnippet } from '@/types/search'
import type { FlowerWikiListItem } from '@/types/wiki'
import {
  buildWikiBrowseFlow,
  filterWikiCatalog,
  getWikiDisplayName,
  getWikiKindCardPreview,
  getWikiSubtitle,
  getWikiKindTabs,
  WIKI_KIND_SIDEBAR,
} from '@/types/wiki'
import { isEmptyWikiQuery, parseWikiSearchQuery } from '@/utils/parseWikiSearchQuery'
import { suggestWikiEntries } from '@/utils/wikiSuggest'
import type { PageEnsureContext } from '../types'
import type { PageSetupResult } from '../pageRegistry'

export function setupWikiTabPageData(): PageSetupResult & Record<string, unknown> {
  const pageTitle = '花卉百科'
  const pageSubtitle = '按品类浏览花店智库'
  const searchPlaceholder = '搜索花卉、怎么养、能开多久…'
  const suggestTitle = '花卉预判'
  const loadingText = '正在加载云端智库...'
  const emptyText = '暂无百科内容，请先在云数据库维护 flower_wiki'

  const kindTabItems = getWikiKindTabs()

  const keyword = ref('')
  /** 当前生效的智库筛选词（搜索框提交后清空，筛选仍保留） */
  const activeWikiQuery = ref('')
  /** 选中的种类 tag（筛选卡片流；再次点击取消） */
  const selectedKindName = ref<string | null>(null)
  const loading = ref(false)
  const wikiList = ref<FlowerWikiListItem[]>([])
  const wikiAnswer = ref<WikiAnswerSnippet | null>(null)
  const suggestCatalog = ref<FlowerWikiListItem[]>([])
  const wikiCatalog = ref<FlowerWikiListItem[]>([])

  const isSearchMode = computed(() => Boolean(activeWikiQuery.value.trim()))

  const browseFlow = computed<FlowerWikiListItem[]>(() => {
    if (isSearchMode.value) return []
    return buildWikiBrowseFlow(wikiCatalog.value, WIKI_KIND_SIDEBAR, selectedKindName.value)
  })

  const filterEmptyText = computed(() => {
    if (!selectedKindName.value) return emptyText
    return `暂无「${selectedKindName.value}」相关词条`
  })

  function onLoad(_query: Record<string, string | undefined>) {
    /* tab 深链仍进详情页，首页不再区分内容 Tab */
  }

  async function refreshSuggestCatalog(options?: { force?: boolean }) {
    try {
      const { data } = await wikiRepository.ensurePublicList({ force: options?.force })
      suggestCatalog.value = data
    } catch {
      /* 预判失败不挡列表 */
    }
  }

  async function runWikiSearch(text: string) {
    const query = parseWikiSearchQuery(text, 'atlas', 'auto')
    if (isEmptyWikiQuery(query)) {
      wikiAnswer.value = null
      await loadWikiList()
      return
    }
    loading.value = true
    try {
      const result = await wikiRepository.search(query)
      wikiList.value = filterWikiCatalog(result.list)
      wikiAnswer.value = result.answer || null
    } catch (err) {
      wikiAnswer.value = null
      showToast({
        title: err instanceof Error ? err.message : '搜索失败',
        icon: 'none',
        duration: 3000,
      })
    } finally {
      loading.value = false
    }
  }

  async function loadWikiList(options?: { force?: boolean }) {
    const trimmed = activeWikiQuery.value.trim()

    if (options?.force) {
      wikiRepository.resetDetailPrefetch()
    }

    void refreshSuggestCatalog({ force: options?.force })

    if (trimmed) {
      await runWikiSearch(trimmed)
      return
    }

    loading.value = options?.force ? !wikiList.value.length : !hasCacheEntry(CACHE_KEYS.wikiList)
    try {
      const { data } = await wikiRepository.ensurePublicList({
        force: options?.force,
        onUpdate: (list) => {
          const filtered = filterWikiCatalog(list)
          wikiList.value = filtered
          wikiCatalog.value = filtered
          suggestCatalog.value = filtered
        },
      })
      const filtered = filterWikiCatalog(data)
      wikiList.value = filtered
      wikiCatalog.value = filtered
      suggestCatalog.value = filtered
      wikiAnswer.value = null
      wikiRepository.afterListLoaded(data)
    } catch (err) {
      showToast({
        title: err instanceof Error ? err.message : '加载失败',
        icon: 'none',
        duration: 3000,
      })
    } finally {
      loading.value = false
    }
  }

  async function ensure(ctx: PageEnsureContext) {
    await loadWikiList({ force: ctx.force })
    void startAggressivePrefetch()
    prefetchOtherCustomerTabs('pages/wiki/index')
  }

  function displayName(item: FlowerWikiListItem) {
    return getWikiDisplayName(item)
  }

  function displaySubtitle(item: FlowerWikiListItem) {
    return getWikiSubtitle(item)
  }

  function cardPreview(item: FlowerWikiListItem) {
    return getWikiKindCardPreview(item)
  }

  function isWikiKindEntry(item: FlowerWikiListItem) {
    return !String(item.varietyName || '').trim()
  }

  function wikiSuggest(query: string) {
    return suggestWikiEntries(suggestCatalog.value, query)
  }

  function onSearchKeyword(value: string) {
    const trimmed = value.trim()
    activeWikiQuery.value = trimmed
    if (!trimmed) {
      selectedKindName.value = null
    }
    void loadWikiList()
  }

  function onPickSuggestion(item: SearchSuggestion) {
    activeWikiQuery.value = item.label.trim()
    void runWikiSearch(item.label)
  }

  function selectKindTab(kindName: string | null) {
    selectedKindName.value = kindName
  }

  function goDetail(id: string) {
    navigateTo({
      url: `/pagesCustomer/wiki/detail?id=${id}&tab=atlas`,
    })
  }

  return {
    ensure,
    onLoad,
    customHead: true,
    pullDownRefresh: 'page',
    refreshOnShow: true,
    pageTitle,
    pageSubtitle,
    searchPlaceholder,
    suggestTitle,
    loadingText,
    emptyText,
    kindTabItems,
    selectedKindName,
    isSearchMode,
    filterEmptyText,
    browseFlow,
    keyword,
    loading,
    wikiList,
    wikiAnswer,
    loadWikiList,
    displayName,
    displaySubtitle,
    cardPreview,
    wikiSuggest,
    onSearchKeyword,
    onPickSuggestion,
    selectKindTab,
    goDetail,
    isWikiKindEntry,
  }
}
