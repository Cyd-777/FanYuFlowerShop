<template>
  <view class="page-merchant-order">
    <nut-tabs v-model="activeTab">
      <nut-tab-pane title="全部" pane-key="all" />
      <nut-tab-pane title="待付款" pane-key="pending" />
      <nut-tab-pane title="待发货" pane-key="shipped" />
      <nut-tab-pane title="已完成" pane-key="completed" />
    </nut-tabs>

    <view v-for="(order, idx) in orders" :key="idx" class="order-card" @click="goDetail(order.id)">
      <view class="order-header">
        <text class="order-no">{{ order.orderNo }}</text>
        <text class="order-status">{{ order.statusText }}</text>
      </view>
      <view class="order-body">
        <image class="thumb" :src="order.image" mode="aspectFill" />
        <view class="info">
          <view class="name">{{ order.name }}</view>
          <view class="qty">x{{ order.count }}</view>
        </view>
      </view>
      <view class="order-footer">
        <text class="total">¥{{ order.total }}</text>
        <view class="actions">
          <nut-button size="small" plain v-if="order.status === 'pending'">确认收款</nut-button>
          <nut-button size="small" type="primary" v-if="order.status === 'shipped'">确认发货</nut-button>
        </view>
      </view>
    </view>

    <nut-empty description="暂无订单" v-if="!orders.length" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { navigateTo } from '@/utils/router'

const activeTab = ref('all')
const orders = ref<any[]>([])

function goDetail(id: number) {
  navigateTo({ url: '/pagesMerchant/order/detail?id=' + id })
}
</script>

<style lang="less">
.page-merchant-order { background: #f8f8f8; min-height: 100vh; }
.order-card { background: #fff; margin: 16rpx; border-radius: 12rpx; padding: 24rpx; }
.order-header { display: flex; justify-content: space-between; }
.order-no { font-size: 22rpx; color: #999; }
.order-status { font-size: 24rpx; color: #e53935; }
.order-body { display: flex; margin: 16rpx 0; }
.thumb { width: 120rpx; height: 120rpx; border-radius: 8rpx; background: #f0f0f0; }
.info { margin-left: 16rpx; }
.name { font-size: 26rpx; }
.qty { font-size: 24rpx; color: #999; }
.order-footer { display: flex; justify-content: space-between; align-items: center; border-top: 2rpx solid #f5f5f5; padding-top: 16rpx; }
.total { font-size: 28rpx; font-weight: 600; }
.actions { display: flex; gap: 12rpx; }
</style>
