<template>
  <view class="wiki-section">
    <WikiFieldSlot
      anchor-id="wiki-anchor-language"
      label="花语概要"
      :empty="!fields.summary"
      :highlight="highlightAnchor === 'wiki-anchor-language'"
    >
      <text class="wiki-text">{{ fields.summary }}</text>
    </WikiFieldSlot>

    <WikiFieldSlot label="核心花语" :empty="!fields.meaning">
      <text class="wiki-text">{{ fields.meaning }}</text>
    </WikiFieldSlot>

    <WikiFieldSlot label="适用场景" :empty="!fields.occasions.length">
      <view class="wiki-tags">
        <text v-for="(item, idx) in fields.occasions" :key="idx" class="wiki-tag">{{ item }}</text>
      </view>
    </WikiFieldSlot>

    <WikiFieldSlot label="色彩寓意" :empty="!fields.colorMeanings.length">
      <view class="wiki-colors">
        <view v-for="(item, idx) in fields.colorMeanings" :key="idx" class="wiki-color-row">
          <text class="wiki-color-name">{{ item.color }}</text>
          <text class="wiki-color-meaning">{{ item.meaning }}</text>
        </view>
      </view>
    </WikiFieldSlot>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WikiFieldSlot from '@/components/WikiFieldSlot.vue'
import type { FlowerWiki } from '@/types/wiki'
import { resolveWikiLanguage } from '@/types/wiki'

const props = defineProps<{
  wiki: FlowerWiki
  highlightAnchor?: string
}>()

const fields = computed(() => resolveWikiLanguage(props.wiki))
</script>

<style lang="less">
.wiki-text {
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
}
.wiki-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.wiki-tag {
  padding: 8rpx 20rpx;
  background: #f5f5f5;
  border-radius: 24rpx;
  font-size: 24rpx;
  color: #666;
}
.wiki-colors {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.wiki-color-row {
  display: flex;
  gap: 16rpx;
  font-size: 26rpx;
  line-height: 1.5;
}
.wiki-color-name {
  width: 80rpx;
  flex-shrink: 0;
  color: #e53935;
  font-weight: 600;
}
.wiki-color-meaning {
  flex: 1;
  color: #666;
}
</style>
