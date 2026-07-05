<template>
  <view v-if="show" class="goods-new-listing-badge">{{ labelText }}</view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Goods } from '@/types/goods'
import { isNewListing } from '@/utils/goodsNewListing'

const labelText = '新上架'

const props = defineProps<{
  goods: Pick<Goods, 'onSale' | 'createdAt'>
}>()

const show = computed(() => isNewListing(props.goods))
</script>

<style lang="less">
@import '@/styles/tokens.less';

.goods-new-listing-badge {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  padding: 4rpx 14rpx;
  font-size: 22rpx;
  color: #fff;
  border-radius: 8rpx;
  z-index: 2;
  pointer-events: none;
  background: rgba(229, 57, 53, 0.92);
}
</style>
