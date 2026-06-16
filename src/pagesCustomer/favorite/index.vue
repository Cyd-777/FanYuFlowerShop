<template>
  <view class="page-favorite">
    <view class="goods-grid">
      <view v-for="(item, idx) in list" :key="idx" class="goods-card">
        <image class="goods-img" :src="item.image" mode="aspectFill" />
        <view class="goods-name">{{ item.name }}</view>
        <view class="goods-price">¥{{ item.price }}</view>
        <nut-button size="small" type="primary" plain @click="addToCart(item)">加入购物车</nut-button>
      </view>
    </view>
    <nut-empty description="还没有收藏的商品" v-if="!list.length" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const list = ref<{ name: string; image: string; price: number }[]>([])

function addToCart(item: any) {
  wx.showToast({ title: '已加入购物车', icon: 'success' })
}
</script>

<style lang="less">
.page-favorite { background: #f8f8f8; min-height: 100vh; }
.goods-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; padding: 16rpx; }
.goods-card { background: #fff; border-radius: 16rpx; padding: 16rpx; text-align: center; }
.goods-img { width: 100%; height: 260rpx; border-radius: 8rpx; background: #f0f0f0; }
.goods-name { margin-top: 8rpx; font-size: 26rpx; color: #333; }
.goods-price { font-size: 28rpx; font-weight: 600; color: #e53935; margin: 8rpx 0; }
</style>
