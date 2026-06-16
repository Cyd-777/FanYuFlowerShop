<template>
  <view class="page-goods-detail">
    <nut-swiper :init-page="0" :pagination-visible="true" pagination-color="#e53935">
      <nut-swiper-item v-for="(img, idx) in images" :key="idx">
        <image class="swiper-img" :src="img" mode="aspectFill" />
      </nut-swiper-item>
    </nut-swiper>

    <view class="info-section">
      <view class="price">¥{{ goods.price }}</view>
      <view class="name">{{ goods.name }}</view>
      <view class="desc">{{ goods.description }}</view>
    </view>

    <view class="action-bar">
      <nut-button class="cart-btn" plain @click="addToCart">加入购物车</nut-button>
      <nut-button class="buy-btn" type="primary" @click="buyNow">立即购买</nut-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const goods = ref({
  id: 0,
  name: '商品名称',
  price: 99.00,
  description: '商品描述',
})

const images = ref<string[]>([])

function addToCart() {
  wx.showToast({ title: '已加入购物车', icon: 'success' })
}

function buyNow() {
  wx.navigateTo({ url: '/pagesCustomer/order/confirm' })
}
</script>

<style lang="less">
.page-goods-detail { padding-bottom: 120rpx; background: #f8f8f8; }
.swiper-img { width: 100%; height: 600rpx; background: #f0f0f0; }
.info-section { padding: 24rpx; background: #fff; }
.price { font-size: 40rpx; font-weight: 700; color: #e53935; }
.name { margin-top: 12rpx; font-size: 32rpx; font-weight: 600; color: #333; }
.desc { margin-top: 8rpx; font-size: 26rpx; color: #999; line-height: 1.5; }
.action-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; gap: 16rpx; padding: 16rpx 24rpx;
  background: #fff; border-top: 2rpx solid #eee;
}
.cart-btn, .buy-btn { flex: 1; border-radius: 40rpx; }
</style>
