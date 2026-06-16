<template>
  <view class="page-address">
    <view v-for="(addr, idx) in list" :key="idx" class="addr-card" @click="select(addr)">
      <view class="addr-top">
        <view class="name">{{ addr.name }}</view>
        <view class="phone">{{ addr.phone }}</view>
        <view class="default-tag" v-if="addr.isDefault">默认</view>
      </view>
      <view class="addr-detail">{{ addr.detail }}</view>
    </view>
    <nut-empty description="暂无地址" v-if="!list.length" />
    <nut-button type="primary" block class="add-btn" @click="goEdit">新增地址</nut-button>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { navigateTo, navigateBack } from '@/utils/router'

const list = ref<{ name: string; phone: string; detail: string; isDefault: boolean }[]>([])

function select(addr: any) {
  // 如果是从确认订单页跳过来的，返回选中地址
  // otherwise stays
  navigateBack()
}

function goEdit() {
  navigateTo({ url: '/pagesCustomer/address/edit' })
}
</script>

<style lang="less">
.page-address { background: #f8f8f8; min-height: 100vh; padding-bottom: 120rpx; }
.addr-card { background: #fff; padding: 24rpx 32rpx; margin-bottom: 2rpx; }
.addr-top { display: flex; align-items: center; }
.name { font-size: 28rpx; font-weight: 600; }
.phone { margin-left: 16rpx; font-size: 26rpx; color: #666; }
.default-tag { margin-left: 16rpx; padding: 2rpx 12rpx; background: #fce4ec; color: #e53935; font-size: 20rpx; border-radius: 8rpx; }
.addr-detail { margin-top: 8rpx; font-size: 24rpx; color: #999; }
.add-btn { margin: 32rpx; border-radius: 48rpx; }
</style>
