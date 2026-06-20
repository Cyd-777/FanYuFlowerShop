<template>
  <view class="page-merchant-order">
    <nut-tabs v-model="activeTab">
      <nut-tab-pane title="全部" pane-key="all" />
      <nut-tab-pane title="待处理" pane-key="pending" />
      <nut-tab-pane title="处理中" pane-key="processing" />
      <nut-tab-pane title="已完成" pane-key="completed" />
    </nut-tabs>

    <view v-if="loading" class="loading-tip">加载中…</view>

    <template v-else>
      <view
        v-for="order in orders"
        :key="order._id"
        class="order-card"
        @click="goDetail(order._id)"
      >
        <view class="order-header">
          <text class="order-no">{{ order.orderNo }}</text>
          <text class="order-status">{{ statusLabel(order) }}</text>
        </view>
        <view class="order-body">
          <GoodsImage :src="previewImage(order)" root-class="thumb" />
          <view class="info">
            <view class="name">{{ previewName(order) }}</view>
            <view class="address">{{ order.address.fullText }}</view>
            <view class="qty">共 {{ totalCount(order) }} 件 · ¥{{ formatPrice(order.totalAmount) }}</view>
          </view>
        </view>
        <view v-if="order.status === 'pending'" class="order-footer">
          <nut-button size="small" type="primary" @click.stop="acceptOrder(order._id)">
            接单
          </nut-button>
        </view>
      </view>

      <nut-empty v-if="!orders.length" description="暂无订单" />
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useDidShow, useLoad } from '@tarojs/taro'
import { listMerchantOrders, updateOrderStatus } from '@/services/order'
import type { OrderListTab } from '@/services/order'
import { navigateTo } from '@/utils/router'
import GoodsImage from '@/components/GoodsImage.vue'
import type { Order } from '@/types/order'
import { getOrderProgressLabel } from '@/types/order'

type TabKey = OrderListTab

const activeTab = ref<TabKey>('all')
const orders = ref<Order[]>([])
const loading = ref(false)

useLoad((options) => {
  const status = typeof options?.status === 'string' ? options.status : 'all'
  if (status === 'pending' || status === 'processing' || status === 'completed' || status === 'cancelled') {
    activeTab.value = status
  } else {
    activeTab.value = 'all'
  }
})

useDidShow(() => {
  void loadOrders()
})

watch(activeTab, () => {
  void loadOrders()
})

async function loadOrders() {
  loading.value = true
  try {
    orders.value = await listMerchantOrders(activeTab.value)
  } catch (err) {
    orders.value = []
    wx.showToast({
      title: err instanceof Error ? err.message : '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

function statusLabel(order: Order) {
  return getOrderProgressLabel(order)
}

function previewImage(order: Order) {
  return order.items[0]?.image || ''
}

function previewName(order: Order) {
  const first = order.items[0]
  if (!first) return '商品'
  if (order.items.length <= 1) return first.name
  return `${first.name} 等${order.items.length}件`
}

function totalCount(order: Order) {
  return order.items.reduce((sum, item) => sum + item.count, 0)
}

function formatPrice(price: number) {
  return Number(price).toFixed(2).replace(/\.00$/, '')
}

function goDetail(id: string) {
  navigateTo({ url: `/pagesMerchant/order/detail?id=${id}` })
}

async function acceptOrder(id: string) {
  try {
    await updateOrderStatus(id, 'accepted')
    wx.showToast({ title: '已接单', icon: 'success' })
    void loadOrders()
  } catch (err) {
    wx.showToast({
      title: err instanceof Error ? err.message : '操作失败',
      icon: 'none',
    })
  }
}
</script>

<style lang="less">
.page-merchant-order {
  background: #f8f8f8;
  min-height: 100vh;
  padding-bottom: 32rpx;
}
.loading-tip {
  padding: 48rpx;
  text-align: center;
  font-size: 26rpx;
  color: #999;
}
.order-card {
  background: #fff;
  margin: 16rpx;
  border-radius: 12rpx;
  padding: 24rpx;
}
.order-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16rpx;
  gap: 16rpx;
}
.order-no {
  flex: 1;
  font-size: 22rpx;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.order-status {
  flex-shrink: 0;
  font-size: 24rpx;
  color: #e53935;
}
.order-body {
  display: flex;
}
.thumb {
  width: 120rpx;
  height: 120rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
}
.info {
  margin-left: 16rpx;
  flex: 1;
  min-width: 0;
}
.name {
  font-size: 26rpx;
  color: #333;
}
.address {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #999;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.qty {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #666;
}
.order-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 2rpx solid #f5f5f5;
}
</style>
