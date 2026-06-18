<template>
  <view v-if="soldOut" class="goods-sold-out-badge">{{ label }}</view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { isGoodsSoldOut } from '@/utils/goodsAvailability'

const props = defineProps<{
  stock: number
  onSale?: boolean
}>()

const label = '售罄'

const soldOut = computed(() =>
  isGoodsSoldOut({ stock: props.stock, onSale: props.onSale !== false }),
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
  background: rgba(0, 0, 0, 0.55);
  border-radius: 8rpx;
  z-index: 1;
}
</style>
