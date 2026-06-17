<template>
  <view class="login-page">
    <view class="logo">🌷</view>
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
    <view class="tip" v-if="errorMsg">{{ errorMsg }}</view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { navigateToHome, hasToken, getCachedRole } from '@/services/auth'

const loading = ref(false)
const errorMsg = ref('')
const userStore = useUserStore()

onMounted(() => {
  try {
    if (hasToken()) {
      const role = getCachedRole()
      if (role) navigateToHome(role)
    }
  } catch (err) {
    console.error('[login] auto redirect failed:', err)
  }
})

async function handleLogin() {
  if (loading.value) return
  loading.value = true
  errorMsg.value = ''
  try {
    const { role } = await userStore.doLogin()
    navigateToHome(role)
  } catch (err: any) {
    console.error('[login] failed:', err)
    const msg = err?.message || err?.errMsg || '登录失败，请重试'
    errorMsg.value = msg
    wx.showModal({
      title: '登录失败',
      content: msg,
      showCancel: false,
    })
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
  font-size: 100rpx;
  line-height: 160rpx;
  text-align: center;
  background: #fff;
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
  bottom: 160rpx;
  left: 64rpx;
  right: 64rpx;
  width: auto;
  border-radius: 48rpx;
}
.tip {
  position: fixed;
  bottom: 80rpx;
  left: 64rpx;
  right: 64rpx;
  font-size: 24rpx;
  color: #e53935;
  text-align: center;
  line-height: 1.5;
}
</style>
