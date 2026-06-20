import { computed, ref } from 'vue'
import { hasCacheEntry, readCacheEntry } from '@/utils/cache'
import { listPublicGoods } from '@/services/goods'
import { goodsRepository } from '@/data/repository'
import { CACHE_KEYS } from '@/data/cacheKeys'
import { attachGoodsCoverImages, attachGoodsCoverImagesFromCache } from '@/utils/goodsImage'
import { isSameGoodsListSnapshot } from '@/utils/goodsListSnapshot'
import { filterPublicGoodsList } from '@/utils/goodsListFilter'
import type { Goods } from '@/types/goods'

export interface GoodsCard extends Goods {
  imageUrl: string
}

const PUBLIC_GOODS_LIST_CACHE_KEY = CACHE_KEYS.goodsPublicAll

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

  async function applySourceGoods(list: Goods[], previous?: GoodsCard[]) {
    const items = await attachGoodsCoverImages(list, previous)
    if (previous?.length && isSameGoodsListSnapshot(items, previous)) return previous
    return items
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

    if (options?.force !== true && !sourceGoods.value.length) {
      const cached = readCacheEntry<Goods[]>(PUBLIC_GOODS_LIST_CACHE_KEY)
      if (cached?.data?.length) {
        sourceGoods.value = attachGoodsCoverImagesFromCache(cached.data)
      }
    }

    loading.value =
      options?.force === true
        ? true
        : !hasCacheEntry(PUBLIC_GOODS_LIST_CACHE_KEY) && !sourceGoods.value.length

    try {
      const previous = sourceGoods.value
      const { data } = await goodsRepository.ensurePublicList({
        force: options?.force,
        onUpdate: (list) => {
          void applySourceGoods(list as Goods[], sourceGoods.value).then((items) => {
            if (items !== sourceGoods.value) sourceGoods.value = items
          })
        },
      })
      sourceGoods.value = await applySourceGoods(data, previous)
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
    searchCatalog: computed(() => sourceGoods.value),
  }
}
