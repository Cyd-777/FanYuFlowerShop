<template>
  <view v-if="visible" class="goods-new-listing-badge">{{ label }}</view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { isNewListing } from '@/utils/goodsNewListing'
import type { Goods } from '@/types/goods'

const props = withDefaults(
  defineProps<{
    goods: Pick<Goods, 'onSale' | 'listedAt' | 'createdAt'>
    label?: string
  }>(),
  {
    label: '新上架',
  },
)

const visible = computed(() => isNewListing(props.goods))
</script>

<style lang="less">
.goods-new-listing-badge {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  padding: 4rpx 14rpx;
  font-size: 22rpx;
  color: #fff;
  background: rgba(46, 125, 50, 0.92);
  border-radius: 8rpx;
  z-index: 2;
  pointer-events: none;
}
</style>
