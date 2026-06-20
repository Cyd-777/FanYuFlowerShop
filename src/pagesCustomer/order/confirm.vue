<template>
  <view class="page-confirm">
    <view class="address-card" @click="selectAddress">
      <view class="address-label">收货地址</view>
      <view v-if="address" class="address-content">
        <view class="address-user">{{ address.name }} {{ address.phone }}</view>
        <view class="address-detail">{{ formatAddressLine(address) }}</view>
      </view>
      <view v-else class="address-placeholder">请选择收货地址</view>
      <text class="address-arrow">›</text>
    </view>

    <view class="goods-section">
      <view class="section-title">商品信息</view>
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
      <view v-else class="empty-tip">暂无待结算商品，请从购物车选择</view>
    </view>

    <nut-cell title="备注" is-link @click="editRemark">
      <view slot="desc">{{ remark || '无' }}</view>
    </nut-cell>

    <view class="action-bar">
      <view class="total">合计: <text class="price">¥{{ totalPrice }}</text></view>
      <nut-button
        type="primary"
        :loading="submitting"
        :disabled="!goodsList.length || submitting"
        @click="submitOrder"
      >
        提交订单
      </nut-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDidShow } from '@tarojs/taro'
import { storeToRefs } from 'pinia'
import {
  getCheckoutAddress,
  formatAddressLine,
  toOrderAddressSnapshot,
} from '@/services/address'
import { buildCreateOrderInput, createOrder } from '@/services/order'
import { redirectTo } from '@/utils/router'
import { useCartStore } from '@/stores/cart'
import GoodsImage from '@/components/GoodsImage.vue'
import type { UserAddress } from '@/types/address'

const cartStore = useCartStore()
const { checkedItems } = storeToRefs(cartStore)

const address = ref<UserAddress | null>(null)
const remark = ref('')
const submitting = ref(false)

const goodsList = computed(() => checkedItems.value)
const totalPrice = computed(() => cartStore.checkedTotalPrice.toFixed(2))

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
    title: '订单备注',
    editable: true,
    placeholderText: '选填',
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
    wx.showToast({ title: '暂无待结算商品', icon: 'none' })
    return
  }
  if (!address.value) {
    wx.showToast({ title: '请选择收货地址', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    const payload = buildCreateOrderInput(
      goodsList.value,
      toOrderAddressSnapshot(address.value),
      remark.value,
    )
    const order = await createOrder(payload)
    cartStore.removeChecked()
    wx.showToast({ title: '订单已提交', icon: 'success' })
    redirectTo({
      url: `/pagesCustomer/order/detail?id=${order._id}`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '提交失败，请重试'
    wx.showToast({ title: message, icon: 'none', duration: 2500 })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="less">
@import '@/styles/tokens.less';

.page-confirm { background: @color-bg-page; min-height: 100vh; padding-bottom: 120rpx; }
.address-card {
  display: flex;
  align-items: center;
  margin: 16rpx;
  padding: 24rpx 32rpx;
  background: @color-bg-card;
  border-radius: @radius-md;
}
.address-label {
  flex-shrink: 0;
  margin-right: 24rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: @color-text-primary;
}
.address-content {
  flex: 1;
  min-width: 0;
}
.address-user {
  font-size: 28rpx;
  color: @color-text-primary;
}
.address-detail {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: @color-text-tertiary;
  line-height: 1.5;
}
.address-placeholder {
  flex: 1;
  font-size: 26rpx;
  color: @color-text-placeholder;
}
.address-arrow {
  flex-shrink: 0;
  margin-left: 12rpx;
  font-size: 36rpx;
  color: @color-text-placeholder;
}
.goods-section {
  background: @color-bg-card;
  padding: 24rpx;
  margin: 16rpx;
  border-radius: @radius-md;
}
.section-title { font-size: 28rpx; font-weight: 600; margin-bottom: 16rpx; }
.order-goods { display: flex; margin-bottom: 16rpx; }
.order-goods:last-child { margin-bottom: 0; }
.thumb { width: 120rpx; height: 120rpx; border-radius: 8rpx; flex-shrink: 0; }
.info { margin-left: 16rpx; flex: 1; min-width: 0; }
.name { font-size: 26rpx; color: #333; font-weight: 500; }
.custom-summary {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: @color-text-tertiary;
  line-height: 1.5;
}
.price { font-size: 24rpx; color: #999; margin-top: 4rpx; }
.empty-tip {
  padding: 32rpx 0;
  text-align: center;
  font-size: 26rpx;
  color: @color-text-tertiary;
}
.action-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; align-items: center; padding: 16rpx 24rpx;
  background: #fff; border-top: 2rpx solid #eee;
  .total { flex: 1; font-size: 28rpx; }
  .price { color: #e53935; font-weight: 600; font-size: 34rpx; }
}
</style>
