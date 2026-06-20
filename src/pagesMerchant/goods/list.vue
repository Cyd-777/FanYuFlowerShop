<template>
  <view class="page-merchant-goods" :class="{ 'batch-mode': batchMode, 'has-batch-bar': batchMode }">
    <view class="toolbar">
      <GoodsNameTypeahead
        v-model="keyword"
        :catalog="catalogList"
        placeholder="搜索商品名称..."
        @search="onSearchKeyword"
        @select="onPickSuggestion"
      />
      <view class="toolbar-actions">
        <view class="exact-toggle">
          <text class="exact-label">精确匹配</text>
          <nut-switch v-model="filters.nameKeywordExact" />
        </view>
        <view class="link-btn" hover-class="link-btn--active" @tap.stop="goStockInImport">
          进货单入库
        </view>
        <view class="link-btn" hover-class="link-btn--active" @tap.stop="toggleBatchMode">
          {{ batchMode ? '退出批量' : '批量管理' }}
        </view>
      </view>
    </view>

    <view class="filter-panel">
      <view class="status-tabs">
        <view
          v-for="tab in shelfTabs"
          :key="tab.value"
          class="status-tab"
          :class="{ active: filters.shelfStatus === tab.value }"
          @click="setFilters({ shelfStatus: tab.value })"
        >
          {{ tab.label }}
        </view>
      </view>

      <view class="filter-form">
        <view class="filter-row">
          <text class="filter-label">商品分类</text>
          <picker
            class="filter-picker"
            :range="categoryLabels"
            :value="categoryIndex"
            @change="onCategoryChange"
          >
            <view class="filter-value">{{ categoryLabels[categoryIndex] }}</view>
          </picker>
        </view>

        <view class="filter-row">
          <text class="filter-label">花材种类</text>
          <picker
            class="filter-picker"
            :range="flowerKindLabels"
            :value="flowerKindIndex"
            :disabled="!flowerKindOptions.length"
            @change="onFlowerKindChange"
          >
            <view class="filter-value" :class="{ muted: !flowerKindOptions.length }">
              {{ flowerKindLabels[flowerKindIndex] }}
            </view>
          </picker>
        </view>

        <view class="filter-row">
          <text class="filter-label">花卉品种</text>
          <picker
            class="filter-picker"
            :range="flowerVarietyLabels"
            :value="flowerVarietyIndex"
            :disabled="!flowerVarietyOptions.length"
            @change="onFlowerVarietyChange"
          >
            <view class="filter-value" :class="{ muted: !flowerVarietyOptions.length }">
              {{ flowerVarietyLabels[flowerVarietyIndex] }}
            </view>
          </picker>
        </view>

        <view class="filter-row">
          <text class="filter-label">销售类型</text>
          <picker
            class="filter-picker"
            :range="salesTypeLabels"
            :value="salesTypeIndex"
            @change="onSalesTypeChange"
          >
            <view class="filter-value">{{ salesTypeLabels[salesTypeIndex] }}</view>
          </picker>
        </view>

        <view class="filter-row">
          <text class="filter-label">库存状态</text>
          <picker
            class="filter-picker"
            :range="stockStatusLabels"
            :value="stockStatusIndex"
            @change="onStockStatusChange"
          >
            <view class="filter-value">{{ stockStatusLabels[stockStatusIndex] }}</view>
          </picker>
        </view>

        <view class="filter-row filter-row--price">
          <text class="filter-label">价格区间</text>
          <view class="price-range">
            <input
              class="price-input"
              v-model="filters.priceMin"
              type="digit"
              placeholder="最低价"
            />
            <text class="price-sep">—</text>
            <input
              class="price-input"
              v-model="filters.priceMax"
              type="digit"
              placeholder="最高价"
            />
          </view>
        </view>

        <view class="filter-row filter-row--switch">
          <text class="filter-label">只显示推荐</text>
          <nut-switch v-model="filters.recommendOnly" />
        </view>

        <view class="filter-actions">
          <text class="result-count">共 {{ goodsList.length }} 件</text>
          <text class="reset-btn" @click="onResetFilters">重置筛选</text>
        </view>
      </view>
    </view>

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
            <GoodsNewListingBadge :goods="item" />
            <view v-if="statusText(item)" class="status-badge" :class="statusClass(item)">
              {{ statusText(item) }}
            </view>
            <view v-if="item.recommend" class="recommend-badge">推荐</view>
          </view>
          <view class="goods-name">{{ item.name }}</view>
          <view class="goods-category">{{ item.categoryName || '未分类' }}</view>
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
        <text class="batch-link" @click="toggleSelectAll">
          {{ allVisibleSelected ? '取消全选' : '全选当前' }}
        </text>
      </view>
      <view class="batch-actions">
        <view class="batch-action" hover-class="batch-action--active" @tap.stop="runQuickBatch('onShelf')">上架</view>
        <view class="batch-action" hover-class="batch-action--active" @tap.stop="runQuickBatch('offShelf')">下架</view>
        <view class="batch-action" hover-class="batch-action--active" @tap.stop="runQuickBatch('recommendOn')">设推荐</view>
        <view class="batch-action" hover-class="batch-action--active" @tap.stop="runQuickBatch('recommendOff')">取消推荐</view>
        <!-- TODO: 批量修改弹层待格式确定后恢复（MerchantGoodsBatchEditSheet） -->
        <view class="batch-action" hover-class="batch-action--active" @tap.stop="goBatchStockIn">批量入库</view>
        <view class="batch-action danger" hover-class="batch-action--active" @tap.stop="runQuickBatch('remove')">删除</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
  isFlowerKindInOptions,
} from '@/utils/goodsListFilter'
import type { MerchantShelfStatus, MerchantStockStatus } from '@/utils/goodsListFilter'
import { buildSelectStockInSession, writeStockInSession } from '@/utils/stockInSession'
import type { GoodsBatchPatch, GoodsBatchQuickAction } from '@/types/goodsBatch'
import {
  GOODS_SALES_TYPE_OPTIONS,
  type Goods,
  type GoodsSalesType,
} from '@/types/goods'
import { isGoodsSoldOut } from '@/utils/goodsAvailability'
import GoodsCardSkeleton from '@/components/GoodsCardSkeleton.vue'
import GoodsImage from '@/components/GoodsImage.vue'
import GoodsNewListingBadge from '@/components/GoodsNewListingBadge.vue'
import GoodsNameTypeahead from '@/components/GoodsNameTypeahead.vue'
import type { GoodsNameSuggestion } from '@/utils/goodsNameSuggest'

const keyword = ref('')
const batchMode = ref(false)
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

const categoryOptions = computed(() => {
  const options: Array<{ id: string; label: string }> = [{ id: '', label: '全部分类' }]
  const hasUncategorized = catalogList.value.some((item) => !item.categoryId)
  if (hasUncategorized) options.push({ id: '__none__', label: '未分类' })
  for (const cat of categories.value) {
    options.push({ id: cat._id, label: cat.name })
  }
  return options
})

const categoryLabels = computed(() => categoryOptions.value.map((item) => item.label))
const categoryIndex = computed(() => {
  const idx = categoryOptions.value.findIndex((item) => item.id === filters.value.categoryId)
  return idx >= 0 ? idx : 0
})

const flowerKindSourceList = computed(() => {
  const categoryId = filters.value.categoryId
  if (!categoryId) return catalogList.value
  if (categoryId === '__none__') return catalogList.value.filter((item) => !item.categoryId)
  return catalogList.value.filter((item) => item.categoryId === categoryId)
})

const flowerKindOptions = computed(() => collectFlowerKindOptions(flowerKindSourceList.value))
const flowerKindLabels = computed(() => {
  if (!flowerKindOptions.value.length) return ['暂无花材']
  return ['全部花材', ...flowerKindOptions.value.map((item) => item.name)]
})
const flowerKindIndex = computed(() => {
  if (!flowerKindOptions.value.length) return 0
  const idx = flowerKindOptions.value.findIndex((item) => item.id === filters.value.flowerKindId)
  return idx >= 0 ? idx + 1 : 0
})

const flowerVarietyOptions = computed(() =>
  collectFlowerVarietyOptions(flowerKindSourceList.value, filters.value.flowerKindId),
)
const flowerVarietyLabels = computed(() => {
  if (!flowerVarietyOptions.value.length) return ['暂无品种']
  return ['全部品种', ...flowerVarietyOptions.value.map((item) => item.name)]
})
const flowerVarietyIndex = computed(() => {
  if (!flowerVarietyOptions.value.length) return 0
  const idx = flowerVarietyOptions.value.findIndex(
    (item) => item.id === filters.value.flowerVarietyId,
  )
  return idx >= 0 ? idx + 1 : 0
})

const salesTypeOptions = computed(() => [
  { value: '' as const, label: '全部类型' },
  ...GOODS_SALES_TYPE_OPTIONS.map((item) => ({ value: item.value, label: item.label })),
])
const salesTypeLabels = computed(() => salesTypeOptions.value.map((item) => item.label))
const salesTypeIndex = computed(() => {
  const idx = salesTypeOptions.value.findIndex((item) => item.value === filters.value.salesType)
  return idx >= 0 ? idx : 0
})

const stockStatusLabels = computed(() => stockStatusOptions.map((item) => item.label))
const stockStatusIndex = computed(() => {
  const idx = stockStatusOptions.findIndex((item) => item.value === filters.value.stockStatus)
  return idx >= 0 ? idx : 0
})

const hasActiveFilters = computed(() => {
  const current = filters.value
  const defaults = DEFAULT_MERCHANT_GOODS_FILTER
  return (
    current.shelfStatus !== defaults.shelfStatus
    || current.categoryId !== defaults.categoryId
    || current.flowerKindId !== defaults.flowerKindId
    || current.flowerVarietyId !== defaults.flowerVarietyId
    || current.recommendOnly !== defaults.recommendOnly
    || current.salesType !== defaults.salesType
    || current.stockStatus !== defaults.stockStatus
    || current.priceMin.trim() !== ''
    || current.priceMax.trim() !== ''
    || current.nameKeyword.trim() !== ''
    || current.nameKeywordExact !== defaults.nameKeywordExact
  )
})

const emptyDescription = computed(() => {
  if (filters.value.nameKeyword.trim()) return '没有匹配的商品'
  if (hasActiveFilters.value) return '没有符合筛选条件的商品'
  return '还没有商品，点击下方按钮创建'
})

const allVisibleSelected = computed(() =>
  goodsList.value.length > 0 && goodsList.value.every((item) => selectedIds.value.includes(item._id)),
)

watch(flowerKindOptions, (options) => {
  if (!isFlowerKindInOptions(filters.value.flowerKindId, options)) {
    setFilters({ flowerKindId: '', flowerVarietyId: '' })
  }
})

watch(flowerVarietyOptions, (options) => {
  const id = filters.value.flowerVarietyId
  if (!id) return
  if (!options.some((item) => item.id === id)) {
    setFilters({ flowerVarietyId: '' })
  }
})

function isSelected(id: string) {
  return selectedIds.value.includes(id)
}

function toggleBatchMode() {
  batchMode.value = !batchMode.value
  if (!batchMode.value) selectedIds.value = []
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
    wx.showToast({ title: '请先选择商品', icon: 'none' })
    return null
  }
  return selectedIds.value
}

async function runQuickBatch(action: GoodsBatchQuickAction) {
  const ids = requireSelection()
  if (!ids) return

  if (action === 'remove') {
    const { confirm } = await new Promise<{ confirm: boolean }>((resolve) => {
      wx.showModal({
        title: '批量删除',
        content: `确定删除选中的 ${ids.length} 件商品？`,
        confirmColor: '#e53935',
        success: (res) => resolve({ confirm: res.confirm }),
      })
    })
    if (!confirm) return
  }

  batchWorking.value = true
  try {
    if (action === 'remove') {
      await batchRemoveGoods(ids)
      wx.showToast({ title: '已删除', icon: 'success' })
    } else {
      const patch: GoodsBatchPatch = {}
      if (action === 'onShelf') patch.onSale = true
      if (action === 'offShelf') patch.onSale = false
      if (action === 'recommendOn') patch.recommend = true
      if (action === 'recommendOff') patch.recommend = false
      await batchUpdateGoods(ids, patch)
      wx.showToast({ title: '已更新', icon: 'success' })
    }
    selectedIds.value = []
    await loadGoods({ force: true })
  } catch (err) {
    wx.showToast({
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
    wx.showToast({ title: '所选商品无效', icon: 'none' })
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
  setFilters({ nameKeyword: value.trim() })
}

function onPickSuggestion(item: GoodsNameSuggestion) {
  keyword.value = item.name
  setFilters({ nameKeyword: item.name.trim() })
}

function formatPrice(price: number) {
  return Number(price).toFixed(2).replace(/\.00$/, '')
}

function statusText(item: Goods) {
  if (!item.onSale) return '下架'
  if (isGoodsSoldOut(item)) return '售罄'
  return ''
}

function statusClass(item: Goods) {
  if (!item.onSale) return 'off'
  if (isGoodsSoldOut(item)) return 'sold-out'
  return ''
}

function onCategoryChange(event: { detail: { value: string } }) {
  const index = Number(event.detail.value)
  const option = categoryOptions.value[index]
  setFilters({ categoryId: option?.id || '', flowerKindId: '', flowerVarietyId: '' })
}

function onFlowerKindChange(event: { detail: { value: string } }) {
  if (!flowerKindOptions.value.length) return
  const index = Number(event.detail.value)
  if (index <= 0) {
    setFilters({ flowerKindId: '', flowerVarietyId: '' })
    return
  }
  const option = flowerKindOptions.value[index - 1]
  setFilters({ flowerKindId: option?.id || '', flowerVarietyId: '' })
}

function onFlowerVarietyChange(event: { detail: { value: string } }) {
  if (!flowerVarietyOptions.value.length) return
  const index = Number(event.detail.value)
  if (index <= 0) {
    setFilters({ flowerVarietyId: '' })
    return
  }
  const option = flowerVarietyOptions.value[index - 1]
  setFilters({ flowerVarietyId: option?.id || '' })
}

function onSalesTypeChange(event: { detail: { value: string } }) {
  const index = Number(event.detail.value)
  const option = salesTypeOptions.value[index]
  setFilters({ salesType: (option?.value || '') as GoodsSalesType | '' })
}

function onStockStatusChange(event: { detail: { value: string } }) {
  const index = Number(event.detail.value)
  const option = stockStatusOptions[index]
  setFilters({ stockStatus: option?.value || 'all' })
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
  &.has-batch-bar {
    padding-bottom: 360rpx;
  }
}
.toolbar {
  flex-shrink: 0;
  padding: 16rpx;
  background: #fff;
  position: relative;
  z-index: 201;
}
.toolbar-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-top: 12rpx;
  flex-wrap: wrap;
  position: relative;
  z-index: 202;
}
.exact-toggle {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.exact-label {
  font-size: 24rpx;
  color: #666;
}
.link-btn {
  font-size: 24rpx;
  color: #667eea;
  padding: 8rpx 0;
}
.link-btn--active {
  opacity: 0.65;
}
.filter-panel {
  flex-shrink: 0;
  background: #fff;
  border-bottom: 2rpx solid #f0f0f0;
}
.status-tabs {
  display: flex;
  border-bottom: 2rpx solid #f0f0f0;
}
.status-tab {
  flex: 1;
  padding: 20rpx 0;
  font-size: 26rpx;
  color: #666;
  text-align: center;
  border-bottom: 4rpx solid transparent;
  &.active {
    color: #667eea;
    font-weight: 600;
    border-bottom-color: #667eea;
  }
}
.filter-form {
  padding: 8rpx 24rpx 16rpx;
}
.filter-row {
  display: flex;
  align-items: center;
  min-height: 72rpx;
  border-bottom: 1rpx solid #f5f5f5;
  &--price {
    align-items: center;
  }
  &--switch {
    border-bottom: none;
  }
}
.filter-label {
  width: 160rpx;
  flex-shrink: 0;
  font-size: 26rpx;
  color: #666;
}
.filter-picker {
  flex: 1;
  min-width: 0;
}
.filter-value {
  font-size: 26rpx;
  color: #333;
  text-align: right;
  padding: 8rpx 0;
  &::after {
    content: ' ›';
    color: #bbb;
  }
  &.muted {
    color: #bbb;
  }
}
.price-range {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12rpx;
}
.price-input {
  width: 160rpx;
  height: 56rpx;
  padding: 0 16rpx;
  font-size: 26rpx;
  color: #333;
  text-align: center;
  background: #f5f5f5;
  border-radius: 8rpx;
  box-sizing: border-box;
}
.price-sep {
  font-size: 24rpx;
  color: #bbb;
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
.recommend-badge {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  padding: 4rpx 12rpx;
  font-size: 20rpx;
  color: #fff;
  background: rgba(229, 57, 53, 0.9);
  border-radius: 8rpx;
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
  bottom: 48rpx;
  z-index: 100;
}
.fab-btn {
  width: 100%;
  height: 96rpx;
  border-radius: 48rpx;
  font-size: 30rpx;
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
}
.batch-action--active {
  opacity: 0.7;
}
</style>
