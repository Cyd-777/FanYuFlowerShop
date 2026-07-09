import { showToast } from '@/utils/feedback'
import { computed, ref } from 'vue'
import { goodsRepository, wikiRepository } from '@/data/repository'
import {
  searchCustomerUnified,
  suggestCustomerUnified,
} from '@/modules/search'
import { attachGoodsCoverImages } from '@/utils/goodsImage'
import {
  getWikiDisplayName,
  getWikiSubtitle,
  getWikiTabPreview,
} from '@/types/wiki'
import type { FlowerWikiListItem } from '@/types/wiki'
import type { Goods } from '@/types/goods'
import type { CustomerUnifiedSearchScope, SearchSuggestion, WikiAnswerSnippet } from '@/types/search'
import { navigateTo, navigateToGoodsDetail } from '@/utils/router'
import { searchWithAI } from '@/utils/searchWithAI'
import type { PageEnsureContext } from '../types'
import type { PageSetupResult } from '../pageRegistry'

export interface CustomerSearchGoodsCard extends Goods {
  imageUrl: string
}

export function setupCustomerSearchPageData(): PageSetupResult & Record<string, unknown> {
  const searchPlaceholder = '搜索商品、花材、怎么养…'
  const suggestTitle = '商品与百科'
  const goodsSectionTitle = '相关商品'
  const wikiSectionTitle = '花卉百科'
  const emptyTextAll = '没有找到相关商品或百科词条'
  const emptyTextGoods = '没有找到相关商品'
  const emptyTextWiki = '没有找到相关百科词条'
  const loadingText = '正在搜索…'

  const keyword = ref('')
  const exactName = ref(false)
  const searchScope = ref<CustomerUnifiedSearchScope>('all')
  /** 路由带入的首次搜索词（不写入搜索框） */
  const pendingRouteKeyword = ref('')
  const loading = ref(false)
  const goodsResults = ref<CustomerSearchGoodsCard[]>([])
  const wikiResults = ref<FlowerWikiListItem[]>([])
  const wikiAnswer = ref<WikiAnswerSnippet | null>(null)
  const suggestGoodsCatalog = ref<Goods[]>([])
  const suggestWikiCatalog = ref<FlowerWikiListItem[]>([])

  const showGoodsSection = computed(
    () => searchScope.value === 'all' || searchScope.value === 'goods',
  )
  const showWikiSection = computed(
    () => searchScope.value === 'all' || searchScope.value === 'wiki',
  )

  const hasResults = computed(() => {
    if (wikiAnswer.value && showWikiSection.value) return true
    if (searchScope.value === 'goods') return goodsResults.value.length > 0
    if (searchScope.value === 'wiki') return wikiResults.value.length > 0
    return goodsResults.value.length > 0 || wikiResults.value.length > 0
  })

  const emptyText = computed(() => {
    if (searchScope.value === 'goods') return emptyTextGoods
    if (searchScope.value === 'wiki') return emptyTextWiki
    return emptyTextAll
  })

  function onLoad(query: Record<string, string | undefined>) {
    pendingRouteKeyword.value = (query.keyword || '').trim()
    exactName.value = query.exact === '1'
    const scope = query.scope
    searchScope.value =
      scope === 'wiki' || scope === 'goods' ? scope : 'all'
    keyword.value = ''
  }

  async function loadSuggestCatalogs() {
    try {
      const [goodsRes, wikiRes] = await Promise.all([
        goodsRepository.ensurePublicList(),
        wikiRepository.ensurePublicList(),
      ])
      suggestGoodsCatalog.value = goodsRes.data
      suggestWikiCatalog.value = wikiRes.data
    } catch {
      /* 预判降级 */
    }
  }

  function onSearchModalOpen(focused: boolean) {
    if (focused) void loadSuggestCatalogs()
  }

  async function runSearch(queryText?: string) {
    const trimmed = (queryText ?? keyword.value).trim()
    if (!trimmed) {
      goodsResults.value = []
      wikiResults.value = []
      wikiAnswer.value = null
      return
    }

    loading.value = true
    try {
      // AI 语义解析：口语 → 关键词（仅长查询，短词直接跳过）
      let searchText = trimmed
      const aiResult = await searchWithAI(trimmed, { minConfidence: 0.6 })
      if (aiResult.aiHandled && aiResult.parsed) {
        console.log('[search] AI parsed:', trimmed, '→', aiResult.parsed.text)
        searchText = aiResult.parsed.text || trimmed
      }

      const { goods, wiki, wikiAnswer: answer } = await searchCustomerUnified(searchText, {
        exactName: exactName.value,
      })
      goodsResults.value = await attachGoodsCoverImages(goods)
      wikiResults.value = wiki
      wikiAnswer.value = answer || null
    } catch (err) {
      goodsResults.value = []
      wikiResults.value = []
      wikiAnswer.value = null
      showToast({
        title: err instanceof Error ? err.message : '搜索失败',
        icon: 'none',
      })
    } finally {
      loading.value = false
    }
  }

  async function ensure(ctx: PageEnsureContext) {
    void loadSuggestCatalogs()
    const routeKeyword = pendingRouteKeyword.value
    if (routeKeyword) {
      pendingRouteKeyword.value = ''
      await runSearch(routeKeyword)
      return
    }
    if (keyword.value.trim() || ctx.force) {
      await runSearch()
    }
  }

  function unifiedSuggest(query: string) {
    return suggestCustomerUnified(
      suggestGoodsCatalog.value,
      suggestWikiCatalog.value,
      query,
    )
  }

  function onSearchKeyword(value: string) {
    exactName.value = false
    searchScope.value = 'all'
    void runSearch(value.trim())
  }

  function onPickSearchChannel(payload: {
    label: string
    channel: Exclude<CustomerUnifiedSearchScope, 'all'>
  }) {
    exactName.value = false
    searchScope.value = payload.channel
    void runSearch(payload.label.trim())
  }

  function onPickSuggestion(item: SearchSuggestion) {
    exactName.value = false
    searchScope.value = 'all'
    void runSearch(item.label.trim())
  }

  function formatPrice(price: number) {
    return Number(price).toFixed(2).replace(/\.00$/, '')
  }

  function wikiName(item: FlowerWikiListItem) {
    return getWikiDisplayName(item)
  }

  function wikiSubtitle(item: FlowerWikiListItem) {
    return getWikiSubtitle(item)
  }

  function wikiPreview(item: FlowerWikiListItem) {
    return getWikiTabPreview(item, 'care') || getWikiTabPreview(item, 'atlas') || '暂无简介'
  }

  function goGoodsDetail(id: string, coverPreview?: string, coverFileId?: string) {
    void navigateToGoodsDetail(id, coverPreview, coverFileId)
  }

  function goWikiDetail(id: string) {
    navigateTo({ url: '/pagesCustomer/wiki/detail?id=' + id })
  }

  return {
    ensure,
    onLoad,
    pullDownRefresh: false,
    refreshOnShow: false,
    searchPlaceholder,
    suggestTitle,
    goodsSectionTitle,
    wikiSectionTitle,
    emptyText,
    loadingText,
    keyword,
    loading,
    goodsResults,
    wikiResults,
    wikiAnswer,
    hasResults,
    showGoodsSection,
    showWikiSection,
    unifiedSuggest,
    onSearchKeyword,
    onPickSearchChannel,
    onPickSuggestion,
    onSearchModalOpen,
    formatPrice,
    wikiName,
    wikiSubtitle,
    wikiPreview,
    goGoodsDetail,
    goWikiDetail,
  }
}
