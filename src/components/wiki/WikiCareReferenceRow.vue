<template>
  <view class="wiki-care-ref-row">
    <WikiCareReferenceIcon
      :visual="item.visual"
      :icon="item.icon"
      :angle="item.angle"
    />
    <view class="wiki-care-ref-row__body">
      <view class="wiki-care-ref-row__title">{{ item.title }}</view>
      <view class="wiki-care-ref-row__desc">{{ item.description }}</view>
      <view v-if="item.detail" class="wiki-care-ref-row__detail">{{ item.detail }}</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import WikiCareReferenceIcon from '@/components/wiki/WikiCareReferenceIcon.vue'
import type { WikiCareCatalogItem } from '@/utils/wikiCareCatalog'

defineProps<{
  item: WikiCareCatalogItem
}>()
</script>

<style lang="less">
.wiki-care-ref-row {
  display: flex;
  gap: 20rpx;
  align-items: flex-start;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
}

.wiki-care-ref-row__body {
  flex: 1;
  min-width: 0;
}

.wiki-care-ref-row__title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
}

.wiki-care-ref-row__desc {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #666;
  line-height: 1.55;
}

.wiki-care-ref-row__detail {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #999;
  line-height: 1.5;
}
</style>
