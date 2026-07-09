<template>
  <view class="wiki-detail-content">
    <view class="wiki-detail-stack">
      <view
        id="wiki-section-atlas"
        class="wiki-detail-section-header"
      >
        {{ introTitle }}
      </view>
      <WikiAtlasSection :wiki="wiki" :highlight-anchor="highlightAnchor" />

      <view
        id="wiki-section-care"
        class="wiki-detail-section-header"
      >
        {{ careTitle }}
      </view>
      <WikiCareSection
        v-if="hasCare"
        :wiki="wiki"
        :highlight-anchor="highlightAnchor"
      />
      <text v-else class="wiki-detail-section-empty">{{ emptyText }}</text>

      <view
        id="wiki-section-language"
        class="wiki-detail-section-header"
      >
        {{ languageTitle }}
      </view>
      <view class="wiki-detail-section wiki-detail-section--last">
        <WikiLanguageSection :wiki="wiki" :highlight-anchor="highlightAnchor" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WikiAtlasSection from '@/components/wiki/WikiAtlasSection.vue'
import WikiCareSection from '@/components/wiki/WikiCareSection.vue'
import WikiLanguageSection from '@/components/wiki/WikiLanguageSection.vue'
import type { FlowerWiki } from '@/types/wiki'
import { hasWikiCareSoilContent, hasWikiCareVaseContent } from '@/types/wiki'

const introTitle = '介绍'
const careTitle = '养护方式'
const languageTitle = '花语'

const props = defineProps<{
  wiki: FlowerWiki
  highlightAnchor?: string
  emptyText?: string
}>()

const emptyText = computed(() => props.emptyText || '暂无相关内容')

const hasCare = computed(
  () => hasWikiCareVaseContent(props.wiki) || hasWikiCareSoilContent(props.wiki),
)
</script>

<style lang="less">
.wiki-detail-stack {
  padding: 8rpx 32rpx 0;
}

.wiki-detail-section--last {
  min-height: 48vh;
  padding-bottom: 32rpx;
}

.wiki-detail-section-header {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  padding: 24rpx 0 12rpx;
  line-height: 1.4;

  &:not(:first-child) {
    margin-top: 16rpx;
    padding-top: 32rpx;
    border-top: 1rpx solid @color-bg-placeholder;
  }
}

.wiki-detail-section-empty {
  display: block;
  font-size: 26rpx;
  color: #999;
  line-height: 1.6;
  padding: 8rpx 0 16rpx;
}
</style>
