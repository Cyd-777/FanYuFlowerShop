<template>
  <view v-if="variant === 'grid'" class="goods-skeleton-grid">
    <view v-for="i in count" :key="i" class="goods-skeleton-card">
      <view class="sk-block sk-img sk-shimmer" />
      <view class="sk-block sk-line sk-title sk-shimmer" />
      <view class="sk-block sk-line sk-price sk-shimmer" />
    </view>
  </view>
  <view v-else class="goods-skeleton-rows">
    <view v-for="i in count" :key="i" class="goods-skeleton-row">
      <view class="sk-block sk-thumb sk-shimmer" />
      <view class="sk-col">
        <view class="sk-block sk-line sk-shimmer" />
        <view class="sk-block sk-line sk-short sk-shimmer" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'grid' | 'row'
    count?: number
  }>(),
  {
    variant: 'grid',
    count: 4,
  },
)
</script>

<style lang="less">
@import '@/styles/tokens.less';
@keyframes goods-sk-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.sk-shimmer {
  background: linear-gradient(90deg, @color-bg-placeholder 0%, @color-bg-surface-alt2 20%, @color-bg-muted 40%, @color-bg-placeholder 100%);
  background-size: 200% 100%;
  animation: goods-sk-shimmer 1.4s ease-in-out infinite;
}

.goods-skeleton-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  padding: 0 16rpx 32rpx;
  box-sizing: border-box;
}

.goods-skeleton-card {
  min-width: 0;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-sizing: border-box;
}

.sk-block {
  border-radius: 8rpx;
}

.sk-img {
  width: 100%;
  height: 340rpx;
  border-radius: 0;
}

.sk-line {
  height: 28rpx;
  margin: 12rpx 16rpx 0;
}

.sk-title {
  width: 72%;
}

.sk-price {
  width: 40%;
  margin-bottom: 16rpx;
}

.goods-skeleton-rows {
  padding: 0;
}

.goods-skeleton-row {
  display: flex;
  background: #fff;
  border-radius: 12rpx;
  padding: 16rpx;
  margin-bottom: 16rpx;
}

.sk-thumb {
  width: 160rpx;
  height: 160rpx;
  flex-shrink: 0;
  border-radius: 8rpx;
}

.sk-col {
  flex: 1;
  margin-left: 16rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.sk-short {
  width: 36%;
  margin-top: 16rpx;
}
</style>
