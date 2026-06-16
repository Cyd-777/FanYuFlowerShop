<template>
  <view class="page-goods-list">
    <nut-searchbar v-model="keyword" placeholder="搜索花束..." @search="onSearch" />
    <view class="goods-grid">
      <view v-for="(item, idx) in goodsList" :key="idx" class="goods-card" @click="goDetail(item.id)">
        <image class="goods-img" :src="item.image" mode="aspectFill" />
        <view class="goods-name">{{ item.name }}</view>
        <view class="goods-price">¥{{ item.price }}</view>
      </view>
    </view>
    <nut-empty description="暂无商品" v-if="!goodsList.length" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { navigateTo } from '@/utils/router'

const keyword = ref('')
const goodsList = ref<{ id: number; name: string; image: string; price: number }[]>([])

function onSearch() {}
function goDetail(id: number) {
  navigateTo({ url: '/pagesCustomer/goods/detail?id=' + id })
}
</script>

<style lang="less">
.page-goods-list { background: #f8f8f8; min-height: 100vh; }
.goods-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; padding: 16rpx; }
.goods-card { background: #fff; border-radius: 16rpx; overflow: hidden; }
.goods-img { width: 100%; height: 340rpx; background: #f0f0f0; }
.goods-name { padding: 12rpx 16rpx 4rpx; font-size: 26rpx; color: #333; }
.goods-price { padding: 0 16rpx 16rpx; font-size: 28rpx; font-weight: 600; color: #e53935; }
</style>
