<template>
  <view class="wiki-bloom-season">
    <view class="wiki-bloom-season__months">
      <view
        v-for="(label, index) in monthLabels"
        :key="label"
        class="wiki-bloom-season__month"
        :class="{ 'wiki-bloom-season__month--active': activeSet.has(index + 1) }"
      >
        <view class="wiki-bloom-season__bar" />
        <text class="wiki-bloom-season__label">{{ label }}</text>
      </view>
    </view>
    <view v-if="captionText" class="wiki-bloom-season__caption">
      <text class="wiki-bloom-season__caption-dot">{{ dotChar }}</text>
      <text>{{ captionText }}</text>
    </view>
    <text v-if="noteText" class="wiki-bloom-season__note">{{ noteText }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { WIKI_MONTH_LABELS } from '@/utils/wikiBloomSeason'

const props = defineProps<{
  months: number[]
  caption?: string
  note?: string
}>()

const monthLabels = WIKI_MONTH_LABELS
const dotChar = '·'
const activeSet = computed(() => new Set(props.months || []))
const captionText = computed(() => String(props.caption || '').trim())
const noteText = computed(() => String(props.note || '').trim())
</script>

<style lang="less">
@import '@/styles/tokens.less';
.wiki-bloom-season__months {
  display: flex;
  flex-direction: row;
  gap: 6rpx;
}

.wiki-bloom-season__month {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.wiki-bloom-season__bar {
  width: 100%;
  height: 48rpx;
  background: @color-tag-bg;
  border-radius: 8rpx;
}

.wiki-bloom-season__month--active .wiki-bloom-season__bar {
  background: linear-gradient(180deg, @color-danger-bg 0%, @color-primary 100%);
  box-shadow: 0 4rpx 8rpx rgba(229, 57, 53, 0.25);
}

.wiki-bloom-season__label {
  font-size: 18rpx;
  color: @color-wiki-gray;
  line-height: 1;
}

.wiki-bloom-season__month--active .wiki-bloom-season__label {
  color: @color-danger;
  font-weight: 600;
}

.wiki-bloom-season__caption {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 16rpx;
  font-size: 24rpx;
  color: #666;
}

.wiki-bloom-season__caption-dot {
  color: @color-primary;
  font-weight: 700;
}

.wiki-bloom-season__note {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #999;
  line-height: 1.5;
}
</style>
