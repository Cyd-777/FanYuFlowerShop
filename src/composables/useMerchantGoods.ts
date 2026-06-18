import { computed, ref } from 'vue'
import { hasCacheEntry } from '@/utils/cache'
import {
  listMerchantGoodsCached,
  MERCHANT_GOODS_LIST_CACHE_KEY,
} from '@/services/goods'
import { pickDisplayImage, resolveCloudImageMap } from '@/utils/goodsImage'
import {
  DEFAULT_MERCHANT_GOODS_FILTER,
  filterMerchantGoodsView,
} from '@/utils/goodsListFilter'
import type { MerchantGoodsFilterState } from '@/utils/goodsListFilter'
import type { Goods } from '@/types/goods'

export interface MerchantGoodsCard extends Goods {
  imageUrl: string
}

async function withCoverImages(list: Goods[]): Promise<MerchantGoodsCard[]> {
  const imageMap = await resolveCloudImageMap(
    list.map((item) => item.coverImage || item.images[0] || ''),
  )
  return list.map((item) => ({
    ...item,
    imageUrl: pickDisplayImage(item.coverImage || item.images[0] || '', imageMap),
  }))
}

export function useMerchantGoods() {
  const sourceGoods = ref<MerchantGoodsCard[]>([])
  const filters = ref<MerchantGoodsFilterState>({ ...DEFAULT_MERCHANT_GOODS_FILTER })
  const loading = ref(false)

  const catalogList = computed(() => sourceGoods.value)

  const goodsList = computed(() =>
    filterMerchantGoodsView(sourceGoods.value, filters.value),
  )

  function setFilters(partial: Partial<MerchantGoodsFilterState>) {
    filters.value = { ...filters.value, ...partial }
  }

  function resetFilters() {
    filters.value = { ...DEFAULT_MERCHANT_GOODS_FILTER }
  }

  async function loadGoods(options?: { force?: boolean }) {
    loading.value =
      options?.force === true
        ? true
        : !hasCacheEntry(MERCHANT_GOODS_LIST_CACHE_KEY) && !sourceGoods.value.length

    try {
      const { data } = await listMerchantGoodsCached({
        force: options?.force,
        onUpdate: (list) => {
          void withCoverImages(list).then((items) => {
            sourceGoods.value = items
          })
        },
      })
      sourceGoods.value = await withCoverImages(data)
    } catch (err) {
      console.error('[goods] merchant load failed:', err)
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
    catalogList,
    loading,
    filters,
    setFilters,
    resetFilters,
    loadGoods,
  }
}
