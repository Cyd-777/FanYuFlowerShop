import { showToast } from '@/utils/feedback'
import { computed, ref } from 'vue'
import { useShopDisplay } from '@/composables/useShopDisplay'
import { usePublicCategories } from '@/composables/usePublicCategories'
import { PUBLIC_RECOMMEND_CACHE_KEY, syncRecommendListFromCloud } from '@/services/goods'
import { hasCacheEntry, readCacheEntry } from '@/utils/cache'
import {
  attachGoodsCoverImages,
  attachGoodsCoverImagesFromCache,
  readCachedImageUrl,
  resolveCloudImageUrl,
} from '@/utils/goodsImage'
import { applyPublicGoodsLivePatches } from '@/utils/applyPublicGoodsLivePatches'
import { mergeGoodsLivePatch } from '@/utils/goodsLiveMerge'
import { isSameGoodsListSnapshot } from '@/utils/goodsListSnapshot'
import { resolveActiveTheme } from '@/types/shopTheme'
import { applyDiscountPrice, getThemeDiscountRate } from '@/utils/themeDiscount'
import { navigateTo, navigateToWithFeedback } from '@/utils/router'
import { useGoodsLiveSync } from '@/composables/useGoodsLiveSync'
import { useGoodsBrowseRefresh } from '@/composables/useGoodsBrowseRefresh'
import { goodsLiveSync } from '@/services/goodsLiveSync'
import { prefetchHomeFirstScreen, readCachedHomeBannerUrls } from '@/data/prefetch/homeFirstScreen'
import { goodsRepository, wikiRepository } from '@/data/repository'
import { suggestCustomerUnified, buildCustomerSearchPageUrl } from '@/services/customerUnifiedSearch'
import type { CustomerUnifiedSearchScope, SearchSuggestion } from '@/types/search'
import type { FlowerWikiListItem } from '@/types/wiki'
import type { PageEnsureContext } from '../types'
import type { PageSetupResult } from '../pageRegistry'
import type { Category } from '@/types/category'
import type { Goods } from '@/types/goods'

export function setupHomePageData(): PageSetupResult & Record<string, unknown> {
  const emptyText = '暂无推荐花束，去分类逛逛吧'
  const searchPlaceholder = '搜索商品、花材、怎么养…'
  const suggestTitle = '商品与百科'
  const shopStore = useShopDisplay()
  const { categories, loadCategories } = usePublicCategories()
  const keyword = ref('')
  const suggestGoodsCatalog = ref<Goods[]>([])
  const suggestWikiCatalog = ref<FlowerWikiListItem[]>([])

  function readInitialRecommendList(): Array<Goods & { imageUrl: string; discountPrice?: number }> {
    const cached = readCacheEntry<Goods[]>(PUBLIC_RECOMMEND_CACHE_KEY)
    if (cached?.data?.length) {
      return attachGoodsCoverImagesFromCache(cached.data)
    }
    return []
  }

  const goodsList = ref<Array<Goods & { imageUrl: string; discountPrice?: number }>>(
    readInitialRecommendList(),
  )
  const loading = ref(!goodsList.value.length && !hasCacheEntry(PUBLIC_RECOMMEND_CACHE_KEY))
  const bannerUrls = ref<string[]>(readCachedHomeBannerUrls())

  const themePreset = computed(() => resolveActiveTheme(shopStore.settings.decoration))
  const sectionTitle = computed(() =>
    themePreset.value.id === 'default' ? '推荐花束' : `${themePreset.value.name}推荐`,
  )
  const headerStyle = computed(() => ({
    background: `linear-gradient(135deg, ${themePreset.value.headerGradient[0]}, ${themePreset.value.headerGradient[1]})`,
  }))
  const themeChipBg = computed(() => `${themePreset.value.headerGradient[0]}`)

  function syncBannerFromCache() {
    const resolvedList = shopStore.settings.bannerImageUrls?.filter(Boolean)
    if (resolvedList?.length) {
      bannerUrls.value = resolvedList
      return
    }
    const resolved = shopStore.settings.bannerImageUrl
    if (resolved) {
      bannerUrls.value = [resolved]
      return
    }
    const fileIds = themePreset.value.bannerImages
    if (!fileIds.length) {
      bannerUrls.value = []
      return
    }
    const cached = fileIds
      .map((id) => readCachedImageUrl(id))
      .filter(Boolean) as string[]
    if (cached.length) bannerUrls.value = cached
  }

  async function refreshBannerUrls(forceNetwork = false) {
    const resolvedList = shopStore.settings.bannerImageUrls?.filter(Boolean)
    if (resolvedList?.length) {
      bannerUrls.value = resolvedList
      return
    }
    const resolved = shopStore.settings.bannerImageUrl
    if (resolved) {
      bannerUrls.value = [resolved]
      return
    }
    const fileIds = themePreset.value.bannerImages
    if (!fileIds.length) {
      bannerUrls.value = []
      return
    }
    syncBannerFromCache()
    if (bannerUrls.value.length && !forceNetwork) {
      void Promise.all(fileIds.map((id) => resolveCloudImageUrl(id))).then((urls) => {
        const next = urls.filter(Boolean)
        if (next.length) bannerUrls.value = next
      })
      return
    }
    const urls = await Promise.all(fileIds.map((id) => resolveCloudImageUrl(id)))
    bannerUrls.value = urls.filter(Boolean)
  }

  async function applyThemeUi(forceNetwork = false) {
    syncBannerFromCache()
    try {
      wx.setTabBarStyle({ selectedColor: themePreset.value.primaryColor })
    } catch (err) {
      console.warn('[home] setTabBarStyle failed:', err)
    }
    await refreshBannerUrls(forceNetwork)
  }

  function attachDiscounts(items: Array<Goods & { imageUrl: string; discountPrice?: number }>) {
    const decoration = shopStore.settings.decoration
    let changed = false
    const next = items.map((item) => {
      const rate = getThemeDiscountRate(item._id, decoration)
      if (rate == null) return item
      const discountPrice = applyDiscountPrice(item.price, rate)
      if (item.discountPrice === discountPrice) return item
      changed = true
      return { ...item, discountPrice }
    })
    return changed ? next : items
  }

  async function applyLivePatches(result: { patches: Goods[]; missingIds: string[] }) {
    const previous = goodsList.value
    const patched = await applyPublicGoodsLivePatches(previous, result)
    if (patched === previous) return
    const merged = attachDiscounts(patched)
    if (merged !== previous) {
      goodsList.value = merged
    }
  }

  async function silentRefreshRecommendStructure() {
    try {
      const previous = goodsList.value
      const data = await syncRecommendListFromCloud()
      const prevIds = previous.map((item) => item._id).join(',')
      const nextIds = data.map((item) => item._id).join(',')

      if (prevIds === nextIds) return

      const withImages = await attachGoodsCoverImages(data, previous)
      const prevById = new Map(previous.map((item) => [item._id, item]))
      let listChanged = false
      const merged = withImages.map((item) => {
        const prev = prevById.get(item._id)
        if (!prev) {
          listChanged = true
          return item
        }
        const { item: patched, changed } = mergeGoodsLivePatch(prev, item)
        if (changed) listChanged = true
        return patched
      })
      if (!listChanged) return
      goodsList.value = attachDiscounts(merged)
    } catch (err) {
      console.warn('[home] silent recommend refresh failed:', err)
    }
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
      showToast({
        title: err instanceof Error ? err.message : '加载推荐失败',
        icon: 'none',
      })
    } finally {
      loading.value = false
    }
  }

  async function loadSearchSuggestCatalogs() {
    try {
      const [goodsRes, wikiRes] = await Promise.all([
        goodsRepository.ensurePublicList(),
        wikiRepository.ensurePublicList(),
      ])
      suggestGoodsCatalog.value = goodsRes.data
      suggestWikiCatalog.value = wikiRes.data
    } catch {
      /* 预判降级 */
    }
  }

  function onSearchModalOpen(focused: boolean) {
    if (focused) void loadSearchSuggestCatalogs()
  }

  function unifiedSuggest(query: string) {
    return suggestCustomerUnified(
      suggestGoodsCatalog.value,
      suggestWikiCatalog.value,
      query,
    )
  }

  function goUnifiedSearch(
    value: string,
    options?: { exactName?: boolean; scope?: CustomerUnifiedSearchScope },
  ) {
    const url = buildCustomerSearchPageUrl(value, options)
    if (!url) return
    void navigateToWithFeedback({ url })
  }

  function onSearchKeyword(value: string) {
    goUnifiedSearch(value)
  }

  function onPickSearchChannel(payload: {
    label: string
    channel: Exclude<CustomerUnifiedSearchScope, 'all'>
  }) {
    goUnifiedSearch(payload.label, { scope: payload.channel })
  }

  function onPickSearchSuggestion(item: SearchSuggestion) {
    goUnifiedSearch(item.label)
  }

  async function ensure(ctx: PageEnsureContext) {
    prefetchHomeFirstScreen()
    void loadSearchSuggestCatalogs()
    await shopStore.hydrate({ force: ctx.force })
    const forceNetwork = !!ctx.force
    await applyThemeUi(forceNetwork)
    await loadCategories({ force: ctx.force })
    void loadRecommend(!!ctx.force)
    await goodsLiveSync.resetVersionBaseline()
  }

  useGoodsLiveSync({
    getTargetIds: () => goodsList.value.map((item) => item._id),
    applyPatches: (result) => applyLivePatches(result),
    refreshScope: () => silentRefreshRecommendStructure(),
  })

  const { browseTouchHandlers } = useGoodsBrowseRefresh()

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
    bannerUrls,
    themePreset,
    sectionTitle,
    headerStyle,
    themeChipBg,
    emptyText,
    searchPlaceholder,
    suggestTitle,
    keyword,
    unifiedSuggest,
    onSearchKeyword,
    onPickSearchChannel,
    onPickSearchSuggestion,
    onSearchModalOpen,
    formatPrice,
    goCategory,
    goDetail,
    browseTouchHandlers,
  }
}
