import { computed, ref, watch } from 'vue'
import { usePublicGoods } from '@/composables/usePublicGoods'
import { usePublicCategories } from '@/composables/usePublicCategories'
import { useGoodsLiveSync } from '@/composables/useGoodsLiveSync'
import { useGoodsBrowseRefresh } from '@/composables/useGoodsBrowseRefresh'
import { goodsLiveSync } from '@/services/goodsLiveSync'
import { goodsRepository, wikiRepository } from '@/data/repository'
import { startAggressivePrefetch } from '@/data/prefetch/aggressivePrefetch'
import { prefetchOtherCustomerTabs } from '@/data/prefetch/routeP0'
import { suggestCustomerUnified, buildCustomerSearchPageUrl } from '@/services/customerUnifiedSearch'
import { navigateTo, navigateToWithFeedback, navigateToGoodsDetail } from '@/utils/router'
import type { CustomerUnifiedSearchScope, SearchSuggestion } from '@/types/search'
import type { FlowerWikiListItem } from '@/types/wiki'
import type { Goods } from '@/types/goods'
import type { PageEnsureContext } from '../types'
import type { PageSetupResult } from '../pageRegistry'
import {
  MALL_PRIMARY_NAV,
  buildMallUnifiedSections,
  type MallPrimaryNavKey,
  type MallPrimarySection,
} from '@/utils/mallCategoryNav'
import { resolveCategoryEnabled } from '@/types/category'
import { readCacheEntry } from '@/utils/cache'
import { CACHE_KEYS } from '@/data/cacheKeys'

/** 侧边一阶 tab（不含自选）；key 为固定 nav key 或自定义一阶分类 _id */
export interface CategorySidebarTab {
  key: MallPrimaryNavKey | string
  name: string
  icon?: string
  isCustomPrimary?: boolean
}

export function setupCategoryPageData(): PageSetupResult & Record<string, unknown> {
  const keyword = ref('')
  const searchPlaceholder = '搜索商品、花材、怎么养…'
  const suggestTitle = '商品与百科'
  const emptyText = '暂无商品'
  /** 对应 sideTabs 下标 */
  const activeIdx = ref(0)
  const suggestGoodsCatalog = ref<Goods[]>([])
  const suggestWikiCatalog = ref<FlowerWikiListItem[]>([])
  const navWikiCatalog = ref<FlowerWikiListItem[]>(
    readCacheEntry<FlowerWikiListItem[]>(CACHE_KEYS.wikiList)?.data ?? [],
  )
  const { categories, loadCategories } = usePublicCategories()
  const { goodsList, loading, loadGoods, searchCatalog, patchVisibleGoods } =
    usePublicGoods()

  const rawSideTabs = computed<CategorySidebarTab[]>(() => {
    const builtins = MALL_PRIMARY_NAV.map((item) => ({
      key: item.key,
      name: item.name,
      icon: item.icon,
    }))
    const customs = categories.value
      .filter(
        (c) =>
          c._source !== 'wiki'
          && c.navTier === 'primary'
          && resolveCategoryEnabled(c),
      )
      .sort((a, b) => (b.sort || 0) - (a.sort || 0))
      .map((c) => ({
        key: c._id,
        name: c.name,
        icon: c.icon,
        isCustomPrimary: true,
      }))
    return [...builtins, ...customs]
  })

  const mallSections = computed<MallPrimarySection[]>(() =>
    buildMallUnifiedSections(rawSideTabs.value, goodsList.value, categories.value, {
      wikiList: navWikiCatalog.value,
    }),
  )

  /** 与 mallSections 对齐：无商品的一阶 tab 不展示 */
  const sideTabs = computed<CategorySidebarTab[]>(() =>
    mallSections.value.map((section) => {
      const raw = rawSideTabs.value.find((t) => t.key === section.tabKey)
      return {
        key: section.tabKey,
        name: section.name,
        icon: section.icon || raw?.icon,
        isCustomPrimary: raw?.isCustomPrimary,
      }
    }),
  )

  watch(
    () => sideTabs.value.length,
    (len) => {
      if (activeIdx.value >= len) {
        activeIdx.value = Math.max(0, len - 1)
      }
    },
  )

  const currentSideTab = computed(() => sideTabs.value[activeIdx.value] || sideTabs.value[0])

  const activeSection = computed(
    () => mallSections.value.find((s) => s.tabIndex === activeIdx.value) || mallSections.value[0],
  )

  /** 当前一阶是否应显示二阶胶囊（二阶分类 ≥2 种） */
  const showSecondaryPillBar = computed(() => Boolean(activeSection.value?.showSecondaryPillBar))

  /** 当前一阶下的二阶分组 */
  const currentGoodsGroups = computed(() => activeSection.value?.groups || [])

  /** 二阶胶囊：当前一阶有二阶且 ≥2 种分类 */
  const currentPills = computed(() => {
    if (!showSecondaryPillBar.value) return []
    return currentGoodsGroups.value
      .filter((g) => !g.hideAnchor && g.title)
      .map((g) => ({ name: g.title, icon: g.icon }))
  })

  const scrollAnchor = ref('')

  function scrollToAnchor(id: string) {
    scrollAnchor.value = ''
    void Promise.resolve().then(() => {
      scrollAnchor.value = id
    })
  }

  async function reloadGoods(force = false) {
    return loadGoods('', '', { force })
  }

  function setActiveTabIndex(idx: number) {
    if (idx < 0 || idx >= sideTabs.value.length) return
    activeIdx.value = idx
  }

  function switchCategory(idx: number) {
    setActiveTabIndex(idx)
  }

  async function loadNavWikiCatalog() {
    try {
      const res = await wikiRepository.ensurePublicList()
      navWikiCatalog.value = res.data
    } catch {
      /* 别名归并降级：仅 canonical 种类名 */
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
    return suggestCustomerUnified(suggestGoodsCatalog.value, suggestWikiCatalog.value, query)
  }

  async function ensure(ctx: PageEnsureContext) {
    await loadCategories({ force: ctx.force })
    await Promise.all([reloadGoods(!!ctx.force), loadNavWikiCatalog()])
    void startAggressivePrefetch()
    prefetchOtherCustomerTabs('pages/category/index')
    await goodsLiveSync.resetVersionBaseline()
  }

  useGoodsLiveSync({
    getTargetIds: () => goodsList.value.map((item) => item._id),
    applyPatches: (result) => patchVisibleGoods(result),
  })

  const { browseTouchHandlers } = useGoodsBrowseRefresh()

  function formatPrice(price: number) {
    return Number(price).toFixed(2).replace(/\.00$/, '')
  }

  function goCustomize() {
    navigateTo({ url: '/pagesCustomer/customize/index' })
  }

  function onSearch() {
    goSearchWithKeyword(keyword.value)
  }

  function onSearchKeyword(value: string) {
    goSearchWithKeyword(value)
  }

  function goSearchWithKeyword(
    value: string,
    options?: { exactName?: boolean; scope?: CustomerUnifiedSearchScope },
  ) {
    const url = buildCustomerSearchPageUrl(value, options)
    if (!url) return
    void navigateToWithFeedback({ url })
  }

  function onPickSearchChannel(payload: {
    label: string
    channel: Exclude<CustomerUnifiedSearchScope, 'all'>
  }) {
    goSearchWithKeyword(payload.label, { scope: payload.channel })
  }

  function onPickSuggestion(item: SearchSuggestion) {
    goSearchWithKeyword(item.label)
  }

  function goDetail(id: string, coverPreview?: string, coverFileId?: string) {
    void navigateToGoodsDetail(id, coverPreview, coverFileId)
  }

  return {
    ensure,
    customHead: true,
    pullDownRefresh: 'content',
    refreshOnShow: true,
    keyword,
    searchPlaceholder,
    emptyText,
    activeIdx,
    goodsList,
    loading,
    sideTabs,
    currentSideTab,
    mallSections,
    activeSection,
    showSecondaryPillBar,
    currentGoodsGroups,
    currentPills,
    searchCatalog,
    unifiedSuggest,
    suggestTitle,
    formatPrice,
    switchCategory,
    setActiveTabIndex,
    scrollToAnchor,
    scrollAnchor,
    goCustomize,
    onSearch,
    onSearchKeyword,
    onPickSearchChannel,
    onPickSuggestion,
    onSearchModalOpen,
    goDetail,
    browseTouchHandlers,
  }
}
