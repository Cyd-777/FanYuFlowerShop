<template>
  <view class="page-customize-pick" id="customize-pick-scroll-body">
    <AppNavBar />
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
          <GoodsPriceLabel :price="item.price" :unit="item.unit" root-class="price" />
        </view>
      </view>
    </view>
    <view v-else class="empty">{{ emptyTip }}</view>

    <ScrollListTailSpacer
      content-selector="#customize-pick-scroll-body"
      :bottom-inset-px="actionBarInsetPx"
      :watch-key="`${loading}-${goodsList.length}-${selectedIds.length}`"
    />

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
import GoodsPriceLabel from '@/components/GoodsPriceLabel.vue'
import { scrollTailActionBarInsetPx } from '@/utils/scrollListTailSpacer'

const actionBarInsetPx = scrollTailActionBarInsetPx()

const {
  pickTip,
  loading,
  goodsList,
  selectedIds,
  emptyTip,
  isSelected,
  toggleItem,
  confirmPick,
} = usePageData()
</script>

<style lang="less">
@import '@/styles/tokens.less';
.page-customize-pick { min-height: 100vh; background: @color-bg-page; }
.tip { padding: 20rpx 24rpx; font-size: 24rpx; color: #666; }
.goods-list { padding: 0 16rpx; }
.goods-item {
  display: flex; align-items: center; background: #fff; border-radius: 12rpx;
  padding: 16rpx; margin-bottom: 12rpx; border: 2rpx solid transparent;
  &.selected { border-color: @color-primary; background: @color-danger-bg-alt; }
  &.is-sold-out { opacity: 0.5; }
}
.check {
  width: 40rpx; height: 40rpx; border-radius: 50%; border: 2rpx solid #ddd;
  margin-right: 12rpx; display: flex; align-items: center; justify-content: center;
  font-size: 24rpx; color: @color-primary;
}
.thumb { width: 120rpx; height: 120rpx; border-radius: 8rpx; background: @color-bg-placeholder; }
.info { flex: 1; margin-left: 16rpx; }
.name { font-size: 26rpx; color: #333; }
.price { margin-top: 8rpx; color: @color-primary; }
.empty { padding: 80rpx 32rpx; text-align: center; font-size: 26rpx; color: #999; line-height: 1.6; }
.action-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; align-items: center; padding: 16rpx 24rpx;
  background: #fff; border-top: 2rpx solid #eee;
  .count { flex: 1; font-size: 28rpx; color: #333; }
}
</style>
