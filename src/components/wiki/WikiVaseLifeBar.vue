<template>
  <view class="wiki-vase-life">
    <view v-if="range" class="wiki-vase-life__bar-block">
      <view class="wiki-vase-life__track">
        <view
          class="wiki-vase-life__seg wiki-vase-life__seg--min"
          :style="{ width: minSegWidth }"
        />
        <view
          v-if="hasFloatRange"
          class="wiki-vase-life__seg wiki-vase-life__seg--float"
          :style="{ width: floatSegWidth }"
        />
      </view>
      <view class="wiki-vase-life__labels">
        <view class="wiki-vase-life__label-col" :style="{ width: minSegWidth }">
          <text class="wiki-vase-life__label">{{ minDaysText }}</text>
        </view>
        <view
          v-if="hasFloatRange"
          class="wiki-vase-life__label-col"
          :style="{ width: floatSegWidth }"
        >
          <text class="wiki-vase-life__label">{{ maxDaysText }}</text>
        </view>
        <view class="wiki-vase-life__label-spacer" :style="{ width: tailSpacerWidth }" />
      </view>
    </view>
    <WikiDataText
      v-if="captionText"
      class="wiki-vase-life__caption-wrap"
      :text="captionText"
      :source="vaseSource"
      :inline="false"
      extra-class="wiki-vase-life__caption"
    />
    <WikiDataText
      v-if="noteText"
      class="wiki-vase-life__note-wrap"
      :text="noteText"
      :source="noteSource"
      :inline="false"
      extra-class="wiki-vase-life__note"
    />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WikiDataText from '@/components/wiki/WikiDataText.vue'
import {
  parseVaseLifeRange,
  resolveVaseLifeBarScale,
} from '@/utils/wikiVaseLife'

const props = defineProps<{
  vaseLife: string
  note?: string
  vaseSource?: string
  noteSource?: string
}>()

const range = computed(() => parseVaseLifeRange(props.vaseLife))
const scaleMax = computed(() => {
  if (!range.value) return 14
  return resolveVaseLifeBarScale(range.value.min, range.value.max)
})

const hasFloatRange = computed(
  () => !!range.value && range.value.max > range.value.min,
)

const minSegWidth = computed(() => {
  if (!range.value) return '0%'
  return `${Math.round((range.value.min / scaleMax.value) * 100)}%`
})

const floatSegWidth = computed(() => {
  if (!range.value || !hasFloatRange.value) return '0%'
  const span = range.value.max - range.value.min
  return `${Math.round((span / scaleMax.value) * 100)}%`
})

const tailSpacerWidth = computed(() => {
  if (!range.value) return '0%'
  const used = range.value.max / scaleMax.value
  return `${Math.max(0, Math.round((1 - used) * 100))}%`
})

const minDaysText = computed(() => {
  if (!range.value) return ''
  return `${range.value.min}天`
})

const maxDaysText = computed(() => {
  if (!range.value) return ''
  return `${range.value.max}天`
})

const captionText = computed(() => {
  const life = String(props.vaseLife || '').trim()
  if (!life) return ''
  if (range.value && range.value.min !== range.value.max) {
    return `瓶插养护条件下，最短约 ${range.value.min} 天，养护到位可延至 ${range.value.max} 天`
  }
  return `瓶插养护条件下，约可观赏 ${life}`
})

const noteText = computed(() => String(props.note || '').trim())
</script>

<style lang="less">
@import '@/styles/tokens.less';
.wiki-vase-life__bar-block {
  padding: 8rpx 0 4rpx;
}

.wiki-vase-life__track {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  height: 20rpx;
  background: @color-tag-bg;
  border-radius: 10rpx;
  overflow: hidden;
}

.wiki-vase-life__seg {
  height: 100%;
  min-width: 4rpx;

  &--min {
    background: linear-gradient(90deg, @color-green-mid 0%, @color-green-mid 100%);
    border-radius: 10rpx 0 0 10rpx;
  }

  &--float {
    background: linear-gradient(90deg, @color-wiki-green-bg 0%, @color-success-bg 100%);
    border-left: 2rpx solid rgba(255, 255, 255, 0.85);
    border-radius: 0 10rpx 10rpx 0;
  }
}

.wiki-vase-life__labels {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  margin-top: 10rpx;
}

.wiki-vase-life__label-col {
  min-width: 0;
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  overflow: visible;
}

.wiki-vase-life__label-spacer {
  flex-shrink: 0;
}

.wiki-vase-life__label {
  font-size: 18rpx;
  color: #666;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  text-align: right;
}

.wiki-vase-life__caption {
  display: block;
  margin-top: 12rpx;
  font-size: 28rpx;
  color: #555;
  line-height: 1.85;
}

.wiki-vase-life__note {
  display: block;
  margin-top: 8rpx;
  font-size: 28rpx;
  color: #999;
  line-height: 1.85;
}
</style>
