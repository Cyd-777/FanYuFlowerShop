<template>
  <view class="page-mine" id="mine-page-scroll-body">
    <AppFeedbackHost />
    <view class="user-card" :style="userCardStyle" @tap="onUserCardTap">
      <template v-if="isLoggedIn">
        <image
          v-if="avatarDisplay"
          class="avatar-img"
          :src="avatarDisplay"
          mode="aspectFill"
        />
        <view v-else class="avatar">{{ avatarEmoji }}</view>
        <view class="user-info">
          <view class="nickname">{{ displayNickName }}</view>
          <view class="edit-hint">{{ editHintText }} {{ entryArrow }}</view>
          <view class="merchant-badge" v-if="isMerchant">{{ merchantBadgeText }}</view>
        </view>
      </template>
      <template v-else>
        <view class="avatar guest">{{ avatarEmoji }}</view>
        <view class="user-info">
          <view class="nickname">{{ guestNicknameText }}</view>
          <view class="guest-desc">{{ guestLoginHintText }}</view>
        </view>
      </template>
      <text v-if="isLoggedIn" class="card-arrow">{{ entryArrow }}</text>
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

    <view class="menu-list" v-if="!isMerchant">
      <view class="menu-item" @tap="goJoinStaff">
        <view class="menu-main">
          <view class="menu-title">{{ joinStaffTitle }}</view>
          <view class="menu-desc">{{ joinStaffDesc }}</view>
        </view>
        <text class="menu-arrow">{{ entryArrow }}</text>
      </view>
    </view>

    <view class="menu-list">
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

    <view class="menu-list other-list">
      <view class="menu-item" @tap="goFeedback">
        <view class="menu-title">{{ feedbackTitle }}</view>
        <text class="menu-arrow">{{ entryArrow }}</text>
      </view>
      <view class="menu-item" @tap="goOther">
        <view class="menu-title">{{ otherTitle }}</view>
        <text class="menu-arrow">{{ entryArrow }}</text>
      </view>
    </view>
    <ScrollListTailSpacer
      content-selector="#mine-page-scroll-body"
      tab-bar
      :watch-key="isLoggedIn"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDidShow } from '@tarojs/taro'
import { navigateTo } from '@/utils/router'
import { useUserStore } from '@/stores/user'
import { getCachedRole, hasToken } from '@/services/auth'
import { fetchUserProfile, resolveAvatarDisplayPath } from '@/services/userProfile'
import { STORAGE_KEYS } from '@/utils/constants'
import { useNavBarLayout } from '@/composables/useNavBarLayout'
import { useCartTabBadgeSync } from '@/composables/useCartTabBadgeSync'
import AppFeedbackHost from '@/components/AppFeedbackHost.vue'

const { statusBarHeightPx } = useNavBarLayout()

const userCardStyle = computed(() => ({
  paddingTop: `calc(${statusBarHeightPx.value} + 48rpx)`,
}))

const userStore = useUserStore()

const avatarEmoji = '🌷'
const editHintText = '编辑资料'
const guestNicknameText = '未登录'
const guestLoginHintText = '点击登录'
const merchantIcon = '🏪'
const merchantTitle = '商家工作台'
const merchantDesc = '管理商品、订单与店铺'
const entryArrow = '›'
const defaultNickname = '花友'
const merchantBadgeText = '商家'
const memberTitle = '会员中心'
const favoriteTitle = '我的收藏'
const addressTitle = '地址管理'
const feedbackTitle = 'Bug 反馈'
const otherTitle = '关于我们'
const joinStaffTitle = '输入邀请码'
const joinStaffDesc = '输入店长发来的邀请码，自行加入商家团队'

const isLoggedIn = ref(hasToken())
const displayNickName = ref(defaultNickname)
const avatarDisplay = ref('')

useCartTabBadgeSync()

useDidShow(() => {
  isLoggedIn.value = hasToken()
  const role = getCachedRole()
  if (role) {
    userStore.$patch({ role })
  }
  if (isLoggedIn.value) {
    void refreshProfileDisplay()
  } else {
    displayNickName.value = defaultNickname
    avatarDisplay.value = ''
  }
})

const isMerchant = computed(() => userStore.isMerchant())

const orderNavs = ref([
  { key: 'all', icon: '📋', label: '全部' },
  { key: 'pending', icon: '⏳', label: '待处理' },
  { key: 'processing', icon: '🌸', label: '处理中' },
  { key: 'completed', icon: '✅', label: '已完成' },
])

async function refreshProfileDisplay() {
  const cached = userStore.profile || wx.getStorageSync(STORAGE_KEYS.UserInfo)
  if (cached && typeof cached === 'object') {
    displayNickName.value = cached.nickName?.trim() || defaultNickname
    avatarDisplay.value = cached.avatarUrl
      ? await resolveAvatarDisplayPath(cached.avatarUrl)
      : ''
  }

  try {
    const profile = await fetchUserProfile()
    displayNickName.value = profile.nickName?.trim() || defaultNickname
    avatarDisplay.value = profile.avatarUrl
      ? await resolveAvatarDisplayPath(profile.avatarUrl)
      : ''
    userStore.$patch({ profile })
    wx.setStorageSync(STORAGE_KEYS.UserInfo, profile)
  } catch (err) {
    console.warn('[mine] fetch profile failed:', err)
  }
}

function onUserCardTap() {
  if (isLoggedIn.value) {
    navigateTo({ url: '/pagesCustomer/profile/edit' })
    return
  }
  navigateTo({ url: '/pages/login/index' })
}

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

function goFeedback() {
  navigateTo({ url: '/pagesCustomer/feedback/index' })
}

function goOther() {
  navigateTo({ url: '/pagesCustomer/other/index' })
}

function goJoinStaff() {
  if (!isLoggedIn.value) {
    navigateTo({ url: '/pages/login/index' })
    return
  }
  navigateTo({ url: '/pages/invite/join/index' })
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
  .avatar,
  .avatar-img {
    width: 100rpx;
    height: 100rpx;
    border-radius: 50%;
    background: #fff;
    flex-shrink: 0;
  }
  .avatar {
    font-size: 56rpx;
    line-height: 100rpx;
    text-align: center;
  }
  .user-info {
    flex: 1;
    margin-left: 24rpx;
    min-width: 0;
  }
  .nickname {
    font-size: 32rpx;
    font-weight: 600;
    color: #333;
  }
  .edit-hint {
    margin-top: 8rpx;
    font-size: 24rpx;
    color: #888;
  }
  .guest-desc {
    margin-top: 8rpx;
    font-size: 24rpx;
    color: #666;
  }
  .card-arrow {
    font-size: 40rpx;
    color: #bbb;
    margin-left: 8rpx;
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
  box-sizing: border-box;
  max-width: calc(100% - 32rpx);
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
