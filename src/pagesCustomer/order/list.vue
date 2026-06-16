<template>
  <view class="page-order-list">
    <nut-tabs v-model="activeTab">
      <nut-tab-pane title="全部" pane-key="all" />
      <nut-tab-pane title="待付款" pane-key="pending" />
      <nut-tab-pane title="待发货" pane-key="shipped" />
      <nut-tab-pane title="已完成" pane-key="completed" />
    </nut-tabs>

    <view v-for="(order, idx) in orders" :key="idx" class="order-card" @click="goDetail(order.id)">
      <view class="order-header">
        <text class="order-no">订单号: {{ order.orderNo }}</text>
        <text class="order-status">{{ order.statusText }}</text>
      </view>
      <view class="order-goods">
        <image class="thumb" :src="order.image" mode="aspectFill" />
        <view class="info">
          <view class="name">{{ order.name }}</view>
          <view class="qty">x{{ order.count }}</view>
        </view>
      </view>
      <view class="order-footer">
        <text class="total">合计: ¥{{ order.total }}</text>
        <nut-button size="small" type="primary" v-if="order.status === 'pending'">去付款</nut-button>
      </view>
    </view>

    <nut-empty description="暂无订单" v-if="!orders.length" />
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { navigateTo } from '@/utils/router'

const activeTab = ref('all')
const orders = ref<any[]>([])

watch(activeTab, () => { orders.value = [] })

function goDetail(id: number) {
  navigateTo({ url: '/pagesCustomer/order/detail?id=' + id })
}
</script>

<style lang="less">
.page-order-list { background: #f8f8f8; min-height: 100vh; }
.order-card {
  background: #fff; margin: 16rpx; border-radius: 12rpx; padding: 24rpx;
}
.order-header { display: flex; justify-content: space-between; margin-bottom: 16rpx; }
.order-no { font-size: 22rpx; color: #999; }
.order-status { font-size: 24rpx; color: #e53935; }
.order-goods { display: flex; margin-bottom: 16rpx; }
.thumb { width: 120rpx; height: 120rpx; border-radius: 8rpx; background: #f0f0f0; }
.info { margin-left: 16rpx; }
.name { font-size: 26rpx; color: #333; }
.qty { font-size: 24rpx; color: #999; margin-top: 4rpx; }
.order-footer { display: flex; justify-content: space-between; align-items: center; border-top: 2rpx solid #f5f5f5; padding-top: 16rpx; }
.total { font-size: 26rpx; font-weight: 600; color: #333; }
</style>
