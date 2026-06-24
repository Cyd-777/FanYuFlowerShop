import { computed, ref } from 'vue'
import { usePublicGoods } from '@/composables/usePublicGoods'
import { usePublicCategories } from '@/composables/usePublicCategories'
import { useGoodsLiveSync } from '@/composables/useGoodsLiveSync'
import { useGoodsBrowseRefresh } from '@/composables/useGoodsBrowseRefresh'
import { goodsLiveSync } from '@/services/goodsLiveSync'
import { goodsRepository, wikiRepository } from '@/data/repository'
import { startAggressivePrefetch } from '@/data/prefetch/aggressivePrefetch'
import { prefetchOtherCustomerTabs } from '@/data/prefetch/routeP0'
import { suggestCustomerUnified, buildCustomerSearchPageUrl } from '@/services/customerUnifiedSearch'
import { navigateTo, navigateToWithFeedback } from '@/utils/router'
import type { CustomerUnifiedSearchScope, SearchSuggestion } from '@/types/search'
import type { FlowerWikiListItem } from '@/types/wiki'
import type { Goods } from '@/types/goods'
import type { PageEnsureContext } from '../types'
import type { PageSetupResult } from '../pageRegistry'

export function setupCategoryPageData(): PageSetupResult & Record<string, unknown> {
  const keyword = ref('')
  const searchPlaceholder = '搜索商品、花材、怎么养…'
  const suggestTitle = '商品与百科'
  const emptyText = '暂无商品'
  const activeIdx = ref(0)
  const suggestGoodsCatalog = ref<Goods[]>([])
  const suggestWikiCatalog = ref<FlowerWikiListItem[]>([])
  const { categories, loadCategories } = usePublicCategories()
  const { goodsList, loading, setCategory, loadGoods, searchCatalog, patchVisibleGoods } =
    usePublicGoods()

  const tabs = computed(() => [
    { key: 'all', name: '全部', categoryId: '' },
    ...categories.value.map((item) => ({
      key: item._id,
      name: item.name,
      categoryId: item._id,
    })),
  ])

  async function reloadGoods(force = false) {
    if (activeIdx.value < 0) return
    const current = tabs.value[activeIdx.value]
    return loadGoods('', current?.categoryId || '', { force })
  }

  async function loadSearchSuggestCatalogs() {
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
    if (focused) void loadSearchSuggestCatalogs()
  }

  function unifiedSuggest(query: string) {
    return suggestCustomerUnified(
      suggestGoodsCatalog.value,
      suggestWikiCatalog.value,
      query,
    )
  }

  async function ensure(ctx: PageEnsureContext) {
    await loadCategories({ force: ctx.force })
    await reloadGoods(!!ctx.force)
    void startAggressivePrefetch()
    prefetchOtherCustomerTabs('pages/category/index')
    await goodsLiveSync.resetVersionBaseline()
  }

  useGoodsLiveSync({
    getTargetIds: () => {
      if (activeIdx.value < 0) return []
      return goodsList.value.map((item) => item._id)
    },
    applyPatches: (result) => patchVisibleGoods(result),
  })

  const { browseTouchHandlers } = useGoodsBrowseRefresh()

  function formatPrice(price: number) {
    return Number(price).toFixed(2).replace(/\.00$/, '')
  }

  function switchCategory(idx: number) {
    activeIdx.value = idx
    const current = tabs.value[idx]
    setCategory(current?.categoryId || '')
    void reloadGoods()
  }

  function showCustomizePanel() {
    activeIdx.value = -1
  }

  function goCustomize() {
    navigateTo({ url: '/pagesCustomer/customize/index' })
  }

  function onSearch() {
    goSearchWithKeyword(keyword.value)
  }

  function onSearchKeyword(value: string) {
    goSearchWithKeyword(value)
  }

  function goSearchWithKeyword(
    value: string,
    options?: { exactName?: boolean; scope?: CustomerUnifiedSearchScope },
  ) {
    const url = buildCustomerSearchPageUrl(value, options)
    if (!url) return
    void navigateToWithFeedback({ url })
  }

  function onPickSearchChannel(payload: {
    label: string
    channel: Exclude<CustomerUnifiedSearchScope, 'all'>
  }) {
    goSearchWithKeyword(payload.label, { scope: payload.channel })
  }

  function onPickSuggestion(item: SearchSuggestion) {
    goSearchWithKeyword(item.label)
  }

  function goDetail(id: string) {
    navigateTo({ url: '/pagesCustomer/goods/detail?id=' + id })
  }

  return {
    ensure,
    pullDownRefresh: true,
    refreshOnShow: true,
    keyword,
    searchPlaceholder,
    emptyText,
    activeIdx,
    categories,
    goodsList,
    loading,
    tabs,
    searchCatalog,
    unifiedSuggest,
    suggestTitle,
    formatPrice,
    switchCategory,
    showCustomizePanel,
    goCustomize,
    onSearch,
    onSearchKeyword,
    onPickSearchChannel,
    onPickSuggestion,
    onSearchModalOpen,
    goDetail,
    browseTouchHandlers,
  }
}
