<template>
  <view v-if="overlay" class="goods-sold-out-badge" :class="overlay.kind">{{ overlay.label }}</view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getCustomerGoodsImageOverlay } from '@/utils/goodsAvailability'

const props = defineProps<{
  stock: number
  onSale?: boolean
}>()

const overlay = computed(() =>
  getCustomerGoodsImageOverlay({
    stock: props.stock,
    onSale: props.onSale !== false,
  }),
)
</script>

<style lang="less">
.goods-sold-out-badge {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  padding: 4rpx 14rpx;
  font-size: 22rpx;
  color: #fff;
  border-radius: 8rpx;
  z-index: 2;
  pointer-events: none;

  &.soldOut {
    background: rgba(0, 0, 0, 0.55);
  }

  &.lowStock {
    background: rgba(230, 81, 0, 0.88);
  }
}
</style>
