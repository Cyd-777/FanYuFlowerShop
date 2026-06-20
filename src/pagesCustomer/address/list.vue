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
          <text class="action-btn danger" @click="handleRemove(item.id)">删除</text>
        </view>
      </view>
    </view>

    <nut-empty v-else description="还没有收货地址，请从微信添加" />

    <view class="footer">
      <nut-button
        type="primary"
        block
        class="add-btn"
        :loading="importing"
        @click="addFromWechat"
      >
        从微信添加地址
      </nut-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useDidShow, useLoad } from '@tarojs/taro'
import { navigateTo, navigateBack } from '@/utils/router'
import {
  listAddresses,
  setCheckoutAddress,
  formatAddressLine,
  hydrateAddressesFromCloud,
  importWechatAddressAndSave,
  removeAddress,
  handleLocationError,
} from '@/services/address'
import type { UserAddress } from '@/types/address'

const list = ref<UserAddress[]>([])
const fromConfirm = ref(false)
const importing = ref(false)

useLoad((options) => {
  fromConfirm.value = options?.from === 'confirm'
})

useDidShow(() => {
  list.value = listAddresses()
  void hydrateAddressesFromCloud().then((merged) => {
    list.value = merged
  })
})

function handleCardClick(item: UserAddress) {
  if (fromConfirm.value) {
    setCheckoutAddress(item.id)
    navigateBack()
    return
  }
  goEdit(item.id)
}

function goEdit(id: string) {
  navigateTo({ url: `/pagesCustomer/address/edit?id=${encodeURIComponent(id)}` })
}

async function addFromWechat() {
  if (importing.value) return

  importing.value = true
  try {
    const saved = await importWechatAddressAndSave()
    list.value = listAddresses()
    wx.showToast({ title: '地址已保存', icon: 'success' })

    if (fromConfirm.value) {
      setCheckoutAddress(saved.id)
      setTimeout(() => navigateBack(), 500)
    }
  } catch (err) {
    handleLocationError(err, '添加地址失败')
  } finally {
    importing.value = false
  }
}

async function handleRemove(id: string) {
  const { confirm } = await new Promise<{ confirm: boolean }>((resolve) => {
    wx.showModal({
      title: '删除地址',
      content: '确定删除这条收货地址吗？',
      success: (r) => resolve({ confirm: r.confirm }),
    })
  })
  if (!confirm) return

  removeAddress(id)
  list.value = listAddresses()
  wx.showToast({ title: '已删除', icon: 'success' })
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
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.action-btn {
  font-size: 24rpx;
  color: @color-primary;
  &.danger {
    color: @color-primary;
  }
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
