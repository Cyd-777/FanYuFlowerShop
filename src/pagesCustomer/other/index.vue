<template>
  <view class="page-other">
    <AppNavBar />
    <view class="shop-header">
      <view class="shop-logo">🌷</view>
      <view class="shop-name">{{ shopName }}</view>
      <view class="shop-tagline">{{ uiText_79f79a }}</view>
    </view>

    <view class="section">
      <view class="section-title">{{ uiText_ca3282 }}</view>
      <view class="info-row">
        <text class="label">{{ uiText_09a1f6 }}</text>
        <text
          class="value"
          :class="{ link: phone }"
          @tap="callPhone"
        >
          {{ phone || '暂未设置' }}
        </text>
      </view>
      <view class="info-row">
        <text class="label">{{ uiText_cc3307 }}</text>
        <text class="value">{{ businessHours }}</text>
      </view>
      <view class="info-row info-row-block">
        <text class="label">{{ uiText_c29950 }}</text>
        <text class="value multiline">{{ deliveryNote || '暂未设置' }}</text>
      </view>
    </view>

    <view class="section">
      <view class="section-title">{{ uiText_53cab4 }}</view>
      <view class="info-row">
        <text class="label">{{ uiText_e0caaf }}</text>
        <text class="value">{{ roleLabel }}</text>
      </view>
    </view>

    <view class="section">
      <view class="logout-btn" @tap="handleLogout">{{ logoutText }}</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDidShow } from '@tarojs/taro'
import { useUserStore } from '@/stores/user'
import { useShopStore } from '@/stores/shop'
import { logout } from '@/modules/auth'

const uiText_09a1f6 = '联系电话'
const uiText_53cab4 = '账号信息'
const uiText_79f79a = '每一束花，都是一次心动'
const uiText_c29950 = '配送说明'
const uiText_ca3282 = '门店信息'
const uiText_cc3307 = '营业时间'
const uiText_e0caaf = '当前身份'

const userStore = useUserStore()
const shopStore = useShopStore()

const logoutText = '退出登录'
const roleLabel = computed(() => (userStore.isMerchant() ? '商家' : '顾客'))
const shopName = computed(() => shopStore.shopName)
const phone = computed(() => shopStore.settings.phone?.trim() || '')
const businessHours = computed(() => {
  const { openTime, closeTime } = shopStore.settings
  if (!openTime && !closeTime) return '暂未设置'
  return `${openTime || '--:--'} - ${closeTime || '--:--'}`
})
const deliveryNote = computed(() => shopStore.settings.deliveryNote?.trim() || '')

useDidShow(() => {
  void shopStore.hydrate()
})

function callPhone() {
  if (!phone.value) return
  wx.makePhoneCall({ phoneNumber: phone.value })
}

function handleLogout() {
  logout()
  userStore.$patch({ isLoggedIn: false, role: null, userId: '' })
  wx.reLaunch({ url: '/pages/login/index' })
}
</script>

<style lang="less">
@import '@/styles/tokens.less';

.page-other {
  min-height: 100vh;
  background: @color-bg-page;
  padding: 16rpx;
}
.shop-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 32rpx 40rpx;
  margin-bottom: 16rpx;
  background: linear-gradient(180deg, @color-primary-light 0%, @color-bg-card 100%);
  border-radius: @radius-md;
}
.shop-logo {
  width: 120rpx;
  height: 120rpx;
  line-height: 120rpx;
  text-align: center;
  font-size: 72rpx;
  background: @color-bg-card;
  border-radius: @radius-lg;
}
.shop-name {
  margin-top: 20rpx;
  font-size: 36rpx;
  font-weight: 600;
  color: @color-text-primary;
}
.shop-tagline {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: @color-text-tertiary;
}
.section {
  background: @color-bg-card;
  border-radius: @radius-md;
  padding: 24rpx 32rpx;
  margin-bottom: 16rpx;
}
.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: @color-text-primary;
  margin-bottom: 8rpx;
}
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16rpx 0;
  font-size: 26rpx;
  .label {
    color: @color-text-tertiary;
    flex-shrink: 0;
    margin-right: 24rpx;
  }
  .value {
    color: @color-text-primary;
    text-align: right;
    flex: 1;
  }
  .value.link {
    color: @color-primary;
  }
  .value.multiline {
    text-align: left;
    line-height: 1.6;
    white-space: pre-wrap;
  }
}
.info-row-block {
  flex-direction: column;
  .value {
    margin-top: 8rpx;
    text-align: left;
  }
}
.logout-btn {
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  border-radius: @radius-pill;
  font-size: 30rpx;
  color: @color-primary;
  border: 2rpx solid @color-primary;
  background: @color-bg-card;
}
</style>
