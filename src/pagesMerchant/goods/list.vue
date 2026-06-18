<template>
  <view class="page-merchant-goods">
    <view class="toolbar">
      <GoodsNameTypeahead
        v-model="keyword"
        :catalog="catalogList"
        placeholder="搜索商品名称..."
        @search="onSearchKeyword"
        @select="onPickSuggestion"
      />
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
          @click="editGoods(item._id)"
        >
          <view class="img-wrap">
            <GoodsImage :src="item.imageUrl" root-class="goods-img" />
            <view class="status-badge" :class="statusClass(item)">
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

    <view class="fab-wrap">
      <nut-button type="primary" class="fab-btn" @click="addGoods">+ 新建商品</nut-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDidShow } from '@tarojs/taro'
import { navigateTo } from '@/utils/router'
import { useMerchantGoods } from '@/composables/useMerchantGoods'
import { useMerchantCategories } from '@/composables/useMerchantCategories'
import {
  collectFlowerKindOptions,
  DEFAULT_MERCHANT_GOODS_FILTER,
  isFlowerKindInOptions,
} from '@/utils/goodsListFilter'
import type { MerchantShelfStatus } from '@/utils/goodsListFilter'
import {
  GOODS_SALES_TYPE_OPTIONS,
  type Goods,
  type GoodsSalesType,
} from '@/types/goods'
import { isGoodsSoldOut } from '@/utils/goodsAvailability'
import GoodsCardSkeleton from '@/components/GoodsCardSkeleton.vue'
import GoodsImage from '@/components/GoodsImage.vue'
import GoodsNameTypeahead from '@/components/GoodsNameTypeahead.vue'
import type { GoodsNameSuggestion } from '@/utils/goodsNameSuggest'

const keyword = ref('')

const shelfTabs: Array<{ label: string; value: MerchantShelfStatus }> = [
  { label: '全部', value: 'all' },
  { label: '已上架', value: 'onShelf' },
  { label: '已下架', value: 'offShelf' },
]

const {
  goodsList,
  catalogList,
  loading,
  filters,
  setFilters,
  resetFilters,
  loadGoods,
} = useMerchantGoods()
const { categories, loadCategories } = useMerchantCategories()

const categoryOptions = computed(() => {
  const options: Array<{ id: string; label: string }> = [
    { id: '', label: '全部分类' },
  ]
  const hasUncategorized = catalogList.value.some((item) => !item.categoryId)
  if (hasUncategorized) {
    options.push({ id: '__none__', label: '未分类' })
  }
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
  if (categoryId === '__none__') {
    return catalogList.value.filter((item) => !item.categoryId)
  }
  return catalogList.value.filter((item) => item.categoryId === categoryId)
})

const flowerKindOptions = computed(() =>
  collectFlowerKindOptions(flowerKindSourceList.value),
)

const flowerKindLabels = computed(() => {
  if (!flowerKindOptions.value.length) return ['暂无花材']
  return ['全部花材', ...flowerKindOptions.value.map((item) => item.name)]
})

const flowerKindIndex = computed(() => {
  if (!flowerKindOptions.value.length) return 0
  const idx = flowerKindOptions.value.findIndex(
    (item) => item.id === filters.value.flowerKindId,
  )
  return idx >= 0 ? idx + 1 : 0
})

const salesTypeOptions = computed(() => [
  { value: '' as const, label: '全部类型' },
  ...GOODS_SALES_TYPE_OPTIONS.map((item) => ({
    value: item.value,
    label: item.label,
  })),
])

const salesTypeLabels = computed(() => salesTypeOptions.value.map((item) => item.label))

const salesTypeIndex = computed(() => {
  const idx = salesTypeOptions.value.findIndex(
    (item) => item.value === filters.value.salesType,
  )
  return idx >= 0 ? idx : 0
})

const hasActiveFilters = computed(() => {
  const current = filters.value
  const defaults = DEFAULT_MERCHANT_GOODS_FILTER
  return (
    current.shelfStatus !== defaults.shelfStatus
    || current.categoryId !== defaults.categoryId
    || current.flowerKindId !== defaults.flowerKindId
    || current.recommendOnly !== defaults.recommendOnly
    || current.salesType !== defaults.salesType
    || current.priceMin.trim() !== ''
    || current.priceMax.trim() !== ''
    || current.nameKeyword.trim() !== ''
  )
})

const emptyDescription = computed(() => {
  if (filters.value.nameKeyword.trim()) return '没有匹配的商品'
  if (hasActiveFilters.value) return '没有符合筛选条件的商品'
  return '还没有商品，点击下方按钮创建'
})

watch(flowerKindOptions, (options) => {
  if (!isFlowerKindInOptions(filters.value.flowerKindId, options)) {
    setFilters({ flowerKindId: '' })
  }
})

useDidShow(() => {
  void Promise.all([
    loadCategories(),
    loadGoods(),
  ])
})

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
  return '在售'
}

function statusClass(item: Goods) {
  if (!item.onSale) return 'off'
  if (isGoodsSoldOut(item)) return 'sold-out'
  return 'on'
}

function onCategoryChange(event: { detail: { value: string } }) {
  const index = Number(event.detail.value)
  const option = categoryOptions.value[index]
  setFilters({
    categoryId: option?.id || '',
    flowerKindId: '',
  })
}

function onFlowerKindChange(event: { detail: { value: string } }) {
  if (!flowerKindOptions.value.length) return
  const index = Number(event.detail.value)
  if (index <= 0) {
    setFilters({ flowerKindId: '' })
    return
  }
  const option = flowerKindOptions.value[index - 1]
  setFilters({ flowerKindId: option?.id || '' })
}

function onSalesTypeChange(event: { detail: { value: string } }) {
  const index = Number(event.detail.value)
  const option = salesTypeOptions.value[index]
  setFilters({ salesType: (option?.value || '') as GoodsSalesType | '' })
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
}
.toolbar {
  flex-shrink: 0;
  padding: 16rpx;
  background: #fff;
  position: relative;
  z-index: 201;
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
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
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
</style>
