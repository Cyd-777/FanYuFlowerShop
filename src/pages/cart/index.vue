<template>
  <view class="page-cart">
    <view v-if="syncing" class="sync-tip">正在同步商品信息…</view>

    <view class="empty-state" v-if="!syncing && !items.length">
      <view class="empty-text">{{ emptyText }}</view>
      <view class="primary-btn" @tap="goHome">{{ goHomeText }}</view>
    </view>

    <view class="cart-list" v-else-if="items.length">
      <view v-for="item in items" :key="item.lineKey" class="cart-item">
        <view
          class="check-box"
          :class="{ checked: item.checked }"
          @tap="toggleItem(item.lineKey)"
        />
        <GoodsImage
          :src="item.image"
          root-class="thumb"
          @tap="openItem(item)"
        />
        <view class="info" @tap="openItem(item)">
          <view class="name">{{ item.name }}</view>
          <view v-if="item.customSummary" class="custom-summary">{{ item.customSummary }}</view>
          <view class="price">¥{{ formatPrice(item.price) }}/{{ item.unit }}</view>
          <template v-if="item.kind === 'goods'">
            <view class="stock-tip sold-out" v-if="item.stock <= 0">已售罄</view>
            <view class="stock-tip" v-else-if="item.count >= item.stock">已达库存上限</view>
            <view class="qty" @tap.stop>
              <view class="qty-btn" @tap="decrease(item.lineKey)">−</view>
              <text class="num">{{ item.count }}</text>
              <view
                class="qty-btn"
                :class="{ disabled: item.count >= item.stock }"
                @tap="increase(item)"
              >+</view>
            </view>
          </template>
          <view v-else class="stock-tip">花艺师将按意向搭配</view>
        </view>
        <view class="remove-btn" @tap="remove(item.lineKey)">删除</view>
      </view>
    </view>

    <view class="footer" v-if="items.length">
      <view class="check-all" @tap="toggleAll">
        <view class="check-box" :class="{ checked: allChecked }" />
        <text>{{ allCheckText }}</text>
      </view>
      <view class="total">
        {{ totalLabel }} <text class="price">¥{{ totalPrice }}</text>
      </view>
      <view class="primary-btn small" @tap="goCheckout">{{ checkoutText }}</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDidShow } from '@tarojs/taro'
import { storeToRefs } from 'pinia'
import { navigateTo } from '@/utils/router'
import { useCartStore } from '@/stores/cart'
import { fetchGoodsForCartIncrease, syncCartWithServer } from '@/services/cart'
import { CUSTOM_CART_GOODS_ID } from '@/types/cart'
import GoodsImage from '@/components/GoodsImage.vue'
import type { CartLineItem } from '@/types/cart'

const emptyText = '购物车是空的'
const goHomeText = '去逛逛'
const allCheckText = '全选'
const totalLabel = '合计:'
const checkoutText = '结算'

const cartStore = useCartStore()
const { items, allChecked } = storeToRefs(cartStore)
const syncing = ref(false)

const totalPrice = computed(() => cartStore.checkedTotalPrice.toFixed(2))

function formatPrice(price: number) {
  return Number(price).toFixed(2).replace(/\.00$/, '')
}

async function syncCart() {
  if (!cartStore.items.length) return

  syncing.value = true
  try {
    const result = await syncCartWithServer(cartStore.items)
    cartStore.replaceItems(result.items)

    if (result.removedNames.length) {
      wx.showToast({
        title: `${result.removedNames.length} 件商品已失效并移除`,
        icon: 'none',
      })
    } else if (result.adjusted.length) {
      wx.showToast({
        title: '部分商品数量已按库存调整',
        icon: 'none',
      })
    }
  } catch (err) {
    console.warn('[cart] sync failed:', err)
  } finally {
    syncing.value = false
  }
}

useDidShow(() => {
  cartStore.refreshBadge()
  void syncCart()
})

function toggleItem(lineKey: string) {
  cartStore.toggleChecked(lineKey)
}

function toggleAll() {
  cartStore.toggleAllChecked()
}

async function increase(item: CartLineItem) {
  if (item.kind !== 'goods' || item.count >= item.stock) return

  try {
    const goods = await fetchGoodsForCartIncrease(item.goodsId)
    cartStore.increaseWithGoods(item.goodsId, goods)
  } catch (err) {
    const message = err instanceof Error ? err.message : '操作失败'
    if (message.includes('下架') || message.includes('售罄')) {
      cartStore.removeItem(item.lineKey)
    }
    wx.showToast({ title: message, icon: 'none' })
  }
}

function decrease(lineKey: string) {
  cartStore.decrease(lineKey)
}

function remove(lineKey: string) {
  cartStore.removeItem(lineKey)
}

function openItem(item: CartLineItem) {
  if (item.kind === 'custom' || item.goodsId === CUSTOM_CART_GOODS_ID) return
  navigateTo({ url: `/pagesCustomer/goods/detail?id=${item.goodsId}` })
}

function goHome() {
  wx.switchTab({ url: '/pages/home/index' })
}

function goCheckout() {
  if (!cartStore.checkedItems.length) {
    wx.showToast({ title: '请选择要结算的商品', icon: 'none' })
    return
  }
  if (cartStore.checkedItems.some((item) => item.kind === 'goods' && item.stock <= 0)) {
    wx.showToast({ title: '所选商品含售罄商品', icon: 'none' })
    return
  }
  navigateTo({ url: '/pagesCustomer/order/confirm' })
}
</script>

<style lang="less">
@import '@/styles/tokens.less';

.page-cart {
  min-height: 100vh;
  background: @color-bg-page;
  padding-bottom: 120rpx;
}
.sync-tip {
  padding: 16rpx 24rpx;
  font-size: 24rpx;
  color: @color-text-tertiary;
  text-align: center;
  background: @color-bg-card;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
}
.empty-text {
  font-size: @font-size-md;
  color: @color-text-tertiary;
  margin-bottom: 32rpx;
}
.primary-btn {
  min-width: 240rpx;
  height: 80rpx;
  line-height: 80rpx;
  padding: 0 48rpx;
  text-align: center;
  border-radius: @radius-pill;
  font-size: 30rpx;
  color: #fff;
  background: @color-primary;
  &.small {
    min-width: 160rpx;
    height: 72rpx;
    line-height: 72rpx;
    padding: 0 32rpx;
    font-size: 28rpx;
  }
}
.cart-item {
  display: flex;
  align-items: flex-start;
  background: @color-bg-card;
  padding: 24rpx;
  margin-bottom: 2rpx;
  .thumb {
    width: 160rpx;
    height: 160rpx;
    border-radius: @radius-sm;
    margin: 0 16rpx;
    flex-shrink: 0;
  }
  .info { flex: 1; min-width: 0; }
  .name {
    font-size: 26rpx;
    color: @color-text-primary;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .custom-summary {
    margin-top: 6rpx;
    font-size: 22rpx;
    color: @color-text-tertiary;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .price { font-size: 28rpx; font-weight: 600; color: @color-primary; margin: 8rpx 0; }
  .stock-tip { font-size: 22rpx; color: @color-text-tertiary; margin-bottom: 8rpx; }
  .stock-tip.sold-out { color: @color-primary; }
  .qty { display: flex; align-items: center; gap: 16rpx; }
  .qty-btn {
    width: 56rpx;
    height: 56rpx;
    line-height: 52rpx;
    text-align: center;
    border-radius: @radius-sm;
    background: @color-bg-muted;
    font-size: 32rpx;
    color: @color-text-primary;
    &.disabled { opacity: 0.4; }
  }
  .num { font-size: 28rpx; min-width: 48rpx; text-align: center; }
  .remove-btn {
    flex-shrink: 0;
    margin-left: 8rpx;
    padding: 8rpx;
    font-size: 24rpx;
    color: @color-text-tertiary;
  }
}
.check-box {
  width: 40rpx;
  height: 40rpx;
  border-radius: @radius-round;
  border: 2rpx solid @color-border-dashed;
  margin-right: 16rpx;
  margin-top: 60rpx;
  flex-shrink: 0;
  &.checked {
    border-color: @color-primary;
    background: @color-primary;
    position: relative;
    &::after {
      content: '';
      position: absolute;
      left: 12rpx;
      top: 6rpx;
      width: 10rpx;
      height: 18rpx;
      border: 4rpx solid #fff;
      border-top: 0;
      border-left: 0;
      transform: rotate(45deg);
    }
  }
}
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  background: @color-bg-card;
  border-top: 2rpx solid @color-border;
  .check-all {
    display: flex;
    align-items: center;
    font-size: 26rpx;
    color: @color-text-secondary;
    .check-box { margin-right: 8rpx; margin-top: 0; }
  }
  .total {
    flex: 1;
    text-align: right;
    margin-right: 16rpx;
    font-size: 28rpx;
  }
  .price { color: @color-primary; font-weight: 600; font-size: 32rpx; }
}
</style>
