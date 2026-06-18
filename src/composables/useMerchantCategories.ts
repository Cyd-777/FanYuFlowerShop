import { ref } from 'vue'
import { hasCacheEntry } from '@/utils/cache'
import { listMerchantCategories, listMerchantCategoriesCached } from '@/services/category'
import type { Category } from '@/types/category'

const CACHE_KEY = 'categories:merchant'

export function useMerchantCategories() {
  const categories = ref<Category[]>([])
  const loading = ref(false)

  async function loadCategories(options?: { force?: boolean }) {
    loading.value = options?.force ? true : !hasCacheEntry(CACHE_KEY)
    try {
      const { data } = await listMerchantCategoriesCached({
        force: options?.force,
        onUpdate: (list) => {
          categories.value = list
        },
      })
      categories.value = data
    } catch (err) {
      console.error('[category] merchant load failed:', err)
      if (!categories.value.length) {
        categories.value = []
      }
      wx.showToast({
        title: err instanceof Error ? err.message : '加载分类失败',
        icon: 'none',
      })
    } finally {
      loading.value = false
    }
  }

  /** 表单等轻量场景：有缓存则静默 SWR，不展示 loading */
  async function loadCategoriesQuiet() {
    try {
      const { data } = await listMerchantCategoriesCached({
        onUpdate: (list) => {
          categories.value = list
        },
      })
      categories.value = data
    } catch (err) {
      console.error('[category] merchant quiet load failed:', err)
      if (!categories.value.length) {
        categories.value = await listMerchantCategories()
      }
    }
  }

  return {
    categories,
    loading,
    loadCategories,
    loadCategoriesQuiet,
  }
}
