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
  const kindName = ref('')
  const exactName = ref(false)
  const { goodsList, loading, loadGoods, searchCatalog, patchVisibleGoods } =
    usePublicGoods()
  const { categories, loadCategories } = usePublicCategories()

  function onLoad(query: Record<string, string | undefined>) {
    keyword.value = query.keyword || ''
    kindName.value = query.kindName || ''
    categoryId.value = query.categoryId || ''

    // wiki 衍生分类：转换为 wiki: 前缀，云端按品种名过滤
    if (kindName.value && !categoryId.value) {
      categoryId.value = `wiki:${kindName.value}`
    }

    exactName.value = query.exact === '1'
  }

  async function initCategoryName() {
    if (!categoryId.value) {
      categoryName.value = ''
      return
    }
    // wiki 衍生分类从 kindName 获取名称
    if (categoryId.value.startsWith('wiki:')) {
      categoryName.value = kindName.value || categoryId.value.replace('wiki:', '')
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
