<template>
  <view class="page-dashboard">
    <AppFeedbackHost />
    <view class="header" :style="headerStyle">
      <view class="greeting">👋 早上好，店长</view>
      <view class="shop-name">{{ shopStore.shopName }}</view>
    </view>

    <!-- 数据概览 -->
    <view class="stats-grid">
      <view class="stat-card" @click="goOrders('all')">
        <view class="stat-value">{{ stats.todayOrders }}</view>
        <view class="stat-label">今日订单</view>
      </view>
      <view class="stat-card highlight" @click="goOrders('pending')">
        <view class="stat-value">{{ stats.pendingOrders }}</view>
        <view class="stat-label">待处理</view>
      </view>
      <view class="stat-card" @click="goOrders('completed')">
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
        <view class="action-item" @click="go('category')">
          <view class="action-icon">🏷️</view>
          <view class="action-label">分类管理</view>
        </view>
        <view class="action-item" @click="go('verify')">
          <view class="action-icon">📱</view>
          <view class="action-label">扫码核销</view>
        </view>
        <view class="action-item" @click="go('staff')">
          <view class="action-icon">👥</view>
          <view class="action-label">人员管理</view>
        </view>
        <view class="action-item" @click="go('salesStrategy')">
          <view class="action-icon">📈</view>
          <view class="action-label">销售策略</view>
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
import { showToast } from '@/utils/feedback'
import { computed, ref } from 'vue'
import { useDidShow } from '@tarojs/taro'
import { navigateTo } from '@/utils/router'
import { getMerchantOrderStats } from '@/services/order'
import { useShopDisplay } from '@/composables/useShopDisplay'
import { useNavBarLayout } from '@/composables/useNavBarLayout'
import AppFeedbackHost from '@/components/AppFeedbackHost.vue'
import type { OrderStatus } from '@/types/order'

const shopStore = useShopDisplay({ initDb: true })
const { statusBarHeightPx } = useNavBarLayout()

const headerStyle = computed(() => ({
  paddingTop: `calc(${statusBarHeightPx.value} + 48rpx)`,
}))

const stats = ref({
  todayOrders: 0,
  pendingOrders: 0,
  todayRevenue: '0.00',
})

const statsLoading = ref(false)

useDidShow(() => {
  void loadStats()
})

async function loadStats() {
  statsLoading.value = true
  try {
    const data = await getMerchantOrderStats()
    stats.value = {
      todayOrders: data.todayOrders,
      pendingOrders: data.pendingOrders,
      todayRevenue: Number(data.todayRevenue).toFixed(2).replace(/\.00$/, ''),
    }
  } catch (err) {
    console.warn('[dashboard] load stats failed:', err)
  } finally {
    statsLoading.value = false
  }
}

function goOrders(tab: OrderStatus | 'all') {
  const query = tab === 'all' ? '' : `?status=${tab}`
  navigateTo({ url: `/pagesMerchant/order/list${query}` }).catch((err) => {
    console.error('[dashboard] navigate orders failed:', err)
  })
}

function go(page: string) {
  const routes: Record<string, string> = {
    order: '/pagesMerchant/order/list',
    goods: '/pagesMerchant/goods/list',
    category: '/pagesMerchant/category/list',
    verify: '/pagesMerchant/verify/index',
    staff: '/pagesMerchant/staff/index',
    salesStrategy: '/pagesMerchant/shop/sales-strategy/index',
    setting: '/pagesMerchant/shop/setting',
  }
  const url = routes[page]
  if (!url) return
  navigateTo({ url }).catch((err) => {
    console.error('[dashboard] navigate failed:', err)
    showToast({ title: '页面打开失败', icon: 'none' })
  })
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
  &.highlight .stat-value { color: #e53935; }
}
.section-title { padding: 32rpx 32rpx 16rpx; font-size: 28rpx; font-weight: 600; color: #333; }
.action-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; padding: 0 16rpx;
}
.action-item {
  background: #fff; border-radius: 16rpx; padding: 32rpx 16rpx; text-align: center;
  .action-icon { font-size: 56rpx; }
  .action-label { margin-top: 8rpx; font-size: 24rpx; color: #666; }
}
.preview-section { padding: 48rpx 32rpx; }
</style>
