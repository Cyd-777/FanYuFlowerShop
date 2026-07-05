<template>
  <view class="wiki-care-condition">
    <view class="wiki-care-condition__icon-wrap">
      <text class="wiki-care-condition__icon">{{ item.icon }}</text>
    </view>
    <view class="wiki-care-condition__body">
      <text class="wiki-care-condition__label">{{ item.label }}</text>
      <WikiCareHighlightText :text="item.text" extra-class="wiki-care-condition__text" />
    </view>
  </view>
</template>

<script setup lang="ts">
import type { WikiCareConditionItem } from '@/utils/wikiCareDisplay'
import WikiCareHighlightText from '@/components/wiki/WikiCareHighlightText.vue'

defineProps<{
  item: WikiCareConditionItem
}>()
</script>

<style lang="less">
.wiki-care-condition {
  display: flex;
  gap: 16rpx;
  align-items: flex-start;
  padding: 16rpx 0;
}

.wiki-care-condition__icon-wrap {
  flex-shrink: 0;
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  background: #f5f7fa;
}

.wiki-care-condition__icon {
  font-size: 32rpx;
  line-height: 1;
}

.wiki-care-condition__body {
  flex: 1;
  min-width: 0;
}

.wiki-care-condition__label {
  display: block;
  font-size: 24rpx;
  font-weight: 600;
  color: #333;
}

.wiki-care-condition__text {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #666;
  line-height: 1.6;
}
</style>
