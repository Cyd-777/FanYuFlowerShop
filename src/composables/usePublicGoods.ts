import { computed, ref } from 'vue'
import { hasCacheEntry } from '@/utils/cache'
import { listPublicGoods, listPublicGoodsCached } from '@/services/goods'
import { attachGoodsCoverImages } from '@/utils/goodsImage'
import { filterPublicGoodsList } from '@/utils/goodsListFilter'
import type { Goods } from '@/types/goods'

export interface GoodsCard extends Goods {
  imageUrl: string
}

const PUBLIC_GOODS_LIST_CACHE_KEY = 'goods:public:all'

export function usePublicGoods() {
  const sourceGoods = ref<GoodsCard[]>([])
  const searchResults = ref<GoodsCard[] | null>(null)
  const activeCategoryId = ref('')
  const loading = ref(false)

  const goodsList = computed(() =>
    filterPublicGoodsList(searchResults.value ?? sourceGoods.value, activeCategoryId.value),
  )

  function setCategory(categoryId = '') {
    activeCategoryId.value = categoryId
  }

  async function loadGoods(keyword = '', categoryId = '', options?: { force?: boolean }) {
    activeCategoryId.value = categoryId
    const trimmedKeyword = keyword.trim()

    if (trimmedKeyword) {
      loading.value = true
      try {
        const list = await listPublicGoods(trimmedKeyword, categoryId)
        searchResults.value = await attachGoodsCoverImages(list)
      } catch (err) {
        console.error('[goods] load failed:', err)
        searchResults.value = []
        wx.showToast({
          title: err instanceof Error ? err.message : '加载商品失败',
          icon: 'none',
        })
      } finally {
        loading.value = false
      }
      return
    }

    searchResults.value = null
    loading.value =
      options?.force === true
        ? true
        : !hasCacheEntry(PUBLIC_GOODS_LIST_CACHE_KEY) && !sourceGoods.value.length

    try {
      const { data } = await listPublicGoodsCached({
        force: options?.force,
        onUpdate: (list) => {
          void attachGoodsCoverImages(list).then((items) => {
            sourceGoods.value = items
          })
        },
      })
      sourceGoods.value = await attachGoodsCoverImages(data)
    } catch (err) {
      console.error('[goods] load failed:', err)
      if (!sourceGoods.value.length) {
        sourceGoods.value = []
      }
      wx.showToast({
        title: err instanceof Error ? err.message : '加载商品失败',
        icon: 'none',
      })
    } finally {
      loading.value = false
    }
  }

  return {
    goodsList,
    loading,
    activeCategoryId,
    setCategory,
    loadGoods,
  }
}
