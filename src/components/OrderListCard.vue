<template>
  <view class="order-list-card" @tap="emit('tap')">
    <view class="order-list-card__no-row">
      <text class="delivery-badge" :class="deliveryTagClass">{{ deliveryTagLabel }}</text>
      <text class="order-no">{{ orderNoText }}</text>
      <text class="order-list-card__status">{{ statusLabel }}</text>
    </view>

    <view class="order-list-card__body">
      <view class="order-list-card__media">
        <GoodsImage :src="previewImage" root-class="order-list-card__thumb" />
      </view>

      <view class="order-list-card__info">
        <view
          v-for="item in lineItems"
          :key="item.lineKey"
          class="order-list-card__line"
        >
          <text class="order-list-card__line-text">{{ formatLineText(item) }}</text>
        </view>
        <view v-if="!lineItems.length" class="order-list-card__line">
          <text class="order-list-card__line-text">{{ emptyGoodsText }}</text>
        </view>
      </view>

      <view class="order-list-card__aside">
        <text class="order-list-card__price">¥{{ priceText }}</text>
        <text class="order-list-card__total-qty">{{ totalQtyText }}</text>
      </view>
    </view>

    <view v-if="$slots.footer" class="order-list-card__footer" @tap.stop>
      <slot name="footer" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import GoodsImage from '@/components/GoodsImage.vue'
import type { Order } from '@/types/order'
import {
  formatOrderListPrice,
  getOrderDeliveryTagKind,
  getOrderDeliveryTagLabel,
  getOrderLineTotalCount,
  getOrderPreviewImage,
  getOrderProgressLabel,
} from '@/types/order'

const emptyGoodsText = '商品'

const props = withDefaults(
  defineProps<{
    order: Order
    /** 单号前是否加「订单号」前缀（顾客端） */
    orderNoPrefix?: boolean
  }>(),
  {
    orderNoPrefix: false,
  },
)

const emit = defineEmits<{
  tap: []
}>()

const lineItems = computed(() => props.order.items ?? [])

const deliveryTagKind = computed(() => getOrderDeliveryTagKind(props.order))
const deliveryTagLabel = computed(() => getOrderDeliveryTagLabel(props.order))
const deliveryTagClass = computed(() => `delivery-badge--${deliveryTagKind.value}`)

const orderNoText = computed(() =>
  props.orderNoPrefix ? `订单号 ${props.order.orderNo}` : props.order.orderNo,
)

const statusLabel = computed(() => getOrderProgressLabel(props.order))
const previewImage = computed(() => getOrderPreviewImage(lineItems.value))
const totalCount = computed(() => getOrderLineTotalCount(lineItems.value))
const totalQtyText = computed(() => `共 ${totalCount.value} 件`)
const priceText = computed(() => formatOrderListPrice(props.order.totalAmount))

function formatLineText(item: { name: string; count: number }) {
  return `${item.name} ×${item.count}`
}
</script>

<style lang="less">
@import '@/styles/tokens.less';

.order-list-card {
  box-sizing: border-box;
  max-width: calc(100% - 32rpx);
  background: #fff;
  margin: 16rpx;
  border-radius: 12rpx;
  padding: 20rpx 24rpx 24rpx;
}

.order-list-card__no-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 16rpx;
  min-width: 0;
}

.delivery-badge {
  flex-shrink: 0;
  font-size: 20rpx;
  line-height: 1.35;
  padding: 4rpx 10rpx;
  border-radius: 6rpx;
  font-weight: 500;
}

.delivery-badge--pickup {
  background: @color-warning-bg;
  color: @color-warning;
}

.delivery-badge--merchant {
  background: @color-success-bg;
  color: @color-success;
}

.delivery-badge--third_party {
  background: @color-info-bg;
  color: @color-link;
}

.order-no {
  flex: 1;
  min-width: 0;
  font-size: 22rpx;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-list-card__status {
  flex-shrink: 0;
  font-size: 24rpx;
  font-weight: 600;
  color: @color-primary;
  line-height: 1.35;
  max-width: 40%;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-list-card__body {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 16rpx;
}

.order-list-card__media {
  flex-shrink: 0;
}

.order-list-card__thumb {
  width: 120rpx;
  height: 120rpx;
  border-radius: 8rpx;
  background: @color-bg-placeholder;
}

.order-list-card__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  padding-top: 2rpx;
}

.order-list-card__line {
  min-width: 0;
}

.order-list-card__line-text {
  font-size: 26rpx;
  color: #333;
  line-height: 1.45;
  word-break: break-word;
}

.order-list-card__aside {
  flex-shrink: 0;
  width: 148rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: flex-end;
  align-self: stretch;
  gap: 8rpx;
  padding-top: 2rpx;
}

.order-list-card__price {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  line-height: 1.3;
}

.order-list-card__total-qty {
  font-size: 22rpx;
  color: #999;
  line-height: 1.3;
}

.order-list-card__footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 2rpx solid @color-bg-muted;
}
</style>
