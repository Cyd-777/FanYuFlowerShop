<template>
  <view
    class="page-merchant-goods"
    :class="{ 'batch-mode': batchMode, 'has-batch-bar': batchMode }"
    :style="navCssVars"
  >
    <AppNavBar />
    <view
      id="merchant-goods-toolbar"
      class="manage-toolbar page-sticky-search"
      :class="{ 'is-filter-open': filterModalOpen }"
      :style="toolbarStickyStyle"
    >
      <GoodsNameTypeahead
        v-model="keyword"
        :catalog="catalogList"
        placeholder="口语搜索：上架商品、首页推荐、低于100元、百合…"
        :sticky="false"
        @search="onSearchKeyword"
        @select="onPickSuggestion"
      />
      <view class="manage-toolbar__bar">
        <text class="manage-toolbar__count">共 {{ goodsList.length }} 件</text>
        <view class="manage-toolbar__actions">
          <view class="tool-btn" hover-class="tool-btn--active" @tap.stop="goStockInImport">
            进货单入库
          </view>
          <view
            class="tool-btn"
            :class="{ 'is-active': batchMode }"
            hover-class="tool-btn--active"
            @tap.stop="toggleBatchMode"
          >
            {{ batchMode ? '退出批量' : '批量管理' }}
          </view>
          <view
            class="tool-btn tool-btn--filter"
            :class="{ 'is-active': filterModalOpen }"
            hover-class="tool-btn--active"
            @tap.stop="toggleFilterModal"
          >
            <text class="tool-btn__label">筛选</text>
            <text class="tool-btn__count">{{ goodsList.length }}</text>
          </view>
        </view>
      </view>
    </view>
    <view
      v-if="filterModalOpen"
      class="manage-toolbar-placeholder"
      :style="toolbarPlaceholderStyle"
    />

    <view class="goods-body">
      <GoodsCardSkeleton v-if="loading" :count="4" />

      <view v-else-if="goodsList.length" class="goods-grid">
        <view
          v-for="item in goodsList"
          :key="item._id"
          class="goods-card"
          :class="{ selected: isSelected(item._id) }"
          @click="onCardClick(item._id)"
        >
          <view v-if="batchMode" class="select-badge" :class="{ checked: isSelected(item._id) }">
            {{ isSelected(item._id) ? '✓' : '' }}
          </view>
          <view class="img-wrap">
            <GoodsImage :src="item.imageUrl" root-class="goods-img" />
            <view v-if="statusText(item)" class="status-badge" :class="statusClass(item)">
              {{ statusText(item) }}
            </view>
          </view>
          <view class="goods-name">{{ item.name }}</view>
          <GoodsSalesTagRow :goods="item" />
          <view class="goods-meta">
            <view class="goods-price">¥{{ formatPrice(item.price) }}</view>
            <view class="goods-stock">库存 {{ item.stock }}</view>
          </view>
        </view>
      </view>

      <nut-empty
        v-else-if="!loading"
        :description="emptyDescription"
      />
    </view>

    <view v-if="!batchMode" class="fab-wrap">
      <nut-button type="primary" class="fab-btn" @click="addGoods">+ 新建商品</nut-button>
    </view>

    <view v-if="batchMode" class="batch-bar">
      <view class="batch-top">
        <text class="batch-count">已选 {{ selectedIds.length }} 件</text>
        <view
          class="batch-link"
          hover-class="batch-link--active"
          @tap.stop="toggleSelectAll"
        >
          {{ allVisibleSelected ? '取消全选' : '全选当前' }}
        </view>
      </view>
      <view class="batch-actions">
        <view
          class="batch-action"
          :class="{ 'is-disabled': !hasBatchSelection || batchWorking }"
          hover-class="batch-action--active"
          @tap.stop="runQuickBatch('onShelf')"
        >上架</view>
        <view
          class="batch-action"
          :class="{ 'is-disabled': !hasBatchSelection || batchWorking }"
          hover-class="batch-action--active"
          @tap.stop="runQuickBatch('offShelf')"
        >下架</view>
        <view
          class="batch-action"
          :class="{ 'is-disabled': !hasBatchSelection || batchWorking }"
          hover-class="batch-action--active"
          @tap.stop="runQuickBatch('recommendOn')"
        >设推荐</view>
        <view
          class="batch-action"
          :class="{ 'is-disabled': !hasBatchSelection || batchWorking }"
          hover-class="batch-action--active"
          @tap.stop="runQuickBatch('recommendOff')"
        >取消推荐</view>
        <!-- TODO: 批量修改弹层待格式确定后恢复（MerchantGoodsBatchEditSheet） -->
        <view
          class="batch-action"
          :class="{ 'is-disabled': !hasBatchSelection || batchWorking }"
          hover-class="batch-action--active"
          @tap.stop="goBatchStockIn"
        >批量入库</view>
        <view
          class="batch-action danger"
          :class="{ 'is-disabled': !hasBatchSelection || batchWorking }"
          hover-class="batch-action--active"
          @tap.stop="runQuickBatch('remove')"
        >删除</view>
      </view>
    </view>

    <view
      v-if="filterModalOpen"
      class="filter-modal"
      catchtouchmove
      @touchmove.stop.prevent
    >
      <view class="filter-modal__mask" :style="filterMaskStyle" @tap="closeFilterModal" />
      <view class="filter-modal__panel" :style="filterPanelStyle" @tap.stop>
        <view
          class="filter-modal__foot"
          :class="{ 'is-closing': filterPanelClosing }"
          :style="filterFootStyle"
        >
          <view class="filter-modal__reveal">
            <scroll-view
              class="filter-modal__scroll"
              :scroll-y="true"
              :enhanced="true"
              :show-scrollbar="false"
            >
            <view class="filter-form">
            <view class="filter-section">
              <view class="filter-section__label">上架状态</view>
              <view class="filter-chips">
                <view
                  v-for="tab in shelfTabs"
                  :key="tab.value"
                  class="filter-chip"
                  :class="{ active: filters.shelfStatus === tab.value }"
                  @tap="setFilters({ shelfStatus: tab.value })"
                >
                  {{ tab.label }}
                </view>
              </view>
              <view class="filter-section__label filter-section__label--sub">库存状态</view>
              <view class="filter-chips">
                <view
                  v-for="opt in stockStatusOptions"
                  :key="opt.value"
                  class="filter-chip"
                  :class="{ active: filters.stockStatus === opt.value }"
                  @tap="pickStockStatus(opt.value)"
                >
                  {{ opt.label }}
                </view>
              </view>
            </view>

            <view class="filter-section">
              <view class="filter-section__label">商品分类</view>
              <view class="filter-chips">
                <view
                  v-for="opt in categoryOptions"
                  :key="opt.id || '__all__'"
                  class="filter-chip"
                  :class="{ active: isCategoryActive(opt.id) }"
                  @tap="toggleCategory(opt.id)"
                >
                  {{ opt.label }}
                </view>
              </view>
            </view>

            <view class="filter-section">
              <view class="filter-section__label">花材种类</view>
              <view v-if="!flowerKindOptions.length" class="filter-empty-hint">暂无花材</view>
              <view v-else class="filter-chips">
                <view
                  class="filter-chip"
                  :class="{ active: isFlowerKindActive(MERCHANT_FILTER_ALL_ID) }"
                  @tap="toggleFlowerKind(MERCHANT_FILTER_ALL_ID)"
                >
                  全部花材
                </view>
                <view
                  v-for="opt in flowerKindOptions"
                  :key="opt.id"
                  class="filter-chip"
                  :class="{ active: isFlowerKindActive(opt.id) }"
                  @tap="toggleFlowerKind(opt.id)"
                >
                  {{ opt.name }}
                </view>
              </view>
            </view>

            <view class="filter-section">
              <view class="filter-section__label">花卉品种</view>
              <view v-if="!flowerVarietyOptions.length" class="filter-empty-hint">暂无品种</view>
              <view v-else class="filter-chips">
                <view
                  class="filter-chip"
                  :class="{ active: isFlowerVarietyActive(MERCHANT_FILTER_ALL_ID) }"
                  @tap="toggleFlowerVariety(MERCHANT_FILTER_ALL_ID)"
                >
                  全部品种
                </view>
                <view
                  v-for="opt in flowerVarietyOptions"
                  :key="opt.id"
                  class="filter-chip"
                  :class="{ active: isFlowerVarietyActive(opt.id) }"
                  @tap="toggleFlowerVariety(opt.id)"
                >
                  {{ opt.name }}
                </view>
              </view>
            </view>

            <view class="filter-section">
              <view class="filter-section__label">销售类型</view>
              <view class="filter-chips">
                <view
                  v-for="opt in salesTypeOptions"
                  :key="opt.value || '__all__'"
                  class="filter-chip"
                  :class="{ active: isSalesTypeActive(opt.value) }"
                  @tap="toggleSalesType(opt.value)"
                >
                  {{ opt.label }}
                </view>
              </view>
            </view>

            <view class="filter-section filter-section--price">
              <view class="filter-section__label">价格区间</view>
              <view class="price-slider-meta">
                <text>¥{{ priceSliderMinLabel }}</text>
                <text class="price-slider-meta__sep">—</text>
                <text>¥{{ priceSliderMaxLabel }}</text>
              </view>
              <view class="price-slider-row">
                <text class="price-slider-row__label">最低</text>
                <slider
                  class="price-slider"
                  :min="priceBounds.floor"
                  :max="priceBounds.ceil"
                  :step="priceBounds.step"
                  :value="priceSliderMin"
                  activeColor="#667eea"
                  backgroundColor="#e8e8e8"
                  block-size="20"
                  @changing="onPriceMinChanging"
                  @change="onPriceMinChange"
                />
              </view>
              <view class="price-slider-row">
                <text class="price-slider-row__label">最高</text>
                <slider
                  class="price-slider"
                  :min="priceBounds.floor"
                  :max="priceBounds.ceil"
                  :step="priceBounds.step"
                  :value="priceSliderMax"
                  activeColor="#667eea"
                  backgroundColor="#e8e8e8"
                  block-size="20"
                  @changing="onPriceMaxChanging"
                  @change="onPriceMaxChange"
                />
              </view>
            </view>

            <view class="filter-section filter-section--switch">
              <text class="filter-section__label">只看推荐</text>
              <nut-switch v-model="filters.recommendOnly" />
            </view>
          </view>
        </scroll-view>
          </view>
          <view class="filter-modal__actions">
            <nut-button plain class="filter-modal__btn" @click="onResetFilters">重置</nut-button>
            <nut-button type="primary" class="filter-modal__btn" @click="closeFilterModal">完成</nut-button>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { showNotifyConfirm, showToast } from '@/utils/feedback'
import { computed, nextTick, ref, watch } from 'vue'
import Taro from '@tarojs/taro'
import { usePageData } from '@/composables/usePageData'
import { navigateTo, navigateToWithFeedback } from '@/utils/router'
import {
  batchRemoveGoods,
  batchUpdateGoods,
} from '@/services/goods'
import {
  collectFlowerKindOptions,
  collectFlowerVarietyOptions,
  DEFAULT_MERCHANT_GOODS_FILTER,
  isMerchantMultiFilterActive,
  isMerchantSalesTypeActive,
  MERCHANT_FILTER_ALL_ID,
  pruneMerchantMultiFilterIds,
  toggleMerchantMultiFilter,
  toggleMerchantSalesTypes,
} from '@/utils/goodsListFilter'
import type { MerchantShelfStatus, MerchantStockStatus } from '@/utils/goodsListFilter'
import { buildSelectStockInSession, writeStockInSession } from '@/utils/stockInSession'
import type { GoodsBatchPatch, GoodsBatchQuickAction } from '@/types/goodsBatch'
import {
  GOODS_SALES_TYPE_OPTIONS,
  type Goods,
  type GoodsSalesType,
} from '@/types/goods'
import { getMerchantGoodsImageOverlay } from '@/utils/goodsAvailability'
import GoodsCardSkeleton from '@/components/GoodsCardSkeleton.vue'
import GoodsImage from '@/components/GoodsImage.vue'
import GoodsSalesTagRow from '@/components/GoodsSalesTagRow.vue'
import GoodsNameTypeahead from '@/components/GoodsNameTypeahead.vue'
import type { GoodsNameSuggestion } from '@/utils/goodsNameSuggest'
import { useNavBarLayout } from '@/composables/useNavBarLayout'
import { rpxToPx, usePageSticky } from '@/composables/usePageSticky'

const { cssVars: navCssVars, layout: navLayout } = useNavBarLayout()
const { navSearchStickyStyle } = usePageSticky()
const keyword = ref('')
const batchMode = ref(false)
const filterModalOpen = ref(false)
const toolbarHeightPx = ref(0)
/** foot 容器当前高度（0 → 面板满高过渡） */
const panelRevealHeightPx = ref(0)
const filterPanelClosing = ref(false)
const selectedIds = ref<string[]>([])
const batchWorking = ref(false)

const {
  goodsList,
  catalogList,
  loading,
  filters,
  setFilters,
  resetFilters,
  categories,
  loadGoods,
} = usePageData()

const shelfTabs: Array<{ label: string; value: MerchantShelfStatus }> = [
  { label: '全部', value: 'all' },
  { label: '已上架', value: 'onShelf' },
  { label: '已下架', value: 'offShelf' },
]

const stockStatusOptions: Array<{ label: string; value: MerchantStockStatus }> = [
  { label: '全部库存', value: 'all' },
  { label: '有库存', value: 'inStock' },
  { label: '已售罄', value: 'soldOut' },
]

function formatPrice(price: number) {
  return Number(price).toFixed(2).replace(/\.00$/, '')
}

/** 与 .filter-modal__foot transition 时长一致 */
const FILTER_PANEL_TRANSITION_MS = 280
/** 筛选下拉：吸顶工具栏 + 面板合计占屏高 75% */
const FILTER_PANEL_TOTAL_RATIO = 0.75
const TOOLBAR_HEIGHT_FALLBACK_PX = rpxToPx(160)

const filterZoneTotalPx = computed(() => {
  const win = Taro.getWindowInfo()
  const windowHeight = win.windowHeight ?? 667
  return Math.floor(windowHeight * FILTER_PANEL_TOTAL_RATIO)
})

const toolbarStickyStyle = computed(() => {
  const base = { ...navSearchStickyStyle.value }
  if (!filterModalOpen.value) return base
  return {
    ...base,
    position: 'fixed',
    left: '0',
    right: '0',
    zIndex: '10001',
  }
})

const toolbarPlaceholderStyle = computed(() => ({
  height: `${toolbarHeightPx.value || TOOLBAR_HEIGHT_FALLBACK_PX}px`,
}))

const filterPanelFullHeightPx = computed(() => {
  const navTop = navLayout.value.totalHeight
  const toolbarH = toolbarHeightPx.value || TOOLBAR_HEIGHT_FALLBACK_PX
  const panelTop = navTop + toolbarH
  return Math.max(120, filterZoneTotalPx.value - panelTop)
})

const filterPanelStyle = computed(() => {
  const navTop = navLayout.value.totalHeight
  const toolbarH = toolbarHeightPx.value || TOOLBAR_HEIGHT_FALLBACK_PX
  return {
    top: `${navTop + toolbarH}px`,
    height: `${filterPanelFullHeightPx.value}px`,
  }
})

const filterFootStyle = computed(() => ({
  height: `${panelRevealHeightPx.value}px`,
}))

/** 全屏遮罩，自自定义 Head 下方起至屏幕底（不随模态动画移动） */
const filterMaskStyle = computed(() => ({
  top: `${navLayout.value.totalHeight}px`,
}))

const categoryOptions = computed(() => {
  const options: Array<{ id: string; label: string }> = [{ id: MERCHANT_FILTER_ALL_ID, label: '全部分类' }]
  const hasUncategorized = catalogList.value.some((item) => !item.categoryId)
  if (hasUncategorized) options.push({ id: '__none__', label: '未分类' })
  for (const cat of categories.value) {
    options.push({ id: cat._id, label: cat.name })
  }
  return options
})

const categorySelectableIds = computed(() =>
  categoryOptions.value.filter((item) => item.id !== MERCHANT_FILTER_ALL_ID).map((item) => item.id),
)

const flowerKindSourceList = computed(() => {
  const ids = filters.value.categoryIds
  if (!ids.length) return catalogList.value
  return catalogList.value.filter((item) => {
    if (!item.categoryId) return ids.includes('__none__')
    return ids.includes(item.categoryId)
  })
})

const flowerKindOptions = computed(() => collectFlowerKindOptions(flowerKindSourceList.value))

const flowerKindSelectableIds = computed(() => flowerKindOptions.value.map((item) => item.id))

const flowerVarietyOptions = computed(() =>
  collectFlowerVarietyOptions(flowerKindSourceList.value, filters.value.flowerKindIds),
)

const flowerVarietySelectableIds = computed(() => flowerVarietyOptions.value.map((item) => item.id))

const salesTypeOptions = computed(() => [
  { value: '' as const, label: '全部类型' },
  ...GOODS_SALES_TYPE_OPTIONS.map((item) => ({ value: item.value, label: item.label })),
])

const salesTypeSelectableValues = computed(() =>
  GOODS_SALES_TYPE_OPTIONS.map((item) => item.value),
)

const priceBounds = computed(() => {
  let min = Infinity
  let max = 0
  for (const item of catalogList.value) {
    const price = Number(item.price) || 0
    if (price < min) min = price
    if (price > max) max = price
  }
  if (!Number.isFinite(min) || !catalogList.value.length) {
    return { floor: 0, ceil: 999, step: 1 }
  }
  const floor = Math.floor(min)
  const ceil = Math.max(floor + 1, Math.ceil(max))
  return { floor, ceil, step: 1 }
})

function parseFilterPrice(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const num = Number(trimmed)
  if (Number.isNaN(num) || num < 0) return null
  return num
}

const priceSliderMin = computed(() => {
  const { floor, ceil } = priceBounds.value
  const parsed = parseFilterPrice(filters.value.priceMin)
  if (parsed == null) return floor
  return Math.min(Math.max(parsed, floor), ceil)
})

const priceSliderMax = computed(() => {
  const { floor, ceil } = priceBounds.value
  const parsed = parseFilterPrice(filters.value.priceMax)
  if (parsed == null) return ceil
  return Math.min(Math.max(parsed, floor), ceil)
})

const priceSliderMinLabel = computed(() => formatPrice(priceSliderMin.value))
const priceSliderMaxLabel = computed(() => formatPrice(priceSliderMax.value))

function syncPriceRange(minVal: number, maxVal: number) {
  const { floor, ceil } = priceBounds.value
  const lo = Math.min(minVal, maxVal)
  const hi = Math.max(minVal, maxVal)
  setFilters({
    priceMin: lo <= floor ? '' : String(lo),
    priceMax: hi >= ceil ? '' : String(hi),
  })
}

function onPriceMinChanging(e: { detail: { value: number } }) {
  syncPriceRange(e.detail.value, priceSliderMax.value)
}

function onPriceMinChange(e: { detail: { value: number } }) {
  syncPriceRange(e.detail.value, priceSliderMax.value)
}

function onPriceMaxChanging(e: { detail: { value: number } }) {
  syncPriceRange(priceSliderMin.value, e.detail.value)
}

function onPriceMaxChange(e: { detail: { value: number } }) {
  syncPriceRange(priceSliderMin.value, e.detail.value)
}

const hasActiveFilters = computed(() => {
  const current = filters.value
  const defaults = DEFAULT_MERCHANT_GOODS_FILTER
  return (
    current.shelfStatus !== defaults.shelfStatus
    || current.categoryIds.length > 0
    || current.flowerKindIds.length > 0
    || current.flowerVarietyIds.length > 0
    || current.recommendOnly !== defaults.recommendOnly
    || current.salesTypes.length > 0
    || current.stockStatus !== defaults.stockStatus
    || current.priceMin.trim() !== ''
    || current.priceMax.trim() !== ''
    || current.searchQuery.trim() !== ''
  )
})

const emptyDescription = computed(() => {
  if (filters.value.searchQuery.trim()) return '没有匹配的商品'
  if (hasActiveFilters.value) return '没有符合筛选条件的商品'
  return '还没有商品，点击下方按钮创建'
})

const allVisibleSelected = computed(() =>
  goodsList.value.length > 0 && goodsList.value.every((item) => selectedIds.value.includes(item._id)),
)

const hasBatchSelection = computed(() => selectedIds.value.length > 0)

watch(flowerKindOptions, (options) => {
  const nextKindIds = pruneMerchantMultiFilterIds(
    filters.value.flowerKindIds,
    options.map((item) => item.id),
  )
  const nextVarietyIds = pruneMerchantMultiFilterIds(
    filters.value.flowerVarietyIds,
    collectFlowerVarietyOptions(flowerKindSourceList.value, nextKindIds).map((item) => item.id),
  )
  const kindChanged =
    nextKindIds.length !== filters.value.flowerKindIds.length
    || nextKindIds.some((id, idx) => id !== filters.value.flowerKindIds[idx])
  const varietyChanged =
    nextVarietyIds.length !== filters.value.flowerVarietyIds.length
    || nextVarietyIds.some((id, idx) => id !== filters.value.flowerVarietyIds[idx])
  if (kindChanged || varietyChanged) {
    setFilters({ flowerKindIds: nextKindIds, flowerVarietyIds: nextVarietyIds })
  }
})

watch(flowerVarietyOptions, (options) => {
  const nextVarietyIds = pruneMerchantMultiFilterIds(
    filters.value.flowerVarietyIds,
    options.map((item) => item.id),
  )
  if (
    nextVarietyIds.length !== filters.value.flowerVarietyIds.length
    || nextVarietyIds.some((id, idx) => id !== filters.value.flowerVarietyIds[idx])
  ) {
    setFilters({ flowerVarietyIds: nextVarietyIds })
  }
})

function isSelected(id: string) {
  return selectedIds.value.includes(id)
}

function exitBatchMode() {
  batchMode.value = false
  selectedIds.value = []
}

function toggleBatchMode() {
  if (batchMode.value) {
    exitBatchMode()
    return
  }
  if (filterModalOpen.value) {
    closeFilterModal()
  }
  batchMode.value = true
}

function measureToolbarHeight(): Promise<void> {
  return new Promise((resolve) => {
    Taro.createSelectorQuery()
      .select('#merchant-goods-toolbar')
      .boundingClientRect()
      .exec((res) => {
        const rect = res[0] as Taro.BoundingClientRectCallbackResult | null
        toolbarHeightPx.value = rect?.height ?? TOOLBAR_HEIGHT_FALLBACK_PX
        resolve()
      })
  })
}

function startFilterPanelReveal() {
  panelRevealHeightPx.value = 0
  void nextTick(() => {
    requestAnimationFrame(() => {
      panelRevealHeightPx.value = filterPanelFullHeightPx.value
    })
  })
}

function scrollToolbarToTop(): Promise<void> {
  return new Promise((resolve) => {
    const query = Taro.createSelectorQuery()
    query.select('#merchant-goods-toolbar').boundingClientRect()
    query.selectViewport().scrollOffset()
    query.exec((res) => {
      const rect = res[0] as Taro.BoundingClientRectCallbackResult | null
      const scroll = res[1] as { scrollTop?: number } | null
      if (!rect || rect.top == null) {
        resolve()
        return
      }
      const delta = rect.top - navLayout.value.totalHeight
      if (Math.abs(delta) < 2) {
        resolve()
        return
      }
      const scrollTop = Math.max(0, (scroll?.scrollTop ?? 0) + delta)
      Taro.pageScrollTo({
        scrollTop,
        duration: 200,
        complete: () => resolve(),
        fail: () => resolve(),
      })
    })
  })
}

async function toggleFilterModal() {
  if (filterModalOpen.value) {
    closeFilterModal()
    return
  }
  await openFilterModal()
}

async function openFilterModal() {
  if (batchMode.value) {
    exitBatchMode()
  }
  filterPanelClosing.value = false
  filterModalOpen.value = true
  panelRevealHeightPx.value = 0
  await nextTick()
  await scrollToolbarToTop()
  await measureToolbarHeight()
  startFilterPanelReveal()
}

function closeFilterModal() {
  if (!filterModalOpen.value || filterPanelClosing.value) return
  filterPanelClosing.value = true
  panelRevealHeightPx.value = 0
  setTimeout(() => {
    filterModalOpen.value = false
    filterPanelClosing.value = false
  }, FILTER_PANEL_TRANSITION_MS)
}

function toggleSelect(id: string) {
  if (isSelected(id)) {
    selectedIds.value = selectedIds.value.filter((item) => item !== id)
  } else {
    selectedIds.value = [...selectedIds.value, id]
  }
}

function toggleSelectAll() {
  if (allVisibleSelected.value) {
    const visible = new Set(goodsList.value.map((item) => item._id))
    selectedIds.value = selectedIds.value.filter((id) => !visible.has(id))
    return
  }
  const merged = new Set([...selectedIds.value, ...goodsList.value.map((item) => item._id)])
  selectedIds.value = [...merged]
}

function onCardClick(id: string) {
  if (batchMode.value) {
    toggleSelect(id)
    return
  }
  editGoods(id)
}

function requireSelection(): string[] | null {
  if (!selectedIds.value.length) {
    showToast({ title: '请先选择商品', icon: 'none' })
    return null
  }
  return selectedIds.value
}

async function runQuickBatch(action: GoodsBatchQuickAction) {
  const ids = requireSelection()
  if (!ids) return

  if (action === 'remove') {
    showNotifyConfirm({
      title: '批量删除',
      message: `确定删除选中的 ${ids.length} 件商品？`,
      tone: 'danger',
      confirmText: '确认删除',
      onConfirm: () => {
        void performQuickBatch('remove', ids)
      },
    })
    return
  }

  await performQuickBatch(action, ids)
}

async function performQuickBatch(action: GoodsBatchQuickAction, ids: string[]) {
  batchWorking.value = true
  try {
    if (action === 'remove') {
      await batchRemoveGoods(ids)
      showToast({ title: '已删除', icon: 'success' })
    } else {
      const patch: GoodsBatchPatch = {}
      if (action === 'onShelf') patch.onSale = true
      if (action === 'offShelf') patch.onSale = false
      if (action === 'recommendOn') patch.recommend = true
      if (action === 'recommendOff') patch.recommend = false
      await batchUpdateGoods(ids, patch)
      showToast({ title: '已更新', icon: 'success' })
    }
    selectedIds.value = []
    await loadGoods({ force: true })
  } catch (err) {
    showToast({
      title: err instanceof Error ? err.message : '操作失败',
      icon: 'none',
    })
  } finally {
    batchWorking.value = false
  }
}

function goBatchStockIn() {
  const ids = requireSelection()
  if (!ids) return
  const session = buildSelectStockInSession(ids, catalogList.value)
  if (!session.lines.length) {
    showToast({ title: '所选商品无效', icon: 'none' })
    return
  }
  writeStockInSession(session)
  batchMode.value = false
  selectedIds.value = []
  void navigateToWithFeedback({ url: '/pagesMerchant/goods/stock-in' })
}

/** 粘贴进货单前置页（识别后再进入计数器列表） */
function goStockInImport() {
  void navigateToWithFeedback({ url: '/pagesMerchant/goods/stock-in-import' })
}

function onSearchKeyword(value: string) {
  setFilters({ searchQuery: value.trim(), searchMatchMode: 'auto' })
}

function onPickSuggestion(item: GoodsNameSuggestion) {
  setFilters({ searchQuery: item.name.trim(), searchMatchMode: 'exact' })
}

function statusText(item: Goods) {
  return getMerchantGoodsImageOverlay(item)?.label || ''
}

function statusClass(item: Goods) {
  const kind = getMerchantGoodsImageOverlay(item)?.kind
  if (kind === 'offSale') return 'off'
  if (kind === 'soldOut') return 'sold-out'
  return ''
}

function isCategoryActive(id: string) {
  return isMerchantMultiFilterActive(filters.value.categoryIds, id)
}

function toggleCategory(id: string) {
  const next = toggleMerchantMultiFilter(
    filters.value.categoryIds,
    id,
    categorySelectableIds.value,
  )
  setFilters({ categoryIds: next, flowerKindIds: [], flowerVarietyIds: [] })
}

function isFlowerKindActive(id: string) {
  return isMerchantMultiFilterActive(filters.value.flowerKindIds, id)
}

function toggleFlowerKind(id: string) {
  const next = toggleMerchantMultiFilter(
    filters.value.flowerKindIds,
    id,
    flowerKindSelectableIds.value,
  )
  setFilters({ flowerKindIds: next, flowerVarietyIds: [] })
}

function isFlowerVarietyActive(id: string) {
  return isMerchantMultiFilterActive(filters.value.flowerVarietyIds, id)
}

function toggleFlowerVariety(id: string) {
  const next = toggleMerchantMultiFilter(
    filters.value.flowerVarietyIds,
    id,
    flowerVarietySelectableIds.value,
  )
  setFilters({ flowerVarietyIds: next })
}

function isSalesTypeActive(value: GoodsSalesType | '') {
  return isMerchantSalesTypeActive(filters.value.salesTypes, value)
}

function toggleSalesType(value: GoodsSalesType | '') {
  const next = toggleMerchantSalesTypes(
    filters.value.salesTypes,
    value,
    salesTypeSelectableValues.value,
  )
  setFilters({ salesTypes: next })
}

function pickStockStatus(value: MerchantStockStatus) {
  setFilters({ stockStatus: value })
}

function onResetFilters() {
  keyword.value = ''
  resetFilters()
}

function addGoods() {
  navigateTo({ url: '/pagesMerchant/goods/edit' })
}

function editGoods(id: string) {
  navigateTo({ url: '/pagesMerchant/goods/edit?id=' + id })
}
</script>

<style lang="less">
.page-merchant-goods {
  min-height: 100vh;
  background: #f8f8f8;
  padding-bottom: 160rpx;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  &.has-batch-bar {
    padding-bottom: 360rpx;
  }
}
.manage-toolbar {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 16rpx 24rpx 12rpx;
  background: #fff;
  box-sizing: border-box;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);
  &.is-filter-open {
    box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
  }
}
.manage-toolbar-placeholder {
  flex-shrink: 0;
  width: 100%;
}
.manage-toolbar__bar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16rpx;
  margin-top: 12rpx;
}
.manage-toolbar__count {
  flex-shrink: 0;
  font-size: 24rpx;
  color: #999;
  line-height: 1.4;
  padding-bottom: 6rpx;
}
.manage-toolbar__actions {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12rpx 16rpx;
}
.tool-btn {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 20rpx;
  font-size: 24rpx;
  color: #667eea;
  background: rgba(102, 126, 234, 0.08);
  border-radius: 999rpx;
  box-sizing: border-box;
  &.is-active {
    color: #fff;
    background: #667eea;
    .tool-btn__count {
      color: #fff;
      background: rgba(255, 255, 255, 0.22);
    }
  }
  &--filter {
    padding-right: 12rpx;
  }
}
.tool-btn__label {
  flex-shrink: 0;
}
.tool-btn__count {
  flex-shrink: 0;
  min-width: 32rpx;
  padding: 0 10rpx;
  font-size: 22rpx;
  font-weight: 600;
  line-height: 32rpx;
  text-align: center;
  color: #667eea;
  background: rgba(102, 126, 234, 0.18);
  border-radius: 999rpx;
  box-sizing: border-box;
}
.tool-btn--active {
  opacity: 0.7;
}
.filter-modal {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  pointer-events: none;
}
.filter-modal__mask {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  pointer-events: auto;
}
.filter-modal__panel {
  position: fixed;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  overflow: visible;
  pointer-events: auto;
  z-index: 1;
  background: transparent;
}
.filter-modal__foot {
  flex: none;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
  border-radius: 0 0 24rpx 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.1);
  transition: height 0.28s cubic-bezier(0.32, 0.72, 0, 1);
  &.is-closing {
    transition-timing-function: cubic-bezier(0.33, 1, 0.68, 1);
  }
}
.filter-modal__reveal {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.filter-modal__scroll {
  height: 100%;
  width: 100%;
  box-sizing: border-box;
}
.filter-modal__actions {
  flex-shrink: 0;
  display: flex;
  gap: 16rpx;
  padding: 16rpx 24rpx;
  border-top: 1rpx solid #f0f0f0;
  background: #fff;
  box-sizing: border-box;
}
.filter-modal__btn {
  flex: 1;
  height: 88rpx;
  border-radius: 48rpx;
  font-size: 30rpx;
}
.filter-form {
  padding: 16rpx 24rpx 32rpx;
  box-sizing: border-box;
}
.filter-section {
  padding-bottom: 20rpx;
  &--price {
    .filter-section__label {
      margin-bottom: 12rpx;
    }
  }
  &--switch {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16rpx;
    padding-bottom: 8rpx;
    .filter-section__label {
      margin-bottom: 0;
    }
  }
}
.filter-section__label {
  margin-bottom: 12rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
  &--sub {
    margin-top: 16rpx;
  }
}
.filter-chips {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 12rpx 16rpx;
}
.filter-chip {
  flex: none;
  padding: 12rpx 20rpx;
  font-size: 24rpx;
  line-height: 1.2;
  color: #666;
  background: #f5f5f5;
  border: 2rpx solid #eee;
  border-radius: 999rpx;
  box-sizing: border-box;
  &.active {
    color: #667eea;
    font-weight: 600;
    background: rgba(102, 126, 234, 0.1);
    border-color: rgba(102, 126, 234, 0.35);
  }
}
.filter-empty-hint {
  font-size: 24rpx;
  color: #bbb;
}
.price-slider-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  &__sep {
    color: #bbb;
    font-weight: 400;
  }
}
.price-slider-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 8rpx;
  &__label {
    flex-shrink: 0;
    width: 56rpx;
    font-size: 24rpx;
    color: #999;
  }
}
.price-slider {
  flex: 1;
  min-width: 0;
  margin: 0;
}
.filter-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12rpx;
}
.result-count {
  font-size: 24rpx;
  color: #999;
}
.reset-btn {
  font-size: 24rpx;
  color: #667eea;
}
.goods-body {
  padding: 16rpx;
}
.goods-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}
.goods-card {
  position: relative;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  border: 2rpx solid transparent;
  &.selected {
    border-color: #667eea;
  }
}
.select-badge {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  z-index: 2;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #fff;
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  font-size: 24rpx;
  line-height: 36rpx;
  text-align: center;
  &.checked {
    background: #667eea;
    border-color: #667eea;
  }
}
.img-wrap {
  position: relative;
  overflow: hidden;
}
.goods-img {
  width: 100%;
  height: 280rpx;
  background: #f0f0f0;
}
.status-badge {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  padding: 4rpx 12rpx;
  font-size: 20rpx;
  color: #fff;
  background: rgba(102, 126, 234, 0.9);
  border-radius: 8rpx;
  &.off {
    background: rgba(0, 0, 0, 0.45);
  }
  &.sold-out {
    background: rgba(0, 0, 0, 0.55);
  }
}
.batch-mode .status-badge {
  left: 56rpx;
}
.goods-name {
  padding: 12rpx 16rpx 4rpx;
  font-size: 26rpx;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.goods-category {
  padding: 0 16rpx 4rpx;
  font-size: 20rpx;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.goods-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16rpx 16rpx;
}
.goods-price {
  font-size: 28rpx;
  font-weight: 600;
  color: #e53935;
}
.goods-stock {
  font-size: 22rpx;
  color: #999;
}
.fab-wrap {
  position: fixed;
  left: 32rpx;
  right: 32rpx;
  bottom: calc(48rpx + env(safe-area-inset-bottom));
  z-index: 100;
  box-sizing: border-box;
  max-width: calc(100vw - 64rpx);
}
.fab-btn {
  width: 100%;
  max-width: 100%;
  height: 96rpx;
  border-radius: 48rpx;
  font-size: 30rpx;
  box-sizing: border-box;
}
.batch-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 120;
  background: #fff;
  border-top: 2rpx solid #eee;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
}
.batch-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
.batch-count {
  font-size: 26rpx;
  color: #333;
  font-weight: 600;
}
.batch-link {
  font-size: 24rpx;
  color: #667eea;
  padding: 8rpx 0 8rpx 16rpx;
}
.batch-link--active {
  opacity: 0.7;
}
.batch-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx 16rpx;
}
.batch-action {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: 12rpx 24rpx;
  font-size: 24rpx;
  color: #667eea;
  background: rgba(102, 126, 234, 0.08);
  border-radius: 999rpx;
  &.danger {
    color: #e53935;
    background: rgba(229, 57, 53, 0.08);
  }
  &.is-disabled {
    opacity: 0.38;
    pointer-events: none;
  }
}
.batch-action--active {
  opacity: 0.7;
}
</style>
