<template>
  <view class="page-home">
    <view class="header">
      <view class="greeting">🌷 欢迎来到梵宇花店</view>
      <view class="subtitle">每一束花，都是一次心动</view>
    </view>

    <!-- 分类入口 -->
    <scroll-view class="categories" scroll-x enhanced show-scrollbar="{{false}}">
      <view
        v-for="(cat, idx) in categories"
        :key="idx"
        class="category-item"
        @click="goCategory(cat)"
      >
        <view class="cat-icon">{{ cat.icon }}</view>
        <view class="cat-name">{{ cat.name }}</view>
      </view>
    </scroll-view>

    <!-- 推荐商品区域 -->
    <view class="section-title">✨ 推荐花束</view>
    <view class="goods-grid">
      <view
        v-for="(item, idx) in goodsList"
        :key="idx"
        class="goods-card"
        @click="goDetail(item.id)"
      >
        <image class="goods-img" src="{{ item.image }}" mode="aspectFill" />
        <view class="goods-name">{{ item.name }}</view>
        <view class="goods-price">¥{{ item.price }}</view>
      </view>
    </view>

    <nut-back-top :threshold="200" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { navigateTo } from '@/utils/router'

const categories = ref([
  { icon: '💐', name: '混搭花束' },
  { icon: '🌹', name: '玫瑰' },
  { icon: '🌻', name: '向日葵' },
  { icon: '🎁', name: '礼盒' },
  { icon: '💍', name: '求婚' },
])

const goodsList = ref<{ id: number; name: string; image: string; price: number }[]>([])

function goCategory(cat: any) {
  navigateTo({ url: '/pagesCustomer/goods/list?category=' + cat.name })
}

function goDetail(id: number) {
  navigateTo({ url: '/pagesCustomer/goods/detail?id=' + id })
}
</script>

<style lang="less">
.page-home {
  min-height: 100vh;
  background: #f8f8f8;
}
.header {
  padding: 48rpx 32rpx 32rpx;
  background: linear-gradient(135deg, #fce4ec, #f8bbd0);
  .greeting {
    font-size: 36rpx;
    font-weight: 600;
    color: #333;
  }
  .subtitle {
    margin-top: 8rpx;
    font-size: 26rpx;
    color: #999;
  }
}
.categories {
  display: flex;
  padding: 24rpx 16rpx;
  white-space: nowrap;
  background: #fff;
}
.category-item {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  margin: 0 16rpx;
  .cat-icon {
    width: 96rpx;
    height: 96rpx;
    border-radius: 50%;
    background: #fce4ec;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40rpx;
  }
  .cat-name {
    margin-top: 8rpx;
    font-size: 24rpx;
    color: #666;
  }
}
.section-title {
  padding: 32rpx 32rpx 16rpx;
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}
.goods-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
  padding: 0 16rpx 32rpx;
}
.goods-card {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  .goods-img {
    width: 100%;
    height: 340rpx;
    background: #f0f0f0;
  }
  .goods-name {
    padding: 12rpx 16rpx 4rpx;
    font-size: 26rpx;
    color: #333;
  }
  .goods-price {
    padding: 0 16rpx 16rpx;
    font-size: 28rpx;
    font-weight: 600;
    color: #e53935;
  }
}
</style>
