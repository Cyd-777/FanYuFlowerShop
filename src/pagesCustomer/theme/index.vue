<template>
  <view class="page-theme">
    <AppNavBar />
    <nut-swiper :init-page="0" :pagination-visible="true" pagination-color="@color-primary">
      <nut-swiper-item v-for="(banner, idx) in banners" :key="idx">
        <image class="banner-img" :src="banner.image" mode="aspectFill" />
      </nut-swiper-item>
    </nut-swiper>

    <view class="section-title">🎉 {{ themeName }} 精选</view>
    <view class="goods-grid">
      <view v-for="(item, idx) in goodsList" :key="idx" class="goods-card" @click="goDetail(item.id)">
        <image class="goods-img" :src="item.image" mode="aspectFill" />
        <view class="goods-name">{{ item.name }}</view>
        <GoodsPriceLabel :price="item.price" root-class="goods-price" />
        <view class="goods-tag" v-if="item.tag">{{ item.tag }}</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { navigateTo } from '@/utils/router'
import GoodsPriceLabel from '@/components/GoodsPriceLabel.vue'

const themeName = ref('情人节')
const banners = ref<{ image: string }[]>([])
const goodsList = ref<{ id: number; name: string; image: string; price: number; tag?: string }[]>([])

function goDetail(id: number) {
  navigateTo({ url: '/pagesCustomer/goods/detail?id=' + id })
}
</script>

<style lang="less">
@import '@/styles/tokens.less';
.page-theme { background: @color-bg-page; min-height: 100vh; }
.banner-img { width: 100%; height: 400rpx; background: @color-bg-placeholder; }
.section-title { padding: 32rpx 32rpx 16rpx; font-size: 32rpx; font-weight: 600; color: #333; }
.goods-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; padding: 0 16rpx 32rpx;
}
.goods-card {
  background: #fff; border-radius: 16rpx; overflow: hidden; position: relative;
  .goods-img { width: 100%; height: 340rpx; background: @color-bg-placeholder; }
  .goods-name { padding: 12rpx 16rpx 4rpx; font-size: 26rpx; color: #333; }
  .goods-price { padding: 0 16rpx 16rpx; color: @color-primary; }
  .goods-tag {
    position: absolute; top: 8rpx; left: 8rpx;
    background: @color-primary; color: #fff; font-size: 20rpx;
    padding: 4rpx 12rpx; border-radius: 8rpx;
  }
}
</style>
