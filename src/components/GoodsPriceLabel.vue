<template>
  <view class="goods-price-label" :class="rootClass">
    <text class="goods-price-label__int">{{ parts.integer }}</text>
    <template v-if="parts.fraction != null">
      <text class="goods-price-label__dot">.</text>
      <text class="goods-price-label__frac">{{ parts.fraction }}</text>
    </template>
    <text class="goods-price-label__yuan">¥</text>
    <text v-if="showUnit" class="goods-price-label__unit">/{{ unitLabel }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getGoodsUnitLabel } from '@/types/goods'
import { splitGoodsPrice } from '@/utils/goodsPrice'

const props = withDefaults(
  defineProps<{
    price: number
    unit?: string | null
    showUnit?: boolean
    rootClass?: string | string[] | Record<string, boolean>
    fallbackUnit?: string
  }>(),
  {
    showUnit: true,
    fallbackUnit: '束',
  },
)

const parts = computed(() => splitGoodsPrice(props.price))

const unitLabel = computed(() =>
  getGoodsUnitLabel(props.unit || props.fallbackUnit),
)
</script>

<style lang="less">
.goods-price-label {
  display: inline-flex;
  align-items: baseline;
  font-weight: 600;
  line-height: 1.2;
  color: inherit;
}

.goods-price-label__yuan {
  font-size: 21rpx;
}

.goods-price-label__int {
  font-size: 28rpx;
}

.goods-price-label__dot,
.goods-price-label__frac {
  font-size: 16rpx;
}

.goods-price-label__unit {
  font-size: 21rpx;
  font-weight: 500;
}
</style>
