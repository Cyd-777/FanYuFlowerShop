<template>
  <view class="login-page">
    <view class="logo">{{ logoEmoji }}</view>
    <view class="title">{{ shopStore.shopName }}</view>
    <view class="desc">{{ descText }}</view>
    <view
      class="login-btn"
      :class="{ loading: loading }"
      @tap="handleLogin"
    >
      {{ loading ? loadingText : loginText }}
    </view>
    <view class="tip" v-if="errorMsg">{{ errorMsg }}</view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useShopStore } from '@/stores/shop'
import { navigateToHome, hasToken, getCachedRole } from '@/services/auth'

const logoEmoji = '🌷'
const descText = '每一束花，都是一次心动'
const loginText = '微信一键登录'
const loadingText = '登录中...'

const loading = ref(false)
const errorMsg = ref('')
const userStore = useUserStore()
const shopStore = useShopStore()

onMounted(() => {
  void shopStore.hydrate()
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
  } catch (err: unknown) {
    console.error('[login] failed:', err)
    const msg = err instanceof Error ? err.message : (err as { errMsg?: string })?.errMsg || '登录失败，请重试'
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
@import '@/styles/tokens.less';

.login-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
  min-height: 100vh;
  background: linear-gradient(180deg, @color-primary-light 0%, @color-bg-card 40%);
}
.logo {
  width: 160rpx;
  height: 160rpx;
  border-radius: 32rpx;
  font-size: 100rpx;
  line-height: 160rpx;
  text-align: center;
  background: @color-bg-card;
}
.title {
  margin-top: 32rpx;
  font-size: 48rpx;
  font-weight: 600;
  color: @color-text-primary;
}
.desc {
  margin-top: 16rpx;
  font-size: 28rpx;
  color: @color-text-tertiary;
}
.login-btn {
  position: fixed;
  bottom: 160rpx;
  left: 64rpx;
  right: 64rpx;
  height: 96rpx;
  line-height: 96rpx;
  text-align: center;
  border-radius: @radius-pill;
  font-size: 30rpx;
  color: #fff;
  background: @color-primary;
  &.loading {
    opacity: 0.7;
  }
}
.tip {
  position: fixed;
  bottom: 80rpx;
  left: 64rpx;
  right: 64rpx;
  font-size: 24rpx;
  color: @color-primary;
  text-align: center;
  line-height: 1.5;
}
</style>
