import { showToast } from '@/utils/feedback'
import { ref } from 'vue'
import { hasCacheEntry } from '@/utils/cache'
import { listMerchantWikisCached } from '@/services/wiki'
import type { FlowerWikiListItem } from '@/types/wiki'

const CACHE_KEY = 'wiki:merchant:list'

export function useMerchantWikis() {
  const wikis = ref<FlowerWikiListItem[]>([])
  const loading = ref(false)

  async function loadWikis(options?: { force?: boolean }) {
    loading.value = options?.force ? true : !hasCacheEntry(CACHE_KEY)
    try {
      const { data } = await listMerchantWikisCached({
        force: options?.force,
        onUpdate: (list) => {
          wikis.value = list
        },
      })
      wikis.value = data
    } catch (err) {
      console.error('[wiki] merchant load failed:', err)
      if (!wikis.value.length) {
        wikis.value = []
      }
      showToast({
        title: err instanceof Error ? err.message : '加载词条失败',
        icon: 'none',
      })
    } finally {
      loading.value = false
    }
  }

  return {
    wikis,
    loading,
    loadWikis,
  }
}
