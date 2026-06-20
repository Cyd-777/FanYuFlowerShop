<template>
  <view class="page-goods-list">
    <view class="search-bar">
      <GoodsNameTypeahead
        v-model="keyword"
        :catalog="searchCatalog"
        placeholder="搜索花束..."
        @search="onSearchKeyword"
        @select="onPickSuggestion"
      />
    </view>
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
          <GoodsImage
            :src="item.imageUrl"
            :cloud-file-id="item.coverImage || item.images?.[0]"
            root-class="goods-img"
          />
          <GoodsNewListingBadge :goods="item" />
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
import { usePageData } from '@/composables/usePageData'
import GoodsCardSkeleton from '@/components/GoodsCardSkeleton.vue'
import GoodsImage from '@/components/GoodsImage.vue'
import GoodsNewListingBadge from '@/components/GoodsNewListingBadge.vue'
import GoodsSoldOutBadge from '@/components/GoodsSoldOutBadge.vue'
import GoodsNameTypeahead from '@/components/GoodsNameTypeahead.vue'

const {
  keyword,
  categoryName,
  goodsList,
  loading,
  searchCatalog,
  onSearchKeyword,
  onPickSuggestion,
  formatPrice,
  goDetail,
} = usePageData()
</script>

<style lang="less">
.page-goods-list { background: #f8f8f8; min-height: 100vh; }
.search-bar {
  padding: 16rpx 24rpx;
  background: #fff;
}
.filter-tip {
  padding: 8rpx 24rpx 0;
  font-size: 24rpx;
  color: #999;
}
.goods-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  padding: 16rpx;
  box-sizing: border-box;
}
.goods-card {
  min-width: 0;
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
.goods-name {
  padding: 12rpx 16rpx 4rpx;
  font-size: 26rpx;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.goods-price { padding: 0 16rpx 16rpx; font-size: 28rpx; font-weight: 600; color: #e53935; }
</style>
