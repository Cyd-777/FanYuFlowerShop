<template>
  <view class="page-goods-list">
    <nut-searchbar
      v-model="keyword"
      placeholder="搜索花束..."
      @search="reloadGoods"
      @clear="reloadGoods"
    />
    <view v-if="categoryName" class="filter-tip">分类：{{ categoryName }}</view>
    <GoodsCardSkeleton v-if="loading" :count="6" />
    <view v-else class="goods-grid">
      <view
        v-for="item in goodsList"
        :key="item._id"
        class="goods-card"
        :class="{ 'is-sold-out': item.stock <= 0 }"
        @click="goDetail(item._id)"
      >
        <view class="goods-img-wrap">
          <GoodsImage :src="item.imageUrl" root-class="goods-img" />
          <GoodsSoldOutBadge :stock="item.stock" :on-sale="item.onSale" />
        </view>
        <view class="goods-name">{{ item.name }}</view>
        <view class="goods-price">¥{{ formatPrice(item.price) }}</view>
      </view>
    </view>
    <nut-empty v-if="!loading && !goodsList.length" description="暂无商品" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useDidShow, useLoad } from '@tarojs/taro'
import { navigateTo } from '@/utils/router'
import { usePublicGoods } from '@/composables/usePublicGoods'
import { usePublicCategories } from '@/composables/usePublicCategories'
import GoodsCardSkeleton from '@/components/GoodsCardSkeleton.vue'
import GoodsImage from '@/components/GoodsImage.vue'
import GoodsSoldOutBadge from '@/components/GoodsSoldOutBadge.vue'

const keyword = ref('')
const categoryId = ref('')
const categoryName = ref('')
const { goodsList, loading, loadGoods } = usePublicGoods()
const { categories, loadCategories } = usePublicCategories()

useLoad((options) => {
  keyword.value = options?.keyword ? decodeURIComponent(options.keyword) : ''
  categoryId.value = options?.categoryId ? decodeURIComponent(options.categoryId) : ''
  void initCategoryName()
  void reloadGoods()
})

useDidShow(() => {
  void reloadGoods()
})

async function initCategoryName() {
  if (!categoryId.value) {
    categoryName.value = ''
    return
  }
  await loadCategories()
  categoryName.value = categories.value.find((item) => item._id === categoryId.value)?.name || ''
}

function formatPrice(price: number) {
  return Number(price).toFixed(2).replace(/\.00$/, '')
}

function reloadGoods() {
  return loadGoods(keyword.value.trim(), categoryId.value)
}

function goDetail(id: string) {
  navigateTo({ url: '/pagesCustomer/goods/detail?id=' + id })
}
</script>

<style lang="less">
.page-goods-list { background: #f8f8f8; min-height: 100vh; }
.filter-tip {
  padding: 8rpx 24rpx 0;
  font-size: 24rpx;
  color: #999;
}
.goods-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding: 16rpx;
}
.goods-card {
  width: calc(50% - 8rpx);
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-sizing: border-box;
  &.is-sold-out .goods-img {
    opacity: 0.72;
  }
}
.goods-img-wrap {
  position: relative;
}
.goods-img {
  width: 100%;
  height: 340rpx;
}
.goods-name { padding: 12rpx 16rpx 4rpx; font-size: 26rpx; color: #333; }
.goods-price { padding: 0 16rpx 16rpx; font-size: 28rpx; font-weight: 600; color: #e53935; }
</style>
