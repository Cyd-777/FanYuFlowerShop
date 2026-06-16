<template>
  <view class="login-page">
    <image class="logo" src="/images/logo.png" mode="aspectFit" />
    <view class="title">梵宇花店</view>
    <view class="desc">每一束花，都是一次心动</view>
    <nut-button
      class="login-btn"
      type="primary"
      block
      :loading="loading"
      @click="handleLogin"
    >
      微信一键登录
    </nut-button>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { navigateToHome } from '@/services/auth'

const loading = ref(false)
const userStore = useUserStore()

async function handleLogin() {
  if (loading.value) return
  loading.value = true
  try {
    const { role } = await userStore.doLogin()
    navigateToHome(role)
  } catch (err) {
    wx.showToast({ title: '登录失败，请重试', icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<style lang="less">
.login-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
  min-height: 100vh;
  background: linear-gradient(180deg, #fce4ec 0%, #fff 40%);
}
.logo {
  width: 160rpx;
  height: 160rpx;
  border-radius: 32rpx;
}
.title {
  margin-top: 32rpx;
  font-size: 48rpx;
  font-weight: 600;
  color: #333;
}
.desc {
  margin-top: 16rpx;
  font-size: 28rpx;
  color: #999;
}
.login-btn {
  position: fixed;
  bottom: 120rpx;
  left: 64rpx;
  right: 64rpx;
  width: auto;
  border-radius: 48rpx;
}
</style>
