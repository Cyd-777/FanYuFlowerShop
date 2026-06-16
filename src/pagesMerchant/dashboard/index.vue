<template>
  <view class="page-dashboard">
    <view class="header">
      <view class="greeting">👋 早上好，店长</view>
      <view class="shop-name">梵宇花店</view>
    </view>

    <!-- 数据概览 -->
    <view class="stats-grid">
      <view class="stat-card">
        <view class="stat-value">{{ stats.todayOrders }}</view>
        <view class="stat-label">今日订单</view>
      </view>
      <view class="stat-card">
        <view class="stat-value">{{ stats.pendingOrders }}</view>
        <view class="stat-label">待处理</view>
      </view>
      <view class="stat-card">
        <view class="stat-value">{{ stats.todayRevenue }}</view>
        <view class="stat-label">今日收入(¥)</view>
      </view>
    </view>

    <!-- 快捷功能入口 -->
    <view class="quick-actions">
      <view class="section-title">⚡ 快捷入口</view>
      <view class="action-grid">
        <view class="action-item" @click="go('order')">
          <view class="action-icon">📋</view>
          <view class="action-label">订单管理</view>
        </view>
        <view class="action-item" @click="go('goods')">
          <view class="action-icon">🌷</view>
          <view class="action-label">商品管理</view>
        </view>
        <view class="action-item" @click="go('verify')">
          <view class="action-icon">📱</view>
          <view class="action-label">扫码核销</view>
        </view>
        <view class="action-item" @click="go('setting')">
          <view class="action-icon">⚙️</view>
          <view class="action-label">店铺设置</view>
        </view>
      </view>
    </view>

    <!-- 商家预览客户端的入口 -->
    <view class="preview-section">
      <nut-button block plain @click="previewCustomer">👀 预览顾客端</nut-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { navigateTo } from '@/utils/router'
import { UserRole } from '@/utils/constants'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const stats = ref({
  todayOrders: 0,
  pendingOrders: 0,
  todayRevenue: '0.00',
})

function go(page: string) {
  const routes: Record<string, string> = {
    order: '/pagesMerchant/order/list',
    goods: '/pagesMerchant/goods/list',
    verify: '/pagesMerchant/verify/index',
    setting: '/pagesMerchant/shop/setting',
  }
  navigateTo({ url: routes[page] })
}

function previewCustomer() {
  // 切换预览顾客端，但保留商家身份
  wx.switchTab({ url: '/pages/home/index' })
}
</script>

<style lang="less">
.page-dashboard { background: #f8f8f8; min-height: 100vh; }
.header {
  padding: 48rpx 32rpx 32rpx;
  background: linear-gradient(135deg, #667eea, #764ba2);
  .greeting { font-size: 36rpx; font-weight: 600; color: #fff; }
  .shop-name { margin-top: 8rpx; font-size: 28rpx; color: rgba(255,255,255,0.8); }
}
.stats-grid { display: flex; gap: 16rpx; margin: -32rpx 16rpx 16rpx; }
.stat-card {
  flex: 1; background: #fff; border-radius: 16rpx; padding: 24rpx 16rpx; text-align: center;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
  .stat-value { font-size: 40rpx; font-weight: 700; color: #333; }
  .stat-label { margin-top: 4rpx; font-size: 22rpx; color: #999; }
}
.section-title { padding: 32rpx 32rpx 16rpx; font-size: 28rpx; font-weight: 600; color: #333; }
.action-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 16rpx; padding: 0 16rpx;
}
.action-item {
  background: #fff; border-radius: 16rpx; padding: 32rpx 16rpx; text-align: center;
  .action-icon { font-size: 56rpx; }
  .action-label { margin-top: 8rpx; font-size: 24rpx; color: #666; }
}
.preview-section { padding: 48rpx 32rpx; }
</style>
