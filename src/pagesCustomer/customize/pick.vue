<template>
  <view class="page-customize-pick">
    <view class="tip">{{ pickTip }}</view>
    <GoodsCardSkeleton v-if="loading" variant="row" :count="5" />
    <view v-else-if="goodsList.length" class="goods-list">
      <view
        v-for="item in goodsList"
        :key="item._id"
        class="goods-item"
        :class="{ selected: isSelected(item._id), 'is-sold-out': item.stock <= 0 }"
        @click="toggleItem(item)"
      >
        <view class="check">{{ isSelected(item._id) ? '✓' : '' }}</view>
        <GoodsImage :src="item.imageUrl" root-class="thumb" />
        <view class="info">
          <view class="name">{{ item.name }}</view>
          <view class="price">¥{{ formatPrice(item.price) }}/{{ item.unit }}</view>
        </view>
      </view>
    </view>
    <view v-else class="empty">{{ emptyTip }}</view>

    <view class="action-bar">
      <view class="count">已选 {{ selectedIds.length }} 件</view>
      <nut-button type="primary" :disabled="!selectedIds.length" @click="confirmPick">
        确定
      </nut-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { usePageData } from '@/composables/usePageData'
import GoodsCardSkeleton from '@/components/GoodsCardSkeleton.vue'
import GoodsImage from '@/components/GoodsImage.vue'

const {
  pickTip,
  loading,
  goodsList,
  selectedIds,
  emptyTip,
  isSelected,
  toggleItem,
  formatPrice,
  confirmPick,
} = usePageData()
</script>

<style lang="less">
.page-customize-pick { min-height: 100vh; background: #f8f8f8; padding-bottom: 120rpx; }
.tip { padding: 20rpx 24rpx; font-size: 24rpx; color: #666; }
.goods-list { padding: 0 16rpx; }
.goods-item {
  display: flex; align-items: center; background: #fff; border-radius: 12rpx;
  padding: 16rpx; margin-bottom: 12rpx; border: 2rpx solid transparent;
  &.selected { border-color: #e53935; background: #fff5f5; }
  &.is-sold-out { opacity: 0.5; }
}
.check {
  width: 40rpx; height: 40rpx; border-radius: 50%; border: 2rpx solid #ddd;
  margin-right: 12rpx; display: flex; align-items: center; justify-content: center;
  font-size: 24rpx; color: #e53935;
}
.thumb { width: 120rpx; height: 120rpx; border-radius: 8rpx; background: #f0f0f0; }
.info { flex: 1; margin-left: 16rpx; }
.name { font-size: 26rpx; color: #333; }
.price { margin-top: 8rpx; font-size: 28rpx; color: #e53935; font-weight: 600; }
.empty { padding: 80rpx 32rpx; text-align: center; font-size: 26rpx; color: #999; line-height: 1.6; }
.action-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; align-items: center; padding: 16rpx 24rpx;
  background: #fff; border-top: 2rpx solid #eee;
  .count { flex: 1; font-size: 28rpx; color: #333; }
}
</style>
