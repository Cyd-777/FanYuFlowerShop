<template>
  <view class="page-address">
    <view v-if="list.length" class="addr-list">
      <view
        v-for="item in list"
        :key="item.id"
        class="addr-card"
        @click="handleCardClick(item)"
      >
        <view class="addr-main">
          <view class="addr-top">
            <view class="name">{{ item.name }}</view>
            <view class="phone">{{ item.phone }}</view>
            <view class="default-tag" v-if="item.isDefault">默认</view>
          </view>
          <view class="addr-detail">{{ formatAddressLine(item) }}</view>
        </view>
        <view v-if="!fromConfirm" class="addr-actions" @click.stop>
          <text class="action-btn" @click="goEdit(item.id)">编辑</text>
        </view>
      </view>
    </view>

    <nut-empty v-else description="还没有收货地址，请先添加" />

    <view class="footer">
      <nut-button type="primary" block class="add-btn" @click="goEdit()">新增地址</nut-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useDidShow, useLoad } from '@tarojs/taro'
import { navigateTo, navigateBack } from '@/utils/router'
import { listAddresses, setCheckoutAddress, formatAddressLine } from '@/services/address'
import type { UserAddress } from '@/types/address'

const list = ref<UserAddress[]>([])
const fromConfirm = ref(false)

useLoad((options) => {
  fromConfirm.value = options?.from === 'confirm'
})

useDidShow(() => {
  list.value = listAddresses()
})

function handleCardClick(item: UserAddress) {
  if (fromConfirm.value) {
    setCheckoutAddress(item.id)
    navigateBack()
    return
  }
  goEdit(item.id)
}

function goEdit(id?: string) {
  const url = id
    ? `/pagesCustomer/address/edit?id=${encodeURIComponent(id)}`
    : '/pagesCustomer/address/edit'
  navigateTo({ url })
}
</script>

<style lang="less">
@import '@/styles/tokens.less';

.page-address {
  min-height: 100vh;
  padding-bottom: 140rpx;
  background: @color-bg-page;
}
.addr-list {
  padding-top: 16rpx;
}
.addr-card {
  display: flex;
  align-items: center;
  margin: 0 16rpx 16rpx;
  padding: 24rpx 32rpx;
  background: @color-bg-card;
  border-radius: @radius-md;
}
.addr-main {
  flex: 1;
  min-width: 0;
}
.addr-top {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}
.name {
  font-size: 28rpx;
  font-weight: 600;
  color: @color-text-primary;
}
.phone {
  margin-left: 16rpx;
  font-size: 26rpx;
  color: @color-text-secondary;
}
.default-tag {
  margin-left: 16rpx;
  padding: 2rpx 12rpx;
  background: @color-primary-light;
  color: @color-primary;
  font-size: 20rpx;
  border-radius: @radius-sm;
}
.addr-detail {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: @color-text-tertiary;
  line-height: 1.5;
}
.addr-actions {
  flex-shrink: 0;
  margin-left: 16rpx;
}
.action-btn {
  font-size: 24rpx;
  color: @color-primary;
}
.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 16rpx 32rpx calc(16rpx + env(safe-area-inset-bottom));
  background: @color-bg-card;
  border-top: 2rpx solid @color-border;
}
.add-btn {
  border-radius: @radius-pill;
  height: 88rpx;
  font-size: 30rpx;
}
</style>
