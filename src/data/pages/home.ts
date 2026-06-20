import { computed, ref } from 'vue'
import { useShopDisplay } from '@/composables/useShopDisplay'
import { usePublicCategories } from '@/composables/usePublicCategories'
import { PUBLIC_RECOMMEND_CACHE_KEY } from '@/services/goods'
import { hasCacheEntry, readCacheEntry } from '@/utils/cache'
import { goodsRepository } from '@/data/repository'
import {
  attachGoodsCoverImages,
  attachGoodsCoverImagesFromCache,
  resolveCloudImageUrl,
} from '@/utils/goodsImage'
import { isSameGoodsListSnapshot } from '@/utils/goodsListSnapshot'
import { resolveActiveTheme } from '@/types/shopTheme'
import { applyDiscountPrice, getThemeDiscountRate } from '@/utils/themeDiscount'
import { navigateTo } from '@/utils/router'
import type { PageEnsureContext } from '../types'
import type { PageSetupResult } from '../pageRegistry'
import type { Category } from '@/types/category'
import type { Goods } from '@/types/goods'

export function setupHomePageData(): PageSetupResult & Record<string, unknown> {
  const emptyText = '暂无推荐花束，去分类逛逛吧'
  const shopStore = useShopDisplay()
  const { categories, loadCategories } = usePublicCategories()
  const goodsList = ref<Array<Goods & { imageUrl: string; discountPrice?: number }>>([])
  const loading = ref(false)
  const bannerUrl = ref('')

  const themePreset = computed(() => resolveActiveTheme(shopStore.settings.decoration))
  const sectionTitle = computed(() =>
    themePreset.value.id === 'default' ? '推荐花束' : `${themePreset.value.name}推荐`,
  )
  const headerStyle = computed(() => ({
    background: `linear-gradient(135deg, ${themePreset.value.headerGradient[0]}, ${themePreset.value.headerGradient[1]})`,
  }))
  const themeChipBg = computed(() => `${themePreset.value.headerGradient[0]}`)

  async function applyThemeUi() {
    const bannerId = themePreset.value.bannerImage
    bannerUrl.value = bannerId ? await resolveCloudImageUrl(bannerId) : ''
    try {
      wx.setTabBarStyle({ selectedColor: themePreset.value.primaryColor })
    } catch (err) {
      console.warn('[home] setTabBarStyle failed:', err)
    }
  }

  function attachDiscounts(items: Array<Goods & { imageUrl: string }>) {
    const decoration = shopStore.settings.decoration
    return items.map((item) => {
      const rate = getThemeDiscountRate(item._id, decoration)
      if (rate == null) return item
      return { ...item, discountPrice: applyDiscountPrice(item.price, rate) }
    })
  }

  async function loadRecommend(force = false) {
    if (force !== true && !goodsList.value.length) {
      const cached = readCacheEntry<Goods[]>(PUBLIC_RECOMMEND_CACHE_KEY)
      if (cached?.data?.length) {
        goodsList.value = attachDiscounts(attachGoodsCoverImagesFromCache(cached.data))
      }
    }

    loading.value =
      force === true
        ? true
        : !hasCacheEntry(PUBLIC_RECOMMEND_CACHE_KEY) && !goodsList.value.length

    try {
      const previous = goodsList.value
      const { data } = await goodsRepository.ensureRecommendList({
        force,
        onUpdate: (list) => {
          void attachGoodsCoverImages(list, goodsList.value).then((items) => {
            const next = attachDiscounts(items)
            if (isSameGoodsListSnapshot(next, goodsList.value)) return
            goodsList.value = next
          })
        },
      })
      const next = attachDiscounts(await attachGoodsCoverImages(data, previous))
      if (!isSameGoodsListSnapshot(next, previous)) {
        goodsList.value = next
      }
      goodsRepository.scheduleRecommendDetailPrefetch(data.map((item) => item._id))
    } catch (err) {
      console.error('[home] recommend load failed:', err)
      if (!goodsList.value.length) goodsList.value = []
      wx.showToast({
        title: err instanceof Error ? err.message : '加载推荐失败',
        icon: 'none',
      })
    } finally {
      loading.value = false
    }
  }

  async function ensure(ctx: PageEnsureContext) {
    await shopStore.hydrate({ force: ctx.force })
    await applyThemeUi()
    await Promise.all([loadCategories({ force: ctx.force }), loadRecommend(!!ctx.force)])
  }

  function formatPrice(price: number) {
    return Number(price).toFixed(2).replace(/\.00$/, '')
  }

  function goCategory(cat: Category) {
    navigateTo({ url: '/pagesCustomer/goods/list?categoryId=' + cat._id })
  }

  function goDetail(id: string) {
    navigateTo({ url: '/pagesCustomer/goods/detail?id=' + id })
  }

  return {
    ensure,
    pullDownRefresh: true,
    refreshOnShow: true,
    shopStore,
    categories,
    goodsList,
    loading,
    bannerUrl,
    themePreset,
    sectionTitle,
    headerStyle,
    themeChipBg,
    emptyText,
    formatPrice,
    goCategory,
    goDetail,
  }
}
