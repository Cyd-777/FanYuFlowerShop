<template>
  <view class="page-goods-picker">
    <AppNavBar />
    <view class="tip">勾选参与此折扣的商品</view>
    <GoodsCardSkeleton v-if="loading" variant="row" :count="6" />
    <view v-else class="list">
      <view
        v-for="item in displayList"
        :key="item._id"
        class="row"
        :class="{ selected: isSelected(item._id) }"
        hover-class="row-active"
        @tap="toggle(item._id)"
      >
        <view class="check" @tap.stop="toggle(item._id)">
          <text v-if="isSelected(item._id)" class="check-mark">✓</text>
        </view>
        <GoodsImage
          :src="item.imageUrl"
          root-class="thumb"
          @tap.stop="toggle(item._id)"
        />
        <view class="info" @tap.stop="toggle(item._id)">
          <view class="name">{{ item.name }}</view>
          <view class="price">¥{{ formatPrice(item.price) }}</view>
        </view>
      </view>
    </view>

    <view class="action-bar">
      <view class="count">已选 {{ selectedIds.length }} 件</view>
      <nut-button type="primary" @tap="confirm">确定</nut-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { usePageData } from '@/composables/usePageData'
import GoodsCardSkeleton from '@/components/GoodsCardSkeleton.vue'
import GoodsImage from '@/components/GoodsImage.vue'

const {
  displayList,
  loading,
  selectedIds,
  formatPrice,
  isSelected,
  toggle,
  confirm,
} = usePageData()
</script>

<style lang="less">
.page-goods-picker { min-height: 100vh; background: #f8f8f8; padding-bottom: 120rpx; }
.tip { padding: 20rpx 24rpx; font-size: 24rpx; color: #666; }
.list { padding: 0 16rpx; }
.row {
  display: flex; align-items: center; background: #fff; border-radius: 12rpx;
  padding: 16rpx; margin-bottom: 12rpx; border: 2rpx solid transparent;
  &.selected { border-color: #e53935; background: #fff5f5; }
}
.row-active { opacity: 0.88; }
.check {
  width: 40rpx; height: 40rpx; border-radius: 50%; border: 2rpx solid #ddd;
  margin-right: 12rpx; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.row.selected .check {
  border-color: #e53935;
  background: #fce4ec;
}
.check-mark { color: #e53935; font-size: 24rpx; line-height: 1; }
.thumb { width: 96rpx; height: 96rpx; border-radius: 8rpx; background: #f0f0f0; flex-shrink: 0; }
.info { flex: 1; margin-left: 16rpx; min-width: 0; }
.name { font-size: 26rpx; color: #333; }
.price { margin-top: 6rpx; font-size: 24rpx; color: #e53935; }
.action-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; align-items: center; padding: 16rpx 24rpx;
  background: #fff; border-top: 2rpx solid #eee;
  .count { flex: 1; font-size: 28rpx; }
}
</style>
