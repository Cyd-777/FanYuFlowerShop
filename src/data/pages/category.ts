import { computed, ref } from 'vue'
import { usePublicGoods } from '@/composables/usePublicGoods'
import { usePublicCategories } from '@/composables/usePublicCategories'
import { navigateTo } from '@/utils/router'
import type { GoodsNameSuggestion } from '@/utils/goodsNameSuggest'
import type { PageEnsureContext } from '../types'
import type { PageSetupResult } from '../pageRegistry'

export function setupCategoryPageData(): PageSetupResult & Record<string, unknown> {
  const keyword = ref('')
  const searchPlaceholder = '搜索花束...'
  const emptyText = '暂无商品'
  const activeIdx = ref(0)
  const { categories, loadCategories } = usePublicCategories()
  const { goodsList, loading, setCategory, loadGoods, searchCatalog } = usePublicGoods()

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

  async function ensure(ctx: PageEnsureContext) {
    await loadCategories({ force: ctx.force })
    await reloadGoods(!!ctx.force)
  }

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
    keyword.value = value
    goSearchWithKeyword(value)
  }

  function onPickSuggestion(item: GoodsNameSuggestion) {
    keyword.value = item.name
    goSearchWithKeyword(item.name)
  }

  function goSearchWithKeyword(value: string) {
    const trimmed = value.trim()
    if (trimmed) {
      navigateTo({ url: '/pagesCustomer/goods/list?keyword=' + encodeURIComponent(trimmed) })
    }
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
    formatPrice,
    switchCategory,
    showCustomizePanel,
    goCustomize,
    onSearch,
    onSearchKeyword,
    onPickSuggestion,
    goDetail,
  }
}
