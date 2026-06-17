<template>
  <view class="page-category">
    <nut-searchbar v-model="keyword" placeholder="搜索花束..." @search="onSearch" />
    <view class="content">
      <scroll-view class="left" scroll-y>
        <view
          v-for="(cat, idx) in categories"
          :key="idx"
          :class="['left-item', { active: idx === activeIdx }]"
          @click="activeIdx = idx"
        >
          {{ cat.name }}
        </view>
      </scroll-view>
      <scroll-view class="right" scroll-y>
        <view class="right-title">{{ categories[activeIdx]?.name }}</view>
        <view
          v-for="(item, idx) in subGoods"
          :key="idx"
          class="goods-item"
          @click="goDetail(item.id)"
        >
          <image class="thumb" :src="item.image" mode="aspectFill" />
          <view class="info">
            <view class="name">{{ item.name }}</view>
            <view class="price">¥{{ item.price }}</view>
          </view>
        </view>
        <nut-empty description="暂无商品" v-if="!subGoods.length" />
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { navigateTo } from '@/utils/router'

const keyword = ref('')
const activeIdx = ref(0)

const categories = ref([
  { name: '混搭花束' },
  { name: '玫瑰' },
  { name: '向日葵' },
  { name: '礼盒' },
  { name: '求婚' },
])

const subGoods = computed(() => [])

function onSearch() {
  if (keyword.value) {
    navigateTo({ url: '/pagesCustomer/goods/list?keyword=' + keyword.value })
  }
}

function goDetail(id: number) {
  navigateTo({ url: '/pagesCustomer/goods/detail?id=' + id })
}
</script>

<style lang="less">
.page-category {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8f8f8;
}
.content {
  flex: 1;
  display: flex;
  overflow: hidden;
}
.left {
  width: 180rpx;
  background: #fff;
}
.left-item {
  padding: 28rpx 24rpx;
  font-size: 26rpx;
  color: #666;
  text-align: center;
  border-left: 4rpx solid transparent;
  &.active {
    color: #e53935;
    border-left-color: #e53935;
    background: #fce4ec;
    font-weight: 600;
  }
}
.right {
  flex: 1;
  padding: 24rpx;
}
.right-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
}
.goods-item {
  display: flex;
  background: #fff;
  border-radius: 12rpx;
  padding: 16rpx;
  margin-bottom: 16rpx;
  .thumb {
    width: 160rpx;
    height: 160rpx;
    border-radius: 8rpx;
    background: #f0f0f0;
    flex-shrink: 0;
  }
  .info {
    margin-left: 16rpx;
    flex: 1;
  }
  .name {
    font-size: 26rpx;
    color: #333;
  }
  .price {
    margin-top: 8rpx;
    font-size: 28rpx;
    font-weight: 600;
    color: #e53935;
  }
}
</style>
