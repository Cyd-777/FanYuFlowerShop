<template>
  <view class="page-merchant-order-detail">
    <view class="section">
      <view class="section-title">订单信息</view>
      <view class="info-row"><text class="label">订单编号</text><text>{{ order.orderNo }}</text></view>
      <view class="info-row"><text class="label">下单时间</text><text>{{ order.createTime }}</text></view>
      <view class="info-row"><text class="label">订单状态</text><text class="status">{{ order.statusText }}</text></view>
    </view>

    <view class="section">
      <view class="section-title">顾客信息</view>
      <view class="info-row"><text class="label">收货人</text><text>{{ order.customerName }}</text></view>
      <view class="info-row"><text class="label">联系电话</text><text>{{ order.customerPhone }}</text></view>
      <view class="info-row"><text class="label">收货地址</text><text>{{ order.address }}</text></view>
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

    <view class="action-bar">
      <nut-button class="action-btn" type="primary" v-if="order.status === 'shipped'">确认发货</nut-button>
      <nut-button class="action-btn" plain v-if="order.status === 'pending'">确认收款</nut-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const order = ref({
  orderNo: '20260616123456',
  createTime: '2026-06-16 12:00',
  status: 'pending',
  statusText: '待付款',
  customerName: '张三',
  customerPhone: '13800138000',
  address: '北京市朝阳区××路××号',
})
const goodsList = ref<{ name: string; image: string; price: number; count: number }[]>([])
</script>

<style lang="less">
.page-merchant-order-detail { background: #f8f8f8; min-height: 100vh; padding-bottom: 120rpx; }
.section { background: #fff; padding: 24rpx; margin-bottom: 16rpx; }
.section-title { font-size: 28rpx; font-weight: 600; margin-bottom: 16rpx; }
.info-row { display: flex; justify-content: space-between; padding: 8rpx 0; font-size: 26rpx; }
.info-row .label { color: #999; }
.info-row .status { color: #e53935; font-weight: 600; }
.goods-item { display: flex; margin-bottom: 16rpx; }
.thumb { width: 120rpx; height: 120rpx; border-radius: 8rpx; background: #f0f0f0; }
.info { margin-left: 16rpx; flex: 1; }
.name { font-size: 26rpx; }
.price { font-size: 24rpx; color: #999; }
.action-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  padding: 16rpx 32rpx; background: #fff; border-top: 2rpx solid #eee;
}
.action-btn { width: 100%; border-radius: 48rpx; }
</style>
