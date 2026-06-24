import { showToast } from '@/utils/feedback'
import { computed, ref, type Ref } from 'vue'
import { hasCacheEntry, readCacheEntry } from '@/utils/cache'
import {
  MERCHANT_GOODS_LIST_CACHE_KEY,
} from '@/services/goods'
import { merchantGoodsRepository } from '@/data/repository/merchantGoodsRepository'
import {
  attachGoodsCoverImages,
  attachGoodsCoverImagesFromCache,
} from '@/utils/goodsImage'
import { isSameGoodsListSnapshot } from '@/utils/goodsListSnapshot'
import {
  DEFAULT_MERCHANT_GOODS_FILTER,
  filterMerchantGoodsView,
} from '@/utils/goodsListFilter'
import type { MerchantGoodsFilterState } from '@/utils/goodsListFilter'
import type { Category } from '@/types/category'
import type { Goods } from '@/types/goods'

export interface MerchantGoodsCard extends Goods {
  imageUrl: string
}

async function withCoverImages(
  list: Goods[],
  previous?: MerchantGoodsCard[],
): Promise<MerchantGoodsCard[]> {
  const items = await attachGoodsCoverImages(list, previous)
  if (previous?.length && isSameGoodsListSnapshot(items, previous)) return previous
  return items
}

export function useMerchantGoods(categories?: Ref<Category[]>) {
  const sourceGoods = ref<MerchantGoodsCard[]>([])
  const filters = ref<MerchantGoodsFilterState>({ ...DEFAULT_MERCHANT_GOODS_FILTER })
  const loading = ref(false)

  const catalogList = computed(() => sourceGoods.value)

  const goodsList = computed(() =>
    filterMerchantGoodsView(sourceGoods.value, filters.value, {
      categories: categories?.value ?? [],
      catalog: sourceGoods.value,
    }),
  )

  function setFilters(partial: Partial<MerchantGoodsFilterState>) {
    filters.value = { ...filters.value, ...partial }
  }

  function resetFilters() {
    filters.value = { ...DEFAULT_MERCHANT_GOODS_FILTER }
  }

  async function loadGoods(options?: { force?: boolean }) {
    if (options?.force !== true && !sourceGoods.value.length) {
      const cached = readCacheEntry<Goods[]>(MERCHANT_GOODS_LIST_CACHE_KEY)
      if (cached?.data?.length) {
        sourceGoods.value = attachGoodsCoverImagesFromCache(cached.data)
      }
    }

    loading.value =
      options?.force === true
        ? true
        : !hasCacheEntry(MERCHANT_GOODS_LIST_CACHE_KEY) && !sourceGoods.value.length

    try {
      const previous = sourceGoods.value
      const { data } = await merchantGoodsRepository.ensureList({
        force: options?.force,
        onUpdate: (list) => {
          void withCoverImages(list, sourceGoods.value).then((items) => {
            if (items !== sourceGoods.value) sourceGoods.value = items
          })
        },
      })
      sourceGoods.value = await withCoverImages(data, previous)
    } catch (err) {
      console.error('[goods] merchant load failed:', err)
      if (!sourceGoods.value.length) {
        sourceGoods.value = []
      }
      showToast({
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
