<template>
  <view class="order-list-status-tabs">
    <view
      v-for="tab in tabs"
      :key="tab.key"
      class="order-list-status-tabs__item"
      :class="{ active: modelValue === tab.key }"
      @tap="onPick(tab.key)"
    >
      <text class="order-list-status-tabs__text">{{ tab.title }}</text>
      <view v-if="modelValue === tab.key" class="order-list-status-tabs__line" />
    </view>
  </view>
</template>

<script setup lang="ts">
import type { OrderListTab } from '@/services/order'

const tabs: Array<{ key: OrderListTab; title: string }> = [
  { key: 'all', title: '全部' },
  { key: 'pending', title: '待处理' },
  { key: 'processing', title: '处理中' },
  { key: 'completed', title: '已完成' },
]

const modelValue = defineModel<OrderListTab>({ required: true })

function onPick(key: OrderListTab) {
  if (modelValue.value === key) return
  modelValue.value = key
}
</script>

<style lang="less">
@import '@/styles/tokens.less';

.order-list-status-tabs {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  background: @color-bg-card;
  border-bottom: 1rpx solid @color-border;
}

.order-list-status-tabs__item {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 88rpx;
  padding: 0 8rpx;
  box-sizing: border-box;
  color: @color-text-secondary;
}

.order-list-status-tabs__text {
  font-size: 28rpx;
  line-height: 1.2;
}

.order-list-status-tabs__item.active {
  color: @color-primary;
  font-weight: 600;
}

.order-list-status-tabs__line {
  position: absolute;
  left: 50%;
  bottom: 12rpx;
  width: 40rpx;
  height: 6rpx;
  border-radius: 999rpx;
  background: @color-primary;
  transform: translateX(-50%);
}
</style>
