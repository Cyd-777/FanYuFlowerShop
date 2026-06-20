<template>
  <view class="page-order-detail" :class="{ 'has-footer': canCancel }">
    <view v-if="loading" class="loading-tip">加载中…</view>

    <template v-else-if="order">
      <view class="status-bar">
        <OrderStatusSteps :status="order.status" :rider-status="order.riderStatus" />
        <view v-if="statusHint" class="status-hint">{{ statusHint }}</view>
      </view>

      <view class="section">
        <view class="section-title">收货信息</view>
        <view class="address-info">
          <view class="name">{{ order.address.name }} {{ order.address.phone }}</view>
          <view class="detail">{{ order.address.fullText }}</view>
        </view>
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

      <view v-if="order.remark" class="section">
        <view class="section-title">备注</view>
        <view class="remark-text">{{ order.remark }}</view>
      </view>

      <view class="section">
        <view class="info-row"><text class="label">订单编号</text><text>{{ order.orderNo }}</text></view>
        <view class="info-row"><text class="label">下单时间</text><text>{{ createTimeText }}</text></view>
        <view class="info-row">
          <text class="label">订单金额</text>
          <text class="price">¥{{ formatPrice(order.totalAmount) }}</text>
        </view>
      </view>
    </template>

    <view v-else class="loading-tip">{{ errorText }}</view>

    <view v-if="canCancel" class="action-bar">
      <nut-button
        class="cancel-btn"
        plain
        type="primary"
        :loading="cancelling"
        :disabled="cancelling"
        @click="confirmCancel"
      >
        取消订单
      </nut-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDidShow, useLoad } from '@tarojs/taro'
import { cancelMyOrder, getOrder } from '@/services/order'
import GoodsImage from '@/components/GoodsImage.vue'
import OrderStatusSteps from '@/components/OrderStatusSteps.vue'
import type { Order } from '@/types/order'
import { canCustomerCancelOrder, getOrderProgressLabel } from '@/types/order'

const orderId = ref('')
const order = ref<Order | null>(null)
const loading = ref(false)
const cancelling = ref(false)
const errorText = ref('订单不存在')

const canCancel = computed(() =>
  order.value ? canCustomerCancelOrder(order.value.status) : false,
)

const statusHint = computed(() => {
  if (!order.value) return ''
  if (order.value.status === 'pending') return '等待商家接单，可取消订单'
  if (order.value.status === 'accepted') return '商家已接单，正在准备制作'
  if (order.value.status === 'preparing') return '花束制作中，订单不可取消'
  if (order.value.status === 'prep_done') {
    return `制作已完成，${getOrderProgressLabel(order.value)}`
  }
  return ''
})

const createTimeText = computed(() => formatOrderTime(order.value?.createdAt))

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
  errorText.value = '订单不存在'
  try {
    order.value = await getOrder(orderId.value)
  } catch (err) {
    order.value = null
    errorText.value = err instanceof Error ? err.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function confirmCancel() {
  if (!order.value || !canCancel.value || cancelling.value) return

  wx.showModal({
    title: '取消订单',
    content: '确定取消该订单？取消后库存将恢复。',
    confirmColor: '#e53935',
    success: (res) => {
      if (res.confirm) {
        void handleCancel()
      }
    },
  })
}

async function handleCancel() {
  if (!orderId.value || cancelling.value) return

  cancelling.value = true
  try {
    order.value = await cancelMyOrder(orderId.value)
    wx.showToast({ title: '订单已取消', icon: 'success' })
  } catch (err) {
    wx.showToast({
      title: err instanceof Error ? err.message : '取消失败',
      icon: 'none',
      duration: 2500,
    })
  } finally {
    cancelling.value = false
  }
}
</script>

<style lang="less">
.page-order-detail {
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
.status-bar {
  padding: 32rpx 24rpx 28rpx;
  background: #fff;
  .status-hint {
    margin-top: 20rpx;
    text-align: center;
    font-size: 24rpx;
    color: #999;
  }
}
.section { background: #fff; padding: 24rpx; margin-top: 16rpx; }
.section-title { font-size: 28rpx; font-weight: 600; margin-bottom: 16rpx; }
.address-info {
  .name { font-size: 28rpx; color: #333; }
  .detail { font-size: 24rpx; color: #999; margin-top: 8rpx; line-height: 1.5; }
}
.goods-item { display: flex; margin-bottom: 16rpx; }
.goods-item:last-child { margin-bottom: 0; }
.thumb { width: 120rpx; height: 120rpx; border-radius: 8rpx; flex-shrink: 0; }
.info { margin-left: 16rpx; flex: 1; min-width: 0; }
.name { font-size: 26rpx; color: #333; }
.custom-summary {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #999;
  line-height: 1.5;
}
.price { font-size: 24rpx; color: #999; margin-top: 4rpx; }
.remark-text { font-size: 26rpx; color: #666; line-height: 1.5; }
.info-row { display: flex; justify-content: space-between; padding: 8rpx 0; font-size: 26rpx; gap: 24rpx; }
.info-row .label { color: #999; flex-shrink: 0; }
.info-row .price { color: #e53935; font-weight: 600; }
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16rpx 32rpx calc(16rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 2rpx solid #eee;
}
.cancel-btn {
  width: 100%;
  border-radius: 48rpx;
}
</style>
