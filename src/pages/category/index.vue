<template>
  <view class="page-category">
    <view class="search-bar">
      <input
        class="search-input"
        v-model="keyword"
        :placeholder="searchPlaceholder"
        confirm-type="search"
        @confirm="onSearch"
      />
    </view>
    <view class="content">
      <scroll-view class="left" scroll-y>
        <view
          class="left-item customize-entry"
          :class="{ active: activeIdx === -1 }"
          @click="showCustomizePanel"
        >
          ✨ 定制花束
        </view>
        <view
          v-for="(tab, idx) in tabs"
          :key="tab.key"
          :class="['left-item', { active: idx === activeIdx }]"
          @click="switchCategory(idx)"
        >
          {{ tab.name }}
        </view>
      </scroll-view>
      <scroll-view class="right" scroll-y>
        <view v-if="activeIdx === -1" class="customize-panel">
          <view class="customize-title">定制花束</view>
          <view class="customize-desc">
            花材为所有按支售卖的商品；包装与贺卡从对应分类中选择，填写留言后提交订单。
          </view>
          <nut-button type="primary" @click="goCustomize">开始定制</nut-button>
        </view>
        <template v-else>
        <view class="right-title">{{ tabs[activeIdx]?.name }}</view>
        <GoodsCardSkeleton v-if="loading" variant="row" :count="5" />
        <template v-else>
          <view
            v-for="item in goodsList"
            :key="item._id"
            class="goods-item"
            :class="{ 'is-sold-out': item.stock <= 0 }"
            @click="goDetail(item._id)"
          >
            <view class="thumb-wrap">
              <GoodsImage :src="item.imageUrl" root-class="thumb" />
              <GoodsSoldOutBadge :stock="item.stock" :on-sale="item.onSale" />
            </view>
            <view class="info">
              <view class="name">{{ item.name }}</view>
              <view class="price">¥{{ formatPrice(item.price) }}</view>
            </view>
          </view>
          <view v-if="!goodsList.length" class="empty-tip">{{ emptyText }}</view>
        </template>
        </template>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDidShow, useLoad, usePullDownRefresh } from '@tarojs/taro'
import { navigateTo } from '@/utils/router'
import { usePublicGoods } from '@/composables/usePublicGoods'
import { usePublicCategories } from '@/composables/usePublicCategories'
import GoodsCardSkeleton from '@/components/GoodsCardSkeleton.vue'
import GoodsImage from '@/components/GoodsImage.vue'
import GoodsSoldOutBadge from '@/components/GoodsSoldOutBadge.vue'

const keyword = ref('')
const searchPlaceholder = '搜索花束...'
const emptyText = '暂无商品'
const activeIdx = ref(0)
const { categories, loadCategories } = usePublicCategories()
const { goodsList, loading, setCategory, loadGoods } = usePublicGoods()

const tabs = computed(() => [
  { key: 'all', name: '全部', categoryId: '' },
  ...categories.value.map((item) => ({
    key: item._id,
    name: item.name,
    categoryId: item._id,
  })),
])

useLoad(() => {
  void refreshPage()
})

useDidShow(() => {
  void refreshPage()
})

usePullDownRefresh(() => {
  void refreshPage(true).finally(() => {
    wx.stopPullDownRefresh()
  })
})

async function refreshPage(force = false) {
  await loadCategories({ force })
  await reloadGoods(force)
}

function formatPrice(price: number) {
  return Number(price).toFixed(2).replace(/\.00$/, '')
}

function switchCategory(idx: number) {
  activeIdx.value = idx
  const current = tabs.value[idx]
  setCategory(current?.categoryId || '')
  void reloadGoods()
}

function showCustomizePanel() {
  activeIdx.value = -1
}

function goCustomize() {
  navigateTo({ url: '/pagesCustomer/customize/index' })
}

function reloadGoods(force = false) {
  if (activeIdx.value < 0) return Promise.resolve()
  const current = tabs.value[activeIdx.value]
  return loadGoods('', current?.categoryId || '', { force })
}

function onSearch() {
  if (keyword.value) {
    navigateTo({ url: '/pagesCustomer/goods/list?keyword=' + encodeURIComponent(keyword.value) })
  }
}

function goDetail(id: string) {
  navigateTo({ url: '/pagesCustomer/goods/detail?id=' + id })
}
</script>

<style lang="less">
@import '@/styles/tokens.less';

.page-category {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: @color-bg-page;
}
.search-bar {
  padding: 16rpx 24rpx;
  background: @color-bg-card;
}
.search-input {
  height: 72rpx;
  padding: 0 24rpx;
  border-radius: 36rpx;
  background: @color-bg-muted;
  font-size: @font-size-md;
}
.content {
  flex: 1;
  display: flex;
  overflow: hidden;
}
.left {
  width: 180rpx;
  background: #fff;
}
.left-item {
  padding: 28rpx 24rpx;
  font-size: 26rpx;
  color: #666;
  text-align: center;
  border-left: 4rpx solid transparent;
  &.active {
    color: @color-primary;
    border-left-color: @color-primary;
    background: @color-primary-light;
    font-weight: 600;
  }
}
.customize-entry { font-size: 24rpx; }
.customize-panel {
  padding: 48rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
}
.customize-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}
.customize-desc {
  margin: 16rpx 0 32rpx;
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
}
.right {
  flex: 1;
  padding: 24rpx;
}
.right-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
}
.goods-item {
  display: flex;
  background: #fff;
  border-radius: 12rpx;
  padding: 16rpx;
  margin-bottom: 16rpx;
  &.is-sold-out .thumb {
    opacity: 0.72;
  }
  .thumb-wrap {
    position: relative;
    flex-shrink: 0;
  }
  .thumb {
    width: 160rpx;
    height: 160rpx;
    border-radius: 8rpx;
    background: #f0f0f0;
    flex-shrink: 0;
  }
  .info {
    margin-left: 16rpx;
    flex: 1;
  }
  .name {
    font-size: 26rpx;
    color: #333;
  }
  .price {
    margin-top: 8rpx;
    font-size: 28rpx;
    font-weight: 600;
    color: @color-primary;
  }
}
.empty-tip {
  padding: 48rpx 0;
  text-align: center;
  font-size: @font-size-md;
  color: @color-text-tertiary;
}
</style>
