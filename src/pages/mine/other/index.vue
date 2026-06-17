<template>
  <view class="page-other">
    <view class="section">
      <view class="section-title">账号信息</view>
      <view class="info-row">
        <text class="label">当前身份</text>
        <text class="value">{{ roleLabel }}</text>
      </view>
    </view>

    <view class="section">
      <nut-button block plain @click="handleLogout">退出登录</nut-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { logout } from '@/services/auth'

const userStore = useUserStore()

const roleLabel = computed(() => (userStore.isMerchant() ? '商家' : '顾客'))

function handleLogout() {
  logout()
  userStore.$patch({ isLoggedIn: false, role: null, openid: '' })
  wx.reLaunch({ url: '/pages/login/index' })
}
</script>

<style lang="less">
.page-other {
  min-height: 100vh;
  background: #f8f8f8;
  padding: 16rpx;
}
.section {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx 32rpx;
  margin-bottom: 16rpx;
}
.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
}
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16rpx 0;
  font-size: 26rpx;
  .label { color: #999; flex-shrink: 0; margin-right: 24rpx; }
  .value { color: #333; text-align: right; }
}
</style>
