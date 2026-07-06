<template>
  <view class="page-merchant-order-detail" :class="{ 'has-footer': showActions }" id="merchant-order-detail-scroll-body">
    <AppNavBar />
    <view v-if="loading" class="loading-tip">{{ loadingTipText }}</view>

    <template v-else-if="order">
      <view class="status-section">
        <OrderStatusSteps :status="order.status" :rider-status="order.riderStatus" :delivery-method="order.deliveryMethod" :merchant-delivery="order.merchantDelivery" />
      </view>

      <view class="section">
        <view class="section-title-row">
          <view class="section-title">{{ uiText_a6d10d }}</view>
        </view>
        <view class="info-row">
          <text class="label">{{ uiText_3e8657 }}</text>
          <text>{{ order.orderNo }}</text>
        </view>
        <view class="info-row">
          <text class="label">{{ uiText_2240cc }}</text>
          <text>{{ createTimeText }}</text>
        </view>
        <view class="info-row">
          <text class="label">{{ uiText_75ea7b }}</text>
          <text class="status">{{ progressLabel }}</text>
        </view>
        <view class="info-row">
          <text class="label">{{ uiText_edfe4c }}</text>
          <text :class="'badge ' + (order?.deliveryMethod === 'pickup' ? 'badge--pickup' : 'badge--home')">
            {{ order?.deliveryMethod === 'pickup' ? '门店自提' : '配送上门' }}
          </text>
        </view>
        <view class="info-row">
          <text class="label">{{ uiText_b1862e }}</text>
          <text class="price">¥{{ formatPrice(order.totalAmount) }}</text>
        </view>
      </view>

      <view v-if="order.deliveryMethod === 'home_delivery'" class="section">
        <view class="section-title">{{ uiText_3f4ab8 }}</view>
        <view class="info-row">
          <text class="label">{{ uiText_6aea70 }}</text>
          <text>{{ order.address.name }}</text>
        </view>
        <view class="info-row">
          <text class="label">{{ uiText_09a1f6 }}</text>
          <text>{{ order.address.phone }}</text>
        </view>
        <view class="info-row address-row">
          <text class="label">{{ uiText_748ea9 }}</text>
          <text class="address-text">{{ order.address.fullText }}</text>
        </view>
      </view>

      <view v-if="order.remark" class="section">
        <view class="section-title">{{ remarkLabelText }}</view>
        <view class="remark-text">{{ order.remark }}</view>
      </view>

      <view class="section">
        <view class="section-title">{{ uiText_b433e6 }}</view>
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

    <ScrollListTailSpacer
      content-selector="#merchant-order-detail-scroll-body"
      :bottom-inset-px="showActions ? actionBarInsetPx : 0"
      :watch-key="`${loading}-${order?._id || ''}-${showActions}`"
    />

    <view v-if="showActions" class="action-bar">
    <!-- 备货中：非自提显示配送选择 / 自提直接备好 -->
    <template v-if="order?.status === 'preparing'">
      <template v-if="order?.deliveryMethod === 'pickup'">
        <nut-button class="action-btn" type="primary" :loading="updating" @click="setReady">
          已备好
        </nut-button>
      </template>
      <template v-else>
        <view class="delivery-prompt">请选择配送方式</view>
        <view class="delivery-btn-row">
          <nut-button class="action-btn" type="primary" :loading="updating" @click="startSelfDelivery">
            自配送
          </nut-button>
          <nut-button class="action-btn secondary" plain type="primary" :loading="updating" @click="callRider">
            呼叫骑手
          </nut-button>
        </view>
      </template>
    </template>
      <template v-else>
        <nut-button v-if="shopActionLabel" class="action-btn" type="primary" :loading="updating || verifying" @click="handleShopAction">
          {{ shopActionLabel }}
        </nut-button>
        <nut-button v-if="riderActionLabel" class="action-btn secondary" plain type="primary" :loading="updating" @click="handleRiderAction">
          {{ riderActionLabel }}
        </nut-button>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { showToast } from '@/utils/feedback'
import { navigateTo } from '@/utils/router'
import { computed, ref } from 'vue'
import { useDidShow, useLoad } from '@tarojs/taro'
import {
  getMerchantRiderActionLabel,
  getMerchantShopActionLabel,
  getOrder,
  performMerchantShopAction,
  updateRiderStatus,
  updateOrderStatus,
} from '@/services/order'
import { scanAndVerifyPickup } from '@/utils/pickupVerifyScan'
import GoodsImage from '@/components/GoodsImage.vue'
import OrderStatusSteps from '@/components/OrderStatusSteps.vue'
import type { Order } from '@/types/order'
import { getNextRiderStatus, getOrderProgressLabel } from '@/types/order'
import { scrollTailActionBarInsetPx } from '@/utils/scrollListTailSpacer'

const loadingTipText = '加载中…'
const remarkLabelText = '备注'
const uiText_09a1f6 = '联系电话'
const uiText_2240cc = '下单时间'
const uiText_3e8657 = '订单编号'
const uiText_3f4ab8 = '顾客信息'
const uiText_6aea70 = '收货人'
const uiText_748ea9 = '收货地址'
const uiText_75ea7b = '当前进度'
const uiText_a6d10d = '订单信息'
const uiText_b1862e = '订单金额'
const uiText_b433e6 = '商品信息'
const uiText_edfe4c = '配送方式'

const actionBarInsetPx = scrollTailActionBarInsetPx()

const orderId = ref('')
const order = ref<Order | null>(null)
const loading = ref(false)
const updating = ref(false)
const verifying = ref(false)
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

const showActions = computed(() => {
  // ready + pickup 需要显示扫码核销按钮
  if (order.value?.status === 'ready' && order.value?.deliveryMethod === 'pickup') return true
  return Boolean(shopActionLabel.value || riderActionLabel.value)
})

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

  if (order.value.status === 'accepted') {
    wx.showModal({
      title: '确认订单信息',
      content: '店员确认订单信息无误后，将开始制作。',
      success: (res) => {
        if (res.confirm) void doShopAction('preparing')
      },
    })
    return
  }

  // ready + pickup → 扫码核销
  if (order.value.status === 'ready' && order.value.deliveryMethod === 'pickup') {
    void scanToVerify()
    return
  }

  // delivering 不再有操作按钮
  void doShopAction()
}

async function doShopAction(targetStatus?: string) {
  if (!orderId.value || !order.value || updating.value) return
  updating.value = true
  try {
    order.value = targetStatus
      ? await updateOrderStatus(orderId.value, targetStatus)
      : await performMerchantShopAction(orderId.value, order.value)
    showToast({ title: '操作成功', icon: 'success' })
  } catch (err) {
    showToast({ title: err instanceof Error ? err.message : '操作失败', icon: 'none' })
  } finally {
    updating.value = false
  }
}

/** 自配送 */
async function startSelfDelivery() {
  if (!orderId.value || !order.value || updating.value) return
  updating.value = true
  try {
    order.value = await updateOrderStatus(orderId.value, 'delivering')
    showToast({ title: '配送中', icon: 'success' })
  } catch (err) {
    showToast({ title: err instanceof Error ? err.message : '操作失败', icon: 'none' })
  } finally { updating.value = false }
}

/** 呼叫骑手 */
async function callRider() {
  if (!orderId.value || !order.value || updating.value) return
  updating.value = true
  try {
    // cloud 函数 updateOrderStatus('prep_done') 会自动设置 riderStatus=waiting
    order.value = await updateOrderStatus(orderId.value, 'prep_done')
    showToast({ title: '已呼叫骑手', icon: 'success' })
  } catch (err) {
    showToast({ title: err instanceof Error ? err.message : '操作失败', icon: 'none' })
  } finally { updating.value = false }
}

/** 自提订单已备好 */
async function setReady() {
  if (!orderId.value || !order.value || updating.value) return
  updating.value = true
  try {
    order.value = await updateOrderStatus(orderId.value, 'ready')
    showToast({ title: '已备好', icon: 'success' })
  } catch (err) {
    showToast({ title: err instanceof Error ? err.message : '操作失败', icon: 'none' })
  } finally { updating.value = false }
}

/** 扫码核销自提订单 */
async function scanToVerify() {
  if (!orderId.value || !order.value || verifying.value) return
  verifying.value = true
  try {
    const result = await scanAndVerifyPickup({ expectedOrderId: orderId.value })
    if (result.success && result.order) {
      order.value = result.order
    }
  } finally {
    verifying.value = false
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
.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
  .section-title {
    margin-bottom: 0;
  }
}
.notify-link {
  font-size: 24rpx;
  color: #667eea;
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
.badge { font-size: 22rpx; font-weight: 600; padding: 4rpx 12rpx; border-radius: 8rpx; }
.badge--pickup { background: #fff3e0; color: #e65100; }
.badge--home { background: #e3f2fd; color: #1565c0; }
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
.delivery-prompt {
  text-align: center;
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  padding: 8rpx 0;
}
.delivery-btn-row {
  display: flex;
  gap: 16rpx;
  .action-btn {
    flex: 1;
  }
}
</style>
