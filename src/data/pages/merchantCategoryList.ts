import { useMerchantCategories } from '@/composables/useMerchantCategories'
import { navigateTo } from '@/utils/router'
import type { PageEnsureContext } from '../types'
import type { PageSetupResult } from '../pageRegistry'

export function setupMerchantCategoryListPageData(): PageSetupResult & Record<string, unknown> {
  const { categories, loading, loadCategories } = useMerchantCategories()

  async function ensure(ctx: PageEnsureContext) {
    await loadCategories({ force: ctx.force })
  }

  function addCategory() {
    navigateTo({ url: '/pagesMerchant/category/edit' })
  }

  function editCategory(id: string) {
    navigateTo({ url: '/pagesMerchant/category/edit?id=' + id })
  }

  return {
    ensure,
    refreshOnShow: true,
    pullDownRefresh: false,
    categoryList: categories,
    loading,
    addCategory,
    editCategory,
  }
}
