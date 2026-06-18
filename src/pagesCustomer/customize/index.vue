<template>
  <view class="page-customize">
    <view class="tip-card">
      <view class="tip-title">定制花束</view>
      <view class="tip-desc">
        花材从所有按「支」售卖的商品中选择；包装与贺卡从对应分类商品中选择，填写留言后提交订单。
      </view>
    </view>

    <view class="section">
      <view class="section-head">
        <view class="section-title">花材（必选）</view>
        <view class="link" @click="goPick('flower')">去选择 ›</view>
      </view>
      <view v-if="draft.flowers.length" class="picked-list">
        <view v-for="item in draft.flowers" :key="item.goodsId" class="picked-item">
          <GoodsImage :src="item.image" root-class="thumb" />
          <view class="meta">
            <view class="name">{{ item.name }}</view>
            <view class="price">¥{{ formatPrice(item.price) }}</view>
          </view>
        </view>
      </view>
      <view v-else class="empty">尚未选择花材</view>
    </view>

    <view class="section">
      <view class="section-head">
        <view class="section-title">包装（必选）</view>
        <view class="link" @click="goPick('packaging')">去选择 ›</view>
      </view>
      <view v-if="draft.packaging" class="picked-item">
        <GoodsImage :src="draft.packaging.image" root-class="thumb" />
        <view class="meta">
          <view class="name">{{ draft.packaging.name }}</view>
          <view class="price">¥{{ formatPrice(draft.packaging.price) }}</view>
        </view>
      </view>
      <view v-else class="empty">尚未选择包装</view>
    </view>

    <view class="section">
      <view class="section-head">
        <view class="section-title">贺卡（选填）</view>
        <view class="link" @click="goPick('card')">去选择 ›</view>
      </view>
      <view v-if="draft.card" class="picked-item">
        <GoodsImage :src="draft.card.image" root-class="thumb" />
        <view class="meta">
          <view class="name">{{ draft.card.name }}</view>
          <view class="price">¥{{ formatPrice(draft.card.price) }}</view>
        </view>
      </view>
      <view v-else class="empty">可不选贺卡</view>
      <view class="message-box">
        <view class="message-label">贺卡留言</view>
        <nut-input
          v-model="draft.cardMessage"
          placeholder="给挂念的他留下你心里最想说的话吧..."
          type="textarea"
          @update:model-value="persistDraft"
        />
      </view>
    </view>

    <view class="action-bar">
      <view class="total">合计 ¥{{ formatPrice(totalPrice) }}</view>
      <nut-button type="primary" @click="submitOrder">提交订单</nut-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDidShow } from '@tarojs/taro'
import { navigateTo } from '@/utils/router'
import {
  CUSTOM_BOUQUET_DRAFT_KEY,
  calcCustomBouquetPrice,
  createEmptyCustomBouquetDraft,
  isCustomBouquetReady,
} from '@/types/customBouquet'
import GoodsImage from '@/components/GoodsImage.vue'
import type { CustomBouquetDraft } from '@/types/customBouquet'

const draft = ref<CustomBouquetDraft>(createEmptyCustomBouquetDraft())

const totalPrice = computed(() => calcCustomBouquetPrice(draft.value))

useDidShow(() => {
  const cached = wx.getStorageSync(CUSTOM_BOUQUET_DRAFT_KEY) as CustomBouquetDraft | ''
  if (cached && typeof cached === 'object' && Array.isArray(cached.flowers)) {
    draft.value = {
      ...createEmptyCustomBouquetDraft(),
      ...cached,
      flowers: cached.flowers || [],
    }
  }
})

function persistDraft() {
  wx.setStorageSync(CUSTOM_BOUQUET_DRAFT_KEY, draft.value)
}

function formatPrice(price: number) {
  return Number(price).toFixed(2).replace(/\.00$/, '')
}

function goPick(role: 'flower' | 'packaging' | 'card') {
  persistDraft()
  navigateTo({ url: `/pagesCustomer/customize/pick?role=${role}` })
}

function submitOrder() {
  if (!isCustomBouquetReady(draft.value)) {
    wx.showToast({ title: '请先选择花材和包装', icon: 'none' })
    return
  }
  persistDraft()
  navigateTo({ url: '/pagesCustomer/customize/preview' })
}
</script>

<style lang="less">
.page-customize { padding-bottom: 140rpx; background: #f8f8f8; min-height: 100vh; }
.tip-card {
  margin: 16rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 16rpx;
}
.tip-title { font-size: 30rpx; font-weight: 600; color: #333; }
.tip-desc { margin-top: 8rpx; font-size: 24rpx; color: #666; line-height: 1.5; }
.section { background: #fff; padding: 24rpx; margin-bottom: 16rpx; }
.section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.section-title { font-size: 28rpx; font-weight: 600; color: #333; }
.link { font-size: 26rpx; color: #e53935; }
.picked-list { display: flex; flex-direction: column; gap: 12rpx; }
.picked-item { display: flex; align-items: center; padding: 12rpx; background: #fafafa; border-radius: 12rpx; }
.thumb { width: 96rpx; height: 96rpx; border-radius: 8rpx; background: #f0f0f0; margin-right: 16rpx; }
.meta { flex: 1; }
.name { font-size: 26rpx; color: #333; }
.price { margin-top: 4rpx; font-size: 24rpx; color: #e53935; }
.empty { font-size: 24rpx; color: #bbb; }
.message-box { margin-top: 20rpx; }
.message-label { font-size: 24rpx; color: #666; margin-bottom: 8rpx; }
.action-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; align-items: center; padding: 16rpx 24rpx;
  background: #fff; border-top: 2rpx solid #eee;
  .total { flex: 1; font-size: 32rpx; font-weight: 600; color: #e53935; }
}
</style>
