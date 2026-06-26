import { ref } from 'vue'
import { usePublicGoods } from '@/composables/usePublicGoods'
import { usePublicCategories } from '@/composables/usePublicCategories'
import { useGoodsLiveSync } from '@/composables/useGoodsLiveSync'
import { useGoodsBrowseRefresh } from '@/composables/useGoodsBrowseRefresh'
import { goodsLiveSync } from '@/services/goodsLiveSync'
import { navigateToGoodsDetail } from '@/utils/router'
import type { GoodsNameSuggestion } from '@/utils/goodsNameSuggest'
import type { PageEnsureContext } from '../types'
import type { PageSetupResult } from '../pageRegistry'

export function setupCustomerGoodsListPageData(): PageSetupResult & Record<string, unknown> {
  const keyword = ref('')
  const categoryId = ref('')
  const categoryName = ref('')
  const exactName = ref(false)
  const { goodsList, loading, loadGoods, searchCatalog, patchVisibleGoods } =
    usePublicGoods()
  const { categories, loadCategories } = usePublicCategories()

  function onLoad(query: Record<string, string | undefined>) {
    keyword.value = query.keyword || ''
    categoryId.value = query.categoryId || ''
    exactName.value = query.exact === '1'
  }

  async function initCategoryName() {
    if (!categoryId.value) {
      categoryName.value = ''
      return
    }
    await loadCategories()
    categoryName.value =
      categories.value.find((item) => item._id === categoryId.value)?.name || ''
  }

  async function reloadGoods() {
    return loadGoods(keyword.value.trim(), categoryId.value, {
      exactName: exactName.value,
    })
  }

  async function ensure(ctx: PageEnsureContext) {
    await initCategoryName()
    await reloadGoods()
    await goodsLiveSync.resetVersionBaseline()
  }

  useGoodsLiveSync({
    getTargetIds: () => goodsList.value.map((item) => item._id),
    applyPatches: (result) => patchVisibleGoods(result),
  })

  const { browseTouchHandlers } = useGoodsBrowseRefresh()

  function formatPrice(price: number) {
    return Number(price).toFixed(2).replace(/\.00$/, '')
  }

  function goDetail(id: string, coverPreview?: string, coverFileId?: string) {
    void navigateToGoodsDetail(id, coverPreview, coverFileId)
  }

  function onSearchKeyword(value: string) {
    keyword.value = value
    void reloadGoods()
  }

  function onPickSuggestion(item: GoodsNameSuggestion) {
    keyword.value = item.name
    void loadGoods(item.name, categoryId.value, { exactName: true })
  }

  return {
    ensure,
    onLoad,
    refreshOnShow: true,
    pullDownRefresh: false,
    keyword,
    categoryId,
    categoryName,
    goodsList,
    loading,
    categories,
    searchCatalog,
    reloadGoods,
    onSearchKeyword,
    onPickSuggestion,
    formatPrice,
    goDetail,
    browseTouchHandlers,
  }
}
