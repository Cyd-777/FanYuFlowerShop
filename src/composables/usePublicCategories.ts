import { showToast } from '@/utils/feedback'
import { ref } from 'vue'
import { hasCacheEntry } from '@/utils/cache'
import { categoriesRepository } from '@/data/repository'
import { CACHE_KEYS } from '@/data/cacheKeys'
import type { Category } from '@/types/category'

const CACHE_KEY = CACHE_KEYS.categoriesPublic

export function usePublicCategories() {
  const categories = ref<Category[]>([])
  const loading = ref(false)

  async function loadCategories(options?: { force?: boolean }) {
    loading.value = options?.force ? true : !hasCacheEntry(CACHE_KEY)
    try {
      const { data } = await categoriesRepository.ensurePublicList({
        force: options?.force,
        onUpdate: (list) => {
          categories.value = list
        },
      })
      categories.value = data
    } catch (err) {
      console.error('[category] load failed:', err)
      if (!categories.value.length) {
        categories.value = []
      }
      showToast({
        title: err instanceof Error ? err.message : '加载分类失败',
        icon: 'none',
      })
    } finally {
      loading.value = false
    }
  }

  return {
    categories,
    loading,
    loadCategories,
  }
}
