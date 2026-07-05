<template>
  <view class="wiki-care-guide">
    <view class="wiki-care-guide__visual">
      <view class="wiki-care-guide__vase wiki-care-guide__vase--water">
        <view class="wiki-care-guide__water" :style="waterStyle" />
        <view class="wiki-care-guide__water-line" :style="waterLineStyle" />
      </view>
      <view class="wiki-care-guide__stem" />
      <view class="wiki-care-guide__leaf wiki-care-guide__leaf--top" />
      <view class="wiki-care-guide__leaf wiki-care-guide__leaf--mid" />
      <view class="wiki-care-guide__leaf wiki-care-guide__leaf--remove">
        <view class="wiki-care-guide__leaf-strike" />
      </view>
      <view class="wiki-care-guide__angle-pivot">
        <view class="wiki-care-guide__axis-ray wiki-care-guide__axis-ray--v" />
        <view
          class="wiki-care-guide__axis-ray wiki-care-guide__axis-ray--cut"
          :style="angleRayStyle"
        />
      </view>
      <text class="wiki-care-guide__badge wiki-care-guide__badge--angle">{{ angleLabel }}</text>
      <text class="wiki-care-guide__badge wiki-care-guide__badge--cut">{{ cutMark }}</text>
    </view>
    <view class="wiki-care-guide__body">
      <text class="wiki-care-guide__title">{{ title }}</text>
      <WikiCareHighlightText
        v-if="trimNote"
        :text="trimNote"
        extra-class="wiki-care-guide__text"
      />
      <WikiCareHighlightText
        v-if="positionNote"
        :text="positionNote"
        tone="muted"
        extra-class="wiki-care-guide__text wiki-care-guide__text--secondary"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WikiCareHighlightText from '@/components/wiki/WikiCareHighlightText.vue'
import { wikiCareWaterLineBottom } from '@/utils/wikiCareVisual'

const props = defineProps<{
  angle?: number | null
  trimNote?: string
  positionNote?: string
  waterRatio?: number | null
}>()

const title = '修剪'
const cutMark = '水上'
const fallbackAngle = 45
const fallbackWaterRatio = 1 / 3

const resolvedAngle = computed(() => {
  const angle = Number(props.angle)
  return angle > 0 && angle <= 90 ? angle : fallbackAngle
})

const resolvedWaterRatio = computed(() => {
  const ratio = Number(props.waterRatio)
  return ratio > 0 && ratio <= 1 ? ratio : fallbackWaterRatio
})

/** 以垂直方向为 0°，逆时针旋转（CSS 负值 = 逆时针） */
const angleRayStyle = computed(() => ({
  transform: `rotate(-${resolvedAngle.value}deg)`,
}))

const angleLabel = computed(() => `${resolvedAngle.value}°`)

const waterStyle = computed(() => ({
  height: wikiCareWaterLineBottom(resolvedWaterRatio.value),
}))

const waterLineStyle = computed(() => ({
  bottom: wikiCareWaterLineBottom(resolvedWaterRatio.value),
}))
</script>

<style lang="less">
@import '@/styles/wiki-care-visual.less';

.wiki-care-guide__text--secondary {
  margin-top: 6rpx;
  color: #777;
}
</style>
