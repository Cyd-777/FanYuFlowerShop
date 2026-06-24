<template>
  <view class="wiki-detail-content">
    <view class="wiki-detail-tabs" :class="{ 'wiki-detail-tabs--compact': compact }">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="wiki-detail-tab"
        :class="{ active: modelValue === tab.key }"
        @tap="emit('update:modelValue', tab.key)"
      >
        <text v-if="compact" class="wiki-detail-tab-icon">{{ tab.icon }}</text>
        <text class="wiki-detail-tab-label">{{ compact ? tab.shortLabel : tab.label }}</text>
      </view>
    </view>

    <view class="wiki-detail-body">
      <WikiAtlasSection
        v-if="modelValue === 'atlas'"
        :wiki="wiki"
        :highlight-anchor="highlightAnchor"
      />
      <WikiCareSection
        v-else-if="modelValue === 'care'"
        :wiki="wiki"
        :highlight-anchor="highlightAnchor"
      />
      <WikiLanguageSection v-else :wiki="wiki" :highlight-anchor="highlightAnchor" />
    </view>
  </view>
</template>

<script setup lang="ts">
import WikiAtlasSection from '@/components/wiki/WikiAtlasSection.vue'
import WikiCareSection from '@/components/wiki/WikiCareSection.vue'
import WikiLanguageSection from '@/components/wiki/WikiLanguageSection.vue'
import type { FlowerWiki, WikiTab } from '@/types/wiki'
import { WIKI_TAB_CONFIG } from '@/types/wiki'

defineProps<{
  wiki: FlowerWiki
  modelValue: WikiTab
  highlightAnchor?: string
  compact?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [tab: WikiTab]
}>()

const tabs = WIKI_TAB_CONFIG
</script>

<style lang="less">
.wiki-detail-tabs {
  display: flex;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;

  &--compact {
    padding: 6rpx;
    background: #f8f8f8;
    border-radius: 12rpx;
  }
}

.wiki-detail-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20rpx 8rpx;
  font-size: 24rpx;
  color: #666;

  &.active {
    color: #e53935;
    font-weight: 600;
    background: #fff5f5;
  }

  .wiki-detail-tabs--compact & {
    padding: 12rpx 6rpx;
    border-radius: 10rpx;
    color: #999;

    &.active {
      background: #fff;
      color: #e53935;
      box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
    }
  }
}

.wiki-detail-tab-icon {
  font-size: 24rpx;
  line-height: 1.2;
}

.wiki-detail-tab-label {
  line-height: 1.3;

  .wiki-detail-tabs--compact & {
    margin-top: 4rpx;
    font-size: 20rpx;
  }
}

.wiki-detail-body {
  margin-top: 16rpx;
}
</style>
