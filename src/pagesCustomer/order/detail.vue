<template>
  <view class="page-order-detail">
    <view class="status-bar">
      <view class="status-icon">{{ statusIcon }}</view>
      <view class="status-text">{{ order.statusText }}</view>
    </view>

    <view class="section">
      <view class="section-title">收货信息</view>
      <view class="address-info">
        <view class="name">{{ address.name }} {{ address.phone }}</view>
        <view class="detail">{{ address.detail }}</view>
      </view>
    </view>

    <view class="section">
      <view class="section-title">商品信息</view>
      <view v-for="(item, idx) in goodsList" :key="idx" class="goods-item">
        <image class="thumb" :src="item.image" mode="aspectFill" />
        <view class="info">
          <view class="name">{{ item.name }}</view>
          <view class="price">¥{{ item.price }} x {{ item.count }}</view>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="info-row"><text class="label">订单编号</text><text>{{ order.orderNo }}</text></view>
      <view class="info-row"><text class="label">下单时间</text><text>{{ order.createTime }}</text></view>
      <view class="info-row"><text class="label">实付金额</text><text class="price">¥{{ order.total }}</text></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const order = ref({ orderNo: '20260616123456', statusText: '待付款', total: 99.00, createTime: '2026-06-16 12:00' })
const address = ref({ name: '张三', phone: '13800138000', detail: '北京市朝阳区××路××号' })
const goodsList = ref<{ name: string; image: string; price: number; count: number }[]>([])

const statusIcon = computed(() => {
  const map: Record<string, string> = { pending: '⏳', shipped: '🚚', completed: '✅' }
  return map[order.value.statusText] || '📋'
})
</script>

<style lang="less">
.page-order-detail { background: #f8f8f8; min-height: 100vh; }
.status-bar {
  display: flex; flex-direction: column; align-items: center;
  padding: 48rpx; background: #fff;
  .status-icon { font-size: 64rpx; }
  .status-text { margin-top: 16rpx; font-size: 32rpx; font-weight: 600; color: #e53935; }
}
.section { background: #fff; padding: 24rpx; margin-top: 16rpx; }
.section-title { font-size: 28rpx; font-weight: 600; margin-bottom: 16rpx; }
.address-info { .name { font-size: 28rpx; color: #333; } .detail { font-size: 24rpx; color: #999; margin-top: 8rpx; } }
.goods-item { display: flex; margin-bottom: 16rpx; }
.thumb { width: 120rpx; height: 120rpx; border-radius: 8rpx; background: #f0f0f0; }
.info { margin-left: 16rpx; flex: 1; }
.name { font-size: 26rpx; color: #333; }
.price { font-size: 24rpx; color: #999; }
.info-row { display: flex; justify-content: space-between; padding: 8rpx 0; font-size: 26rpx; }
.info-row .label { color: #999; }
.info-row .price { color: #e53935; font-weight: 600; }
</style>
