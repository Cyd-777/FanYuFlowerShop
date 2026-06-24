<template>
  <view class="page-merchant-order-detail" :class="{ 'has-footer': showActions }">
    <AppNavBar />
    <view v-if="loading" class="loading-tip">加载中…</view>

    <template v-else-if="order">
      <view class="status-section">
        <OrderStatusSteps :status="order.status" :rider-status="order.riderStatus" />
      </view>

      <view class="section">
        <view class="section-title">订单信息</view>
        <view class="info-row">
          <text class="label">订单编号</text>
          <text>{{ order.orderNo }}</text>
        </view>
        <view class="info-row">
          <text class="label">下单时间</text>
          <text>{{ createTimeText }}</text>
        </view>
        <view class="info-row">
          <text class="label">当前进度</text>
          <text class="status">{{ progressLabel }}</text>
        </view>
        <view class="info-row">
          <text class="label">订单金额</text>
          <text class="price">¥{{ formatPrice(order.totalAmount) }}</text>
        </view>
      </view>

      <view class="section">
        <view class="section-title">顾客信息</view>
        <view class="info-row">
          <text class="label">收货人</text>
          <text>{{ order.address.name }}</text>
        </view>
        <view class="info-row">
          <text class="label">联系电话</text>
          <text>{{ order.address.phone }}</text>
        </view>
        <view class="info-row address-row">
          <text class="label">收货地址</text>
          <text class="address-text">{{ order.address.fullText }}</text>
        </view>
      </view>

      <view v-if="order.remark" class="section">
        <view class="section-title">备注</view>
        <view class="remark-text">{{ order.remark }}</view>
      </view>

      <view class="section">
        <view class="section-title">商品信息</view>
        <view v-for="item in order.items" :key="item.lineKey" class="goods-item">
          <GoodsImage :src="item.image" root-class="thumb" />
          <view class="info">
            <view class="name">{{ item.name }}</view>
            <view v-if="item.customSummary" class="custom-summary">{{ item.customSummary }}</view>
            <view class="price">¥{{ formatPrice(item.price) }} x {{ item.count }}</view>
          </view>
        </view>
      </view>
    </template>

    <view v-else class="loading-tip">{{ errorText }}</view>

    <view v-if="showActions" class="action-bar">
      <nut-button
        v-if="shopActionLabel"
        class="action-btn"
        type="primary"
        :loading="updating"
        @click="handleShopAction"
      >
        {{ shopActionLabel }}
      </nut-button>
      <nut-button
        v-if="riderActionLabel"
        class="action-btn secondary"
        plain
        type="primary"
        :loading="updating"
        @click="handleRiderAction"
      >
        {{ riderActionLabel }}
      </nut-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { showToast } from '@/utils/feedback'
import { computed, ref } from 'vue'
import { useDidShow, useLoad } from '@tarojs/taro'
import {
  getMerchantRiderActionLabel,
  getMerchantShopActionLabel,
  getOrder,
  performMerchantShopAction,
  updateRiderStatus,
} from '@/services/order'
import GoodsImage from '@/components/GoodsImage.vue'
import OrderStatusSteps from '@/components/OrderStatusSteps.vue'
import type { Order } from '@/types/order'
import { getNextRiderStatus, getOrderProgressLabel } from '@/types/order'

const orderId = ref('')
const order = ref<Order | null>(null)
const loading = ref(false)
const updating = ref(false)
const errorText = ref('订单不存在')

const progressLabel = computed(() =>
  order.value ? getOrderProgressLabel(order.value) : '',
)

const shopActionLabel = computed(() =>
  order.value ? getMerchantShopActionLabel(order.value) : null,
)

const riderActionLabel = computed(() =>
  order.value ? getMerchantRiderActionLabel(order.value) : null,
)

const createTimeText = computed(() => formatOrderTime(order.value?.createdAt))

const showActions = computed(
  () => Boolean(shopActionLabel.value || riderActionLabel.value),
)

useLoad((options) => {
  orderId.value = typeof options?.id === 'string' ? options.id : ''
})

useDidShow(() => {
  void loadOrder()
})

function formatPrice(price: number) {
  return Number(price).toFixed(2).replace(/\.00$/, '')
}

function formatOrderTime(value: Order['createdAt']) {
  if (value == null) return '—'
  const date = value instanceof Date ? value : new Date(value as string | number)
  if (Number.isNaN(date.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

async function loadOrder() {
  if (!orderId.value) {
    order.value = null
    errorText.value = '缺少订单 ID'
    return
  }

  loading.value = true
  try {
    order.value = await getOrder(orderId.value)
  } catch (err) {
    order.value = null
    errorText.value = err instanceof Error ? err.message : '加载失败'
  } finally {
    loading.value = false
  }
}

async function handleShopAction() {
  if (!orderId.value || !order.value || updating.value) return

  const label = shopActionLabel.value
  if (!label) return

  if (order.value.status === 'preparing') {
    wx.showModal({
      title: '制作完成',
      content: '确认花束已制作完成？完成后将等待骑手取货。',
      success: (res) => {
        if (res.confirm) {
          void doShopAction()
        }
      },
    })
    return
  }

  if (order.value.status === 'accepted') {
    wx.showModal({
      title: '确认订单信息',
      content: '店员确认订单信息无误后，将开始制作并同步呼叫骑手。',
      success: (res) => {
        if (res.confirm) {
          void doShopAction()
        }
      },
    })
    return
  }

  void doShopAction()
}

async function doShopAction() {
  if (!orderId.value || !order.value || updating.value) return
  updating.value = true
  try {
    order.value = await performMerchantShopAction(orderId.value, order.value)
    showToast({ title: '操作成功', icon: 'success' })
  } catch (err) {
    showToast({
      title: err instanceof Error ? err.message : '操作失败',
      icon: 'none',
    })
  } finally {
    updating.value = false
  }
}

async function handleRiderAction() {
  if (!orderId.value || !order.value || updating.value) return
  const next = getNextRiderStatus(order.value.riderStatus)
  if (!next) return

  updating.value = true
  try {
    order.value = await updateRiderStatus(orderId.value, next)
    showToast({
      title: next === 'delivered' ? '订单已完成' : '配送状态已更新',
      icon: 'success',
    })
  } catch (err) {
    showToast({
      title: err instanceof Error ? err.message : '操作失败',
      icon: 'none',
    })
  } finally {
    updating.value = false
  }
}
</script>

<style lang="less">
.page-merchant-order-detail {
  background: #f8f8f8;
  min-height: 100vh;
  &.has-footer {
    padding-bottom: 120rpx;
  }
}
.loading-tip {
  padding: 80rpx 32rpx;
  text-align: center;
  font-size: 26rpx;
  color: #999;
}
.status-section {
  background: #fff;
  padding: 32rpx 24rpx 28rpx;
  margin-bottom: 16rpx;
}
.section {
  background: #fff;
  padding: 24rpx;
  margin-bottom: 16rpx;
}
.section-title {
  font-size: 28rpx;
  font-weight: 600;
  margin-bottom: 16rpx;
}
.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8rpx 0;
  font-size: 26rpx;
  gap: 24rpx;
}
.info-row .label {
  color: #999;
  flex-shrink: 0;
}
.info-row .status {
  color: #e53935;
  font-weight: 600;
}
.info-row .price {
  color: #e53935;
  font-weight: 600;
}
.address-row {
  align-items: flex-start;
}
.address-text {
  flex: 1;
  text-align: right;
  line-height: 1.5;
}
.remark-text {
  font-size: 26rpx;
  color: #666;
  line-height: 1.5;
}
.goods-item {
  display: flex;
  margin-bottom: 16rpx;
}
.goods-item:last-child {
  margin-bottom: 0;
}
.thumb {
  width: 120rpx;
  height: 120rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
}
.info {
  margin-left: 16rpx;
  flex: 1;
  min-width: 0;
}
.name {
  font-size: 26rpx;
  color: #333;
}
.custom-summary {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #999;
  line-height: 1.5;
}
.price {
  font-size: 24rpx;
  color: #999;
  margin-top: 4rpx;
}
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16rpx 32rpx calc(16rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 2rpx solid #eee;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.action-btn {
  width: 100%;
  border-radius: 48rpx;
}
.action-btn.secondary {
  border-color: #ff7043;
  color: #ff7043;
}
</style>
