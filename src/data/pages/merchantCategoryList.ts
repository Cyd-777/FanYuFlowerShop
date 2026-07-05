import { useMerchantCategories } from '@/composables/useMerchantCategories'
import { navigateTo } from '@/utils/router'
import { computed } from 'vue'
import type { PageEnsureContext } from '../types'
import type { PageSetupResult } from '../pageRegistry'

export interface MerchantAddCategoryOptions {
  type?: string
  parentId?: string
}

export function setupMerchantCategoryListPageData(): PageSetupResult & Record<string, unknown> {
  const { categories, loading, loadCategories } = useMerchantCategories()

  const customCategories = computed(() =>
    categories.value.filter((item) => item._source !== 'wiki'),
  )

  async function ensure(ctx: PageEnsureContext) {
    await loadCategories({ force: ctx.force })
  }

  function addCategory(options?: string | MerchantAddCategoryOptions) {
    const params = new URLSearchParams()
    if (typeof options === 'string') {
      if (options) params.set('type', options)
    } else if (options) {
      if (options.type) params.set('type', options.type)
      if (options.parentId) params.set('parentId', options.parentId)
    }
    const query = params.toString()
    navigateTo({ url: '/pagesMerchant/category/edit' + (query ? `?${query}` : '') })
  }

  function editCategory(id: string) {
    const cat = categories.value.find((c) => c._id === id)
    if (cat?._source === 'wiki') return
    navigateTo({ url: '/pagesMerchant/category/edit?id=' + id })
  }

  return {
    ensure,
    refreshOnShow: true,
    pullDownRefresh: false,
    categoryList: customCategories,
    allCategoryList: categories,
    loading,
    addCategory,
    editCategory,
  }
}
