<template>
  <view class="wiki-language-color">
    <view class="wiki-language-color__dot-wrap">
      <view
        class="wiki-language-color__dot"
        :class="{ 'wiki-language-color__dot--light': lightTone }"
        :style="dotStyle"
      />
    </view>
    <view class="wiki-language-color__body">
      <WikiDataText
        :text="colorLabel"
        :source="colorSource"
        :inline="false"
        extra-class="wiki-language-color__name"
      />
      <WikiDataText
        :text="meaning"
        :source="meaningSource"
        :inline="false"
        extra-class="wiki-language-color__meaning"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WikiDataText from '@/components/wiki/WikiDataText.vue'
import {
  formatWikiColorLabel,
  isLightWikiColor,
  resolveWikiColorHex,
} from '@/utils/wikiLanguageDisplay'

const props = defineProps<{
  color: string
  meaning: string
  colorSource?: string
  meaningSource?: string
}>()

const hex = computed(() => resolveWikiColorHex(props.color))
const lightTone = computed(() => isLightWikiColor(hex.value))
const colorLabel = computed(() => formatWikiColorLabel(props.color))
const meaning = computed(() => String(props.meaning || '').trim())

const dotStyle = computed(() => ({
  background: hex.value,
}))
</script>

<style lang="less">
@import '@/styles/tokens.less';
.wiki-language-color {
  display: flex;
  gap: 16rpx;
  align-items: flex-start;
  padding: 14rpx 0;
}

.wiki-language-color__dot-wrap {
  flex-shrink: 0;
  width: 40rpx;
  padding-top: 4rpx;
}

.wiki-language-color__dot {
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.12);

  &--light {
    border: 2rpx solid @color-border-dashed;
  }
}

.wiki-language-color__body {
  flex: 1;
  min-width: 0;
}

.wiki-language-color__name {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  color: #333;
  line-height: 1.4;
}

.wiki-language-color__meaning {
  display: block;
  margin-top: 4rpx;
  font-size: 24rpx;
  color: #666;
  line-height: 1.6;
}
</style>
