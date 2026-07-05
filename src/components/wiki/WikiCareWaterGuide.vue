<template>
  <view class="wiki-care-guide">
    <view class="wiki-care-guide__visual">
      <view class="wiki-care-guide__vase wiki-care-guide__vase--water">
        <view class="wiki-care-guide__water" :style="fillStyle" />
        <view class="wiki-care-guide__water-line" :style="surfaceStyle" />
      </view>
      <view class="wiki-care-guide__stem" />
      <text class="wiki-care-guide__water-tag" :style="ratioTagStyle">{{ ratioShortLabel }}</text>
      <view class="wiki-care-guide__submerge" :style="submergeStyle">
        <text class="wiki-care-guide__submerge-label">{{ submergeShortLabel }}</text>
        <view class="wiki-care-guide__submerge-line" />
      </view>
    </view>
    <view class="wiki-care-guide__body">
      <text class="wiki-care-guide__title">{{ title }}</text>
      <view class="wiki-care-guide__specs">
        <view class="wiki-care-guide__spec">
          <text class="wiki-care-guide__spec-key">{{ vaseSpecKey }}</text>
          <WikiCareHighlightText :text="vaseSpecValue" tone="water" :block="false" />
        </view>
        <view class="wiki-care-guide__spec">
          <text class="wiki-care-guide__spec-key">{{ submergeSpecKey }}</text>
          <WikiCareHighlightText :text="submergeSpecValue" tone="water" :block="false" />
        </view>
      </view>
      <WikiCareHighlightText
        v-if="note"
        :text="note"
        tone="water"
        extra-class="wiki-care-guide__text"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WikiCareHighlightText from '@/components/wiki/WikiCareHighlightText.vue'
import { formatWaterSubmergeLabel } from '@/utils/wikiCareDisplay'
import { wikiCareWaterBottomRpx, wikiCareWaterLineBottom } from '@/utils/wikiCareVisual'

const props = defineProps<{
  ratio?: number | null
  submergeNote?: string
  submergeCm?: number | null
  vaseRatioLabel?: string
  note?: string
}>()

const title = '加水量'
const vaseSpecKey = '瓶高水位：'
const submergeSpecKey = '切口浸没：'
const fallbackRatio = 1 / 3

const resolvedRatio = computed(() => {
  const ratio = Number(props.ratio)
  return ratio > 0 && ratio <= 1 ? ratio : fallbackRatio
})

const waterBottomRpx = computed(() => wikiCareWaterBottomRpx(resolvedRatio.value))

const fillStyle = computed(() => ({
  height: wikiCareWaterLineBottom(resolvedRatio.value),
}))

const surfaceStyle = computed(() => ({
  bottom: wikiCareWaterLineBottom(resolvedRatio.value),
}))

/** 瓶高标签：贴水面左侧，与浸没标签分列茎两侧 */
const ratioTagStyle = computed(() => ({
  bottom: `${waterBottomRpx.value}rpx`,
}))

const submergeStyle = computed(() => {
  const cm = props.submergeCm
  const heightRpx = cm != null && cm > 0 ? Math.min(28, 8 + cm * 4) : 16
  return {
    bottom: `${waterBottomRpx.value}rpx`,
    height: `${heightRpx}rpx`,
  }
})

const ratioShortLabel = computed(() => {
  const label = String(props.vaseRatioLabel || '').trim()
  if (label.includes('1/3')) return '1/3'
  if (label.includes('1/2')) return '1/2'
  if (label.includes('2/3')) return '2/3'
  if (label.includes('1/4')) return '1/4'
  return `${Math.round(resolvedRatio.value * 100)}%`
})

const submergeShortLabel = computed(() => {
  const cm = props.submergeCm
  if (cm != null && cm > 0) return `${cm}cm`
  return '没入'
})

const vaseSpecValue = computed(
  () => String(props.vaseRatioLabel || '').trim() || `约 ${Math.round(resolvedRatio.value * 100)}% 瓶高`,
)

const submergeSpecValue = computed(() =>
  formatWaterSubmergeLabel(props.submergeNote || '', props.submergeCm ?? null),
)
</script>

<style lang="less">
@import '@/styles/wiki-care-visual.less';

.wiki-care-guide__water-tag {
  position: absolute;
  left: 8rpx;
  z-index: 2;
  font-size: 16rpx;
  font-weight: 700;
  line-height: 1;
  color: #1565c0;
  padding: 2rpx 6rpx;
  border-radius: 6rpx;
  background: rgba(227, 242, 253, 0.95);
  transform: translateY(50%);
}

.wiki-care-guide__submerge {
  position: absolute;
  left: 92rpx;
  z-index: 2;
  width: 36rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.wiki-care-guide__submerge-line {
  width: 2rpx;
  flex: 1;
  background: #1565c0;
  border-radius: 999rpx;
}

.wiki-care-guide__submerge-label {
  margin-bottom: 2rpx;
  font-size: 16rpx;
  font-weight: 700;
  line-height: 1;
  color: #1565c0;
  white-space: nowrap;
  padding: 2rpx 6rpx;
  border-radius: 6rpx;
  background: rgba(227, 242, 253, 0.95);
}

.wiki-care-guide__specs {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-top: 8rpx;
}

.wiki-care-guide__spec {
  display: flex;
  flex-wrap: wrap;
  gap: 4rpx;
  font-size: 24rpx;
  color: #666;
  line-height: 1.5;
}

.wiki-care-guide__spec-key {
  color: #888;
}
</style>
