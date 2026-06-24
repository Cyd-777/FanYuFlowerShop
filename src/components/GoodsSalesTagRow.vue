<template>
  <view v-if="tags.length" class="goods-sales-tag-row" :class="{ compact }">
    <text
      v-for="tag in tags"
      :key="tag.key"
      class="goods-sales-tag"
      :class="tag.tone"
    >{{ tag.label }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  collectGoodsSalesTags,
  type GoodsSalesTagSource,
} from '@/utils/goodsSalesTags'

const props = withDefaults(
  defineProps<{
    goods: GoodsSalesTagSource
    compact?: boolean
    includeCategory?: boolean
    includeSalesType?: boolean
  }>(),
  {
    compact: false,
    includeCategory: true,
    includeSalesType: true,
  },
)

const tags = computed(() =>
  collectGoodsSalesTags(props.goods, {
    includeCategory: props.includeCategory,
    includeSalesType: props.includeSalesType,
  }),
)
</script>

<style lang="less">
@import '@/styles/tokens.less';

.goods-sales-tag-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8rpx;
  padding: 6rpx 16rpx 0;
  box-sizing: border-box;

  &.compact {
    padding: 6rpx 0 0;
  }
}

.goods-sales-tag {
  padding: 2rpx 12rpx;
  font-size: 20rpx;
  line-height: 1.4;
  border-radius: 6rpx;

  &.new {
    color: #2e7d32;
    background: #e8f5e9;
  }

  &.recommend {
    color: @color-primary;
    background: @color-primary-light;
  }

  &.category {
    color: @color-text-secondary;
    background: @color-bg-muted;
  }

  &.salesType {
    color: #5c6bc0;
    background: rgba(92, 107, 192, 0.12);
  }
}
</style>
