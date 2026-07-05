<template>
  <view class="page-preview">
    <AppNavBar />
    <view class="summary-card">
      <view class="title">{{ uiText_3160de }}</view>
      <view class="row">
        <text class="label">{{ flowerMaterialLabelText }}</text>
        <text>{{ flowerNames }}</text>
      </view>
      <view class="row">
        <text class="label">{{ packagingLabelText }}</text>
        <text>{{ draft?.packaging?.name || '—' }}</text>
      </view>
      <view class="row">
        <text class="label">{{ cardLabelText }}</text>
        <text>{{ draft?.card?.name || '无' }}</text>
      </view>
      <view v-if="draft?.cardMessage" class="row">
        <text class="label">{{ messageLabelText }}</text>
        <text>{{ draft.cardMessage }}</text>
      </view>
      <view class="row total">
        <text class="label">{{ totalLabelText }}</text>
        <text class="price">¥{{ totalPrice }}</text>
      </view>
      <view class="note">{{ uiText_d5358d }}</view>
    </view>

    <nut-button type="primary" block class="submit-btn" :loading="submitting" @click="submit">
      提交订单
    </nut-button>
  </view>
</template>

<script setup lang="ts">
import { showToast } from '@/utils/feedback'
import { computed, ref } from 'vue'
import { useDidShow } from '@tarojs/taro'
import { navigateTo } from '@/utils/router'
import { useCartStore } from '@/stores/cart'
import {
  CUSTOM_BOUQUET_DRAFT_KEY,
  calcCustomBouquetPrice,
  isCustomBouquetReady,
} from '@/types/customBouquet'
import type { CustomBouquetDraft } from '@/types/customBouquet'

const cardLabelText = '贺卡'
const flowerMaterialLabelText = '花材'
const messageLabelText = '留言'
const packagingLabelText = '包装'
const totalLabelText = '合计'
const uiText_3160de = '订单确认'
const uiText_d5358d = '确认后将进入下单页，选择收货地址后提交（订单支付功能待接入）'

const cartStore = useCartStore()
const draft = ref<CustomBouquetDraft | null>(null)
const submitting = ref(false)

const flowerNames = computed(() => draft.value?.flowers.map((item) => item.name).join('、') || '—')
const totalPrice = computed(() =>
  draft.value ? calcCustomBouquetPrice(draft.value).toFixed(2).replace(/\.00$/, '') : '0',
)

useDidShow(() => {
  const cached = wx.getStorageSync(CUSTOM_BOUQUET_DRAFT_KEY) as CustomBouquetDraft | ''
  if (!cached || typeof cached !== 'object' || !isCustomBouquetReady(cached)) {
    draft.value = null
    showToast({ title: '请先完成定制选择', icon: 'none' })
    setTimeout(() => wx.navigateBack(), 1200)
    return
  }
  draft.value = cached
})

function submit() {
  if (!draft.value || submitting.value) return

  submitting.value = true
  try {
    const lineKey = cartStore.addCustomBouquet(draft.value)
    cartStore.setOnlyChecked(lineKey)
    wx.removeStorageSync(CUSTOM_BOUQUET_DRAFT_KEY)
    navigateTo({ url: '/pagesCustomer/order/confirm' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="less">
.page-preview { background: #f8f8f8; min-height: 100vh; padding: 24rpx; }
.summary-card { background: #fff; border-radius: 16rpx; padding: 32rpx 24rpx; }
.title { font-size: 32rpx; font-weight: 600; color: #333; margin-bottom: 24rpx; }
.row {
  display: flex; padding: 12rpx 0; font-size: 26rpx; border-bottom: 2rpx solid #f5f5f5;
  .label { color: #999; width: 120rpx; flex-shrink: 0; }
  &.total { border: none; margin-top: 8rpx; }
  .price { color: #e53935; font-weight: 600; font-size: 32rpx; }
}
.note { margin-top: 16rpx; font-size: 22rpx; color: #999; line-height: 1.5; }
.submit-btn { margin-top: 48rpx; border-radius: 48rpx; }
</style>
