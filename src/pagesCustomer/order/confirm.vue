<template>
  <view class="page-confirm">
    <nut-cell title="收货地址" :desc="address ? address.detail : '请选择地址'" is-link @click="selectAddress" />

    <view class="goods-section">
      <view class="section-title">商品信息</view>
      <view v-for="(item, idx) in goodsList" :key="idx" class="order-goods">
        <image class="thumb" :src="item.image" mode="aspectFill" />
        <view class="info">
          <view class="name">{{ item.name }}</view>
          <view class="price">¥{{ item.price }} x {{ item.count }}</view>
        </view>
      </view>
    </view>

    <nut-cell title="备注" is-link @click="showRemark = true">
      <view slot="desc">{{ remark || '无' }}</view>
    </nut-cell>

    <view class="action-bar">
      <view class="total">合计: <text class="price">¥{{ totalPrice }}</text></view>
      <nut-button type="primary" @click="submitOrder">提交订单</nut-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const address = ref<{ detail: string } | null>(null)
const remark = ref('')
const showRemark = ref(false)
const goodsList = ref<{ name: string; image: string; price: number; count: number }[]>([])

const totalPrice = computed(() =>
  goodsList.value.reduce((s, i) => s + i.price * i.count, 0).toFixed(2)
)

function selectAddress() {
  wx.navigateTo({ url: '/pagesCustomer/address/list?from=confirm' })
}

function submitOrder() {
  wx.showToast({ title: '订单已提交', icon: 'success' })
}
</script>

<style lang="less">
.page-confirm { background: #f8f8f8; min-height: 100vh; padding-bottom: 120rpx; }
.goods-section { background: #fff; padding: 24rpx; margin-top: 16rpx; }
.section-title { font-size: 28rpx; font-weight: 600; margin-bottom: 16rpx; }
.order-goods { display: flex; margin-bottom: 16rpx; }
.thumb { width: 120rpx; height: 120rpx; border-radius: 8rpx; background: #f0f0f0; }
.info { margin-left: 16rpx; flex: 1; }
.name { font-size: 26rpx; color: #333; }
.price { font-size: 24rpx; color: #999; margin-top: 4rpx; }
.action-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; align-items: center; padding: 16rpx 24rpx;
  background: #fff; border-top: 2rpx solid #eee;
  .total { flex: 1; font-size: 28rpx; }
  .price { color: #e53935; font-weight: 600; font-size: 34rpx; }
}
</style>
