<template>
  <view class="page-merchant-goods">
    <view class="toolbar">
      <nut-searchbar v-model="keyword" placeholder="搜索商品..." />
      <nut-button type="primary" size="small" @click="addGoods">+ 新增</nut-button>
    </view>

    <view v-for="(item, idx) in goodsList" :key="idx" class="goods-card" @click="editGoods(item.id)">
      <image class="thumb" :src="item.image" mode="aspectFill" />
      <view class="info">
        <view class="name">{{ item.name }}</view>
        <view class="price">¥{{ item.price }}</view>
        <view class="stock">库存: {{ item.stock }}</view>
      </view>
      <view class="status-tag">{{ item.onSale ? '在售' : '已下架' }}</view>
    </view>

    <nut-empty description="暂无商品" v-if="!goodsList.length" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { navigateTo } from '@/utils/router'

const keyword = ref('')
const goodsList = ref<{ id: number; name: string; image: string; price: number; stock: number; onSale: boolean }[]>([])

function addGoods() {
  navigateTo({ url: '/pagesMerchant/goods/edit' })
}

function editGoods(id: number) {
  navigateTo({ url: '/pagesMerchant/goods/edit?id=' + id })
}
</script>

<style lang="less">
.page-merchant-goods { background: #f8f8f8; min-height: 100vh; }
.toolbar { display: flex; align-items: center; gap: 16rpx; padding: 16rpx; background: #fff; }
.goods-card {
  display: flex; background: #fff; margin: 2rpx 0; padding: 24rpx 32rpx;
  position: relative;
  .thumb { width: 140rpx; height: 140rpx; border-radius: 8rpx; background: #f0f0f0; }
  .info { margin-left: 16rpx; flex: 1; }
  .name { font-size: 28rpx; color: #333; }
  .price { font-size: 26rpx; color: #e53935; margin-top: 4rpx; }
  .stock { font-size: 22rpx; color: #999; margin-top: 4rpx; }
  .status-tag {
    position: absolute; top: 16rpx; right: 16rpx;
    font-size: 20rpx; color: #999; background: #f5f5f5;
    padding: 4rpx 12rpx; border-radius: 8rpx;
  }
}
</style>
