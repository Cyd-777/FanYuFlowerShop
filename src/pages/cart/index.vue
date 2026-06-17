<template>
  <view class="page-cart">
    <view class="empty-state" v-if="!cartItems.length">
      <nut-empty description="购物车是空的" />
      <nut-button type="primary" @click="goHome">去逛逛</nut-button>
    </view>

    <view class="cart-list" v-else>
      <view v-for="(item, idx) in cartItems" :key="idx" class="cart-item">
        <nut-checkbox v-model="item.checked" />
        <image class="thumb" :src="item.image" mode="aspectFill" />
        <view class="info">
          <view class="name">{{ item.name }}</view>
          <view class="price">¥{{ item.price }}</view>
          <view class="qty">
            <nut-button size="small" @click="decrease(idx)">−</nut-button>
            <text class="num">{{ item.count }}</text>
            <nut-button size="small" @click="increase(idx)">+</nut-button>
          </view>
        </view>
      </view>
    </view>

    <view class="footer" v-if="cartItems.length">
      <nut-checkbox v-model="allChecked">全选</nut-checkbox>
      <view class="total">
        合计: <text class="price">¥{{ totalPrice }}</text>
      </view>
      <nut-button type="primary" @click="goCheckout">结算</nut-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { navigateTo } from '@/utils/router'

interface CartItem {
  id: number
  name: string
  image: string
  price: number
  count: number
  checked: boolean
}

const cartItems = ref<CartItem[]>([])

const allChecked = computed({
  get: () => cartItems.value.length > 0 && cartItems.value.every(i => i.checked),
  set: (val) => { cartItems.value.forEach(i => { i.checked = val }) },
})

const totalPrice = computed(() =>
  cartItems.value
    .filter(i => i.checked)
    .reduce((sum, i) => sum + i.price * i.count, 0)
    .toFixed(2)
)

function increase(idx: number) { cartItems.value[idx].count++ }
function decrease(idx: number) {
  if (--cartItems.value[idx].count <= 0) {
    cartItems.value.splice(idx, 1)
  }
}

function goHome() {
  wx.switchTab({ url: '/pages/home/index' })
}

function goCheckout() {
  navigateTo({ url: '/pagesCustomer/order/confirm' })
}
</script>

<style lang="less">
.page-cart {
  min-height: 100vh;
  background: #f8f8f8;
  padding-bottom: 120rpx;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
}
.cart-item {
  display: flex;
  align-items: center;
  background: #fff;
  padding: 24rpx;
  margin-bottom: 2rpx;
  .thumb {
    width: 160rpx;
    height: 160rpx;
    border-radius: 8rpx;
    margin: 0 16rpx;
    background: #f0f0f0;
  }
  .info { flex: 1; }
  .name { font-size: 26rpx; color: #333; }
  .price { font-size: 28rpx; font-weight: 600; color: #e53935; margin: 8rpx 0; }
  .qty { display: flex; align-items: center; gap: 16rpx; }
  .num { font-size: 28rpx; min-width: 48rpx; text-align: center; }
}
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  background: #fff;
  border-top: 2rpx solid #eee;
  .total {
    flex: 1;
    text-align: right;
    margin-right: 16rpx;
    font-size: 28rpx;
  }
  .price { color: #e53935; font-weight: 600; font-size: 32rpx; }
}
</style>
