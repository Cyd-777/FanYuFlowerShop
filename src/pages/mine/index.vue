<template>
  <view class="page-mine">
    <view class="user-card">
      <view class="avatar">{{ avatarEmoji }}</view>
      <view class="user-info">
        <view class="nickname">{{ userInfo.nickName || defaultNickname }}</view>
        <view class="merchant-badge" v-if="isMerchant">{{ merchantBadgeText }}</view>
      </view>
    </view>

    <view class="merchant-entry" v-if="isMerchant" @click="goMerchant">
      <view class="merchant-entry-icon">{{ merchantIcon }}</view>
      <view class="merchant-entry-text">
        <view class="entry-title">{{ merchantTitle }}</view>
        <view class="entry-desc">{{ merchantDesc }}</view>
      </view>
      <text class="entry-arrow">{{ entryArrow }}</text>
    </view>

    <view class="order-nav">
      <view
        v-for="item in orderNavs"
        :key="item.key"
        class="order-item"
        @click="goOrderList(item.key)"
      >
        <view class="order-icon">{{ item.icon }}</view>
        <view class="order-label">{{ item.label }}</view>
      </view>
    </view>

    <view class="menu-list">
      <view class="menu-item" @tap="showIdentityQr = true">
        <view class="menu-main">
          <view class="menu-title">{{ identityTitle }}</view>
          <view class="menu-desc">{{ identityDesc }}</view>
        </view>
        <text class="menu-arrow">{{ entryArrow }}</text>
      </view>
      <view class="menu-item" @tap="goMember">
        <view class="menu-title">{{ memberTitle }}</view>
        <text class="menu-arrow">{{ entryArrow }}</text>
      </view>
      <view class="menu-item" @tap="goFavorite">
        <view class="menu-title">{{ favoriteTitle }}</view>
        <text class="menu-arrow">{{ entryArrow }}</text>
      </view>
      <view class="menu-item" @tap="goAddress">
        <view class="menu-title">{{ addressTitle }}</view>
        <text class="menu-arrow">{{ entryArrow }}</text>
      </view>
    </view>

    <IdentityQrModal
      v-if="showIdentityQr"
      v-model:visible="showIdentityQr"
      :openid="openid"
    />

    <view class="menu-list other-list">
      <view class="menu-item" @tap="goOther">
        <view class="menu-title">{{ otherTitle }}</view>
        <text class="menu-arrow">{{ entryArrow }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDidShow } from '@tarojs/taro'
import { navigateTo } from '@/utils/router'
import { useUserStore } from '@/stores/user'
import { getCachedRole } from '@/services/auth'
import { STORAGE_KEYS } from '@/utils/constants'
import IdentityQrModal from '@/components/IdentityQrModal.vue'

const userStore = useUserStore()
const showIdentityQr = ref(false)

const avatarEmoji = '🌷'
const merchantIcon = '🏪'
const merchantTitle = '商家工作台'
const merchantDesc = '管理商品、订单与店铺'
const entryArrow = '›'
const defaultNickname = '花友'
const merchantBadgeText = '商家'
const identityTitle = '我的身份码'
const identityDesc = '扫码核销 / 添加工作人员'
const memberTitle = '会员中心'
const favoriteTitle = '我的收藏'
const addressTitle = '地址管理'
const otherTitle = '关于我们'

const userInfo = ref({
  nickName: defaultNickname,
})

const isMerchant = computed(() => userStore.isMerchant())

const openid = computed(
  () => userStore.openid || wx.getStorageSync(STORAGE_KEYS.Token) || '',
)

useDidShow(() => {
  const role = getCachedRole()
  if (role) {
    userStore.$patch({ role })
  }
})

const orderNavs = ref([
  { key: 'all', icon: '📋', label: '全部' },
  { key: 'pending', icon: '⏳', label: '待处理' },
  { key: 'processing', icon: '🌸', label: '处理中' },
  { key: 'completed', icon: '✅', label: '已完成' },
])

function goOrderList(status: string) {
  navigateTo({ url: '/pagesCustomer/order/list?status=' + status })
}

function goMember() {
  navigateTo({ url: '/pagesCustomer/member/index' })
}

function goFavorite() {
  navigateTo({ url: '/pagesCustomer/favorite/index' })
}

function goAddress() {
  navigateTo({ url: '/pagesCustomer/address/list' })
}

function goOther() {
  navigateTo({ url: '/pagesCustomer/other/index' })
}

function goMerchant() {
  navigateTo({ url: '/pagesMerchant/dashboard/index' })
}
</script>

<style lang="less">
@import '@/styles/tokens.less';

.page-mine {
  min-height: 100vh;
  background: #f8f8f8;
}
.user-card {
  display: flex;
  align-items: center;
  padding: 48rpx 32rpx;
  background: linear-gradient(135deg, #fce4ec, #f8bbd0);
  .avatar {
    width: 100rpx;
    height: 100rpx;
    border-radius: 50%;
    background: #fff;
    font-size: 56rpx;
    line-height: 100rpx;
    text-align: center;
    flex-shrink: 0;
  }
  .user-info {
    margin-left: 24rpx;
  }
  .nickname {
    font-size: 32rpx;
    font-weight: 600;
    color: #333;
  }
  .merchant-badge {
    display: inline-block;
    margin-top: 8rpx;
    padding: 2rpx 12rpx;
    font-size: 20rpx;
    color: #667eea;
    background: rgba(102, 126, 234, 0.12);
    border-radius: 8rpx;
  }
}
.merchant-entry {
  display: flex;
  align-items: center;
  margin: 16rpx 16rpx 0;
  padding: 28rpx 32rpx;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 16rpx;
  color: #fff;
  .merchant-entry-icon {
    font-size: 48rpx;
    margin-right: 20rpx;
  }
  .merchant-entry-text {
    flex: 1;
    .entry-title {
      font-size: 30rpx;
      font-weight: 600;
    }
    .entry-desc {
      margin-top: 4rpx;
      font-size: 22rpx;
      opacity: 0.85;
    }
  }
  .entry-arrow {
    font-size: 40rpx;
    opacity: 0.8;
  }
}
.order-nav {
  display: flex;
  background: #fff;
  padding: 24rpx 0;
  margin-bottom: 16rpx;
  .order-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    .order-icon { font-size: 40rpx; }
    .order-label { margin-top: 8rpx; font-size: 24rpx; color: #666; }
  }
}
.menu-list {
  background: @color-bg-card;
  margin-bottom: 16rpx;
}
.menu-item {
  display: flex;
  align-items: center;
  padding: 28rpx 32rpx;
  border-bottom: 2rpx solid @color-border;
  &:last-child {
    border-bottom: none;
  }
}
.menu-main {
  flex: 1;
}
.menu-title {
  font-size: @font-size-lg;
  color: @color-text-primary;
}
.menu-desc {
  margin-top: 6rpx;
  font-size: @font-size-sm;
  color: @color-text-tertiary;
}
.menu-arrow {
  font-size: 36rpx;
  color: @color-text-placeholder;
  margin-left: 16rpx;
}
.other-list {
  margin-top: 16rpx;
}
</style>
