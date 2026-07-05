<template>
  <view class="page-confirm" id="order-confirm-scroll-body">
    <AppNavBar />
    
    <!-- 配送方式选择 -->
    <view class="section">
      <view class="section-title">{{ deliverySectionTitle }}</view>
      <view class="delivery-options">
        <view
          class="delivery-option"
          :class="{ active: deliveryMethod === 'home_delivery' }"
          @tap="deliveryMethod = 'home_delivery'"
        >
          <text class="delivery-icon">🏠</text>
          <view class="delivery-text">
            <view class="delivery-label">{{ homeDeliveryLabel }}</view>
            <view class="delivery-desc">{{ homeDeliveryDesc }}</view>
          </view>
          <text class="delivery-check">{{ deliveryMethod === 'home_delivery' ? '●' : '○' }}</text>
        </view>
        <view
          class="delivery-option"
          :class="{ active: deliveryMethod === 'pickup' }"
          @tap="deliveryMethod = 'pickup'"
        >
          <text class="delivery-icon">🏪</text>
          <view class="delivery-text">
            <view class="delivery-label">{{ pickupLabel }}</view>
            <view class="delivery-desc">{{ shopAddress }}</view>
          </view>
          <text class="delivery-check">{{ deliveryMethod === 'pickup' ? '●' : '○' }}</text>
        </view>
      </view>
    </view>

    <!-- 配送上门：收货地址 -->
    <view v-if="deliveryMethod === 'home_delivery'" class="address-card" @click="selectAddress">
      <view class="address-label">{{ addressLabelText }}</view>
      <view v-if="address" class="address-content">
        <view class="address-user">{{ address.name }} {{ address.phone }}</view>
        <view class="address-detail">{{ formatAddressLine(address) }}</view>
      </view>
      <view v-else class="address-placeholder">{{ addressPlaceholderText }}</view>
      <text class="address-arrow">›</text>
    </view>

    <!-- 门店自提：显示门店信息 -->
    <view v-if="deliveryMethod === 'pickup'" class="section pickup-info">
      <view class="pickup-row"><text class="pickup-label">{{ pickupShopLabel }}</text><text class="pickup-value">{{ shopName }}</text></view>
      <view class="pickup-row"><text class="pickup-label">{{ pickupAddressLabel }}</text><text class="pickup-value">{{ shopAddress }}</text></view>
      <view class="pickup-row"><text class="pickup-label">{{ pickupHoursLabel }}</text><text class="pickup-value">{{ shopHours }}</text></view>
    </view>

    <view class="goods-section">
      <view class="section-title">{{ goodsSectionTitle }}</view>
      <view v-if="goodsList.length" class="goods-list">
        <view v-for="item in goodsList" :key="item.lineKey" class="order-goods">
          <GoodsImage :src="item.image" root-class="thumb" />
          <view class="info">
            <view class="name">{{ item.name }}</view>
            <view v-if="item.customSummary" class="custom-summary">{{ item.customSummary }}</view>
            <view class="price">¥{{ formatPrice(item.price) }} x {{ item.count }}</view>
          </view>
        </view>
      </view>
      <view v-else class="empty-tip">{{ emptyGoodsTipText }}</view>
    </view>

    <nut-cell :title="remarkCellTitle" is-link @click="editRemark">
      <view slot="desc">{{ remark || remarkEmptyText }}</view>
    </nut-cell>

    <ScrollListTailSpacer
      content-selector="#order-confirm-scroll-body"
      :bottom-inset-px="actionBarInsetPx"
      :watch-key="`${goodsList.length}-${deliveryMethod}`"
    />

    <view class="action-bar">
      <view class="total">{{ totalLabelText }} <text class="price">¥{{ totalPrice }}</text></view>
      <nut-button type="primary" :loading="submitting" :disabled="!goodsList.length || submitting" @click="submitOrder">
        {{ submitButtonText }}
      </nut-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { showToast } from '@/utils/feedback'
import { computed, ref } from 'vue'
import { useDidShow } from '@tarojs/taro'
import { scrollTailActionBarInsetPx } from '@/utils/scrollListTailSpacer'

const actionBarInsetPx = scrollTailActionBarInsetPx()
import { storeToRefs } from 'pinia'
import {
  getCheckoutAddress,
  formatAddressLine,
  toOrderAddressSnapshot,
} from '@/services/address'
import { buildCreateOrderInput, createOrder } from '@/services/order'
import { redirectTo } from '@/utils/router'
import { useCartStore } from '@/stores/cart'
import { useShopDisplay } from '@/composables/useShopDisplay'
import GoodsImage from '@/components/GoodsImage.vue'
import type { UserAddress } from '@/types/address'

const deliverySectionTitle = '配送方式'
const homeDeliveryLabel = '配送上门'
const homeDeliveryDesc = '商家配送至填写的地址'
const pickupLabel = '门店自提'
const addressLabelText = '收货地址'
const addressPlaceholderText = '请选择收货地址'
const pickupShopLabel = '门店'
const pickupAddressLabel = '地址'
const pickupHoursLabel = '营业时间'
const goodsSectionTitle = '商品信息'
const emptyGoodsTipText = '暂无待结算商品'
const remarkCellTitle = '备注'
const remarkEmptyText = '无'
const totalLabelText = '合计:'
const submitButtonText = '提交订单'

const cartStore = useCartStore()
const { checkedItems } = storeToRefs(cartStore)

const shopStore = useShopDisplay()

const deliveryMethod = ref<'home_delivery' | 'pickup'>('home_delivery')
const address = ref<UserAddress | null>(null)
const remark = ref('')
const submitting = ref(false)

const goodsList = computed(() => checkedItems.value)
const totalPrice = computed(() => cartStore.checkedTotalPrice.toFixed(2))

const shopName = computed(() => shopStore.shopName)
const shopAddress = computed(() => '到店自取，商家将为您准备')
const shopHours = computed(() => {
  const s = shopStore.settings
  return s ? `${s.openTime || '09:00'} - ${s.closeTime || '21:00'}` : '09:00 - 21:00'
})

useDidShow(() => {
  address.value = getCheckoutAddress()
})

function formatPrice(price: number) {
  return Number(price).toFixed(2).replace(/\.00$/, '')
}

function selectAddress() {
  wx.navigateTo({ url: '/pagesCustomer/address/list?from=confirm' })
}

function editRemark() {
  wx.showModal({
    title: '订单备注', editable: true, placeholderText: '选填',
    content: remark.value,
    success: (res) => {
      if (!res.confirm) return
      remark.value = (res as { content?: string }).content?.trim() || ''
    },
  })
}

async function submitOrder() {
  if (submitting.value) return
  if (!goodsList.value.length) {
    showToast({ title: '暂无待结算商品', icon: 'none' })
    return
  }
  if (deliveryMethod.value === 'home_delivery' && !address.value) {
    showToast({ title: '请选择收货地址', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    const payload = buildCreateOrderInput(
      goodsList.value,
      deliveryMethod.value === 'pickup' ? { name: '', phone: '', province: '', city: '', district: '', detail: '', fullText: '' } : toOrderAddressSnapshot(address.value!),
      remark.value,
      deliveryMethod.value,
    )
    const order = await createOrder(payload)
    cartStore.removeChecked()
    showToast({ title: '订单已提交', icon: 'success' })
    redirectTo({ url: `/pagesCustomer/order/detail?id=${order._id}` })
  } catch (err) {
    const message = err instanceof Error ? err.message : '提交失败，请重试'
    showToast({ title: message, icon: 'none', duration: 2500 })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="less">
@import '@/styles/tokens.less';

.page-confirm { background: @color-bg-page; min-height: 100vh; padding-bottom: 120rpx; }

.section { background: @color-bg-card; padding: 24rpx; margin: 16rpx; border-radius: @radius-md; }
.section-title { font-size: 28rpx; font-weight: 600; margin-bottom: 16rpx; }

.delivery-options { display: flex; flex-direction: column; gap: 12rpx; }
.delivery-option {
  display: flex; align-items: center; gap: 16rpx;
  padding: 20rpx; border-radius: @radius-md;
  border: 2rpx solid @color-border; background: @color-bg-page;
  &.active { border-color: @color-primary; background: @color-primary-light; }
}
.delivery-icon { font-size: 40rpx; }
.delivery-text { flex: 1; min-width: 0; }
.delivery-label { font-size: 28rpx; font-weight: 500; color: @color-text-primary; }
.delivery-desc { font-size: 22rpx; color: @color-text-tertiary; margin-top: 4rpx; }
.delivery-check { font-size: 32rpx; color: @color-primary; }

.address-card {
  display: flex; align-items: center;
  margin: 16rpx; padding: 24rpx 32rpx;
  background: @color-bg-card; border-radius: @radius-md;
}
.address-label { flex-shrink: 0; margin-right: 24rpx; font-size: 28rpx; font-weight: 600; color: @color-text-primary; }
.address-content { flex: 1; min-width: 0; }
.address-user { font-size: 28rpx; color: @color-text-primary; }
.address-detail { margin-top: 8rpx; font-size: 24rpx; color: @color-text-tertiary; line-height: 1.5; }
.address-placeholder { flex: 1; font-size: 26rpx; color: @color-text-placeholder; }
.address-arrow { flex-shrink: 0; margin-left: 12rpx; font-size: 36rpx; color: @color-text-placeholder; }

.pickup-info { display: flex; flex-direction: column; gap: 12rpx; }
.pickup-row { display: flex; gap: 12rpx; font-size: 26rpx; }
.pickup-label { color: @color-text-tertiary; width: 120rpx; flex-shrink: 0; }
.pickup-value { color: @color-text-primary; flex: 1; }

.goods-section { background: @color-bg-card; padding: 24rpx; margin: 16rpx; border-radius: @radius-md; }
.order-goods { display: flex; margin-bottom: 16rpx; }
.order-goods:last-child { margin-bottom: 0; }
.thumb { width: 120rpx; height: 120rpx; border-radius: 8rpx; flex-shrink: 0; }
.info { margin-left: 16rpx; flex: 1; min-width: 0; }
.name { font-size: 26rpx; color: #333; font-weight: 500; }
.custom-summary { margin-top: 6rpx; font-size: 22rpx; color: @color-text-tertiary; line-height: 1.5; }
.price { font-size: 24rpx; color: #999; margin-top: 4rpx; }
.empty-tip { padding: 32rpx 0; text-align: center; font-size: 26rpx; color: @color-text-tertiary; }

.action-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; align-items: center; padding: 16rpx 24rpx;
  background: #fff; border-top: 2rpx solid #eee;
  .total { flex: 1; font-size: 28rpx; }
  .price { color: #e53935; font-weight: 600; font-size: 34rpx; }
}
</style>
