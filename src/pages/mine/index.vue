<template>
  <view class="page-mine">
    <!-- 用户信息 -->
    <view class="user-card">
      <view class="avatar">
        <image src="{{ userInfo.avatarUrl }}" mode="aspectFill" />
      </view>
      <view class="nickname">{{ userInfo.nickName || '未登录' }}</view>
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
      <nut-cell title="会员中心" is-link @click="goMember" />
      <nut-cell title="我的收藏" is-link @click="goFavorite" />
      <nut-cell title="地址管理" is-link @click="goAddress" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { navigateTo } from '@/utils/router'

const userInfo = ref({
  avatarUrl: '/images/default-avatar.png',
  nickName: '花友',
})

const orderNavs = ref([
  { key: 'all', icon: '📋', label: '全部' },
  { key: 'pending', icon: '⏳', label: '待付款' },
  { key: 'shipped', icon: '🚚', label: '待收货' },
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
</script>

<style lang="less">
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
    overflow: hidden;
    border: 4rpx solid #fff;
    image { width: 100%; height: 100%; }
  }
  .nickname {
    margin-left: 24rpx;
    font-size: 32rpx;
    font-weight: 600;
    color: #333;
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
  background: #fff;
}
</style>
