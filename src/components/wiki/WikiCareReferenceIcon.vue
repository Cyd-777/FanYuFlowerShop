<template>
  <view class="wiki-care-ref-icon" :class="`wiki-care-ref-icon--${visual}`">
    <text v-if="visual === 'emoji' && icon" class="wiki-care-ref-icon__emoji">{{ icon }}</text>
    <view v-else-if="visual === 'placeholder'" class="wiki-care-ref-icon__placeholder" />
    <view v-else-if="visual === 'trim-angle' || visual === 'trim-position'" class="wiki-care-ref-icon__mini">
      <view class="wiki-care-ref-icon__mini-vase wiki-care-ref-icon__mini-vase--water">
        <view class="wiki-care-ref-icon__mini-water wiki-care-ref-icon__mini-water--third" />
      </view>
      <view class="wiki-care-ref-icon__mini-stem wiki-care-ref-icon__mini-stem--upright" />
      <view class="wiki-care-ref-icon__mini-pivot">
        <view class="wiki-care-ref-icon__mini-ray wiki-care-ref-icon__mini-ray--v" />
        <view class="wiki-care-ref-icon__mini-ray wiki-care-ref-icon__mini-ray--cut" :style="angleRayStyle" />
      </view>
    </view>
    <view v-else-if="visual === 'water-standard'" class="wiki-care-ref-icon__mini wiki-care-ref-icon__mini--water">
      <view class="wiki-care-ref-icon__mini-vase wiki-care-ref-icon__mini-vase--water">
        <view class="wiki-care-ref-icon__mini-water wiki-care-ref-icon__mini-water--third" />
      </view>
      <view class="wiki-care-ref-icon__mini-stem wiki-care-ref-icon__mini-stem--upright" />
      <text class="wiki-care-ref-icon__mini-tag wiki-care-ref-icon__mini-tag--left">1/3</text>
      <text class="wiki-care-ref-icon__mini-tag wiki-care-ref-icon__mini-tag--right">3cm</text>
    </view>
    <view v-else-if="visual === 'water-shallow'" class="wiki-care-ref-icon__mini wiki-care-ref-icon__mini--water">
      <view class="wiki-care-ref-icon__mini-vase wiki-care-ref-icon__mini-vase--water">
        <view class="wiki-care-ref-icon__mini-water wiki-care-ref-icon__mini-water--quarter" />
      </view>
      <view class="wiki-care-ref-icon__mini-stem wiki-care-ref-icon__mini-stem--upright" />
      <text class="wiki-care-ref-icon__mini-tag wiki-care-ref-icon__mini-tag--left">1/4</text>
      <text class="wiki-care-ref-icon__mini-tag wiki-care-ref-icon__mini-tag--right">2cm</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { WikiCareCatalogVisual } from '@/utils/wikiCareCatalog'

const props = withDefaults(
  defineProps<{
    visual: WikiCareCatalogVisual
    icon?: string
    angle?: number
  }>(),
  {
    angle: 45,
  },
)

const resolvedAngle = computed(() => {
  const angle = Number(props.angle)
  return angle > 0 && angle <= 90 ? angle : 45
})

const angleRayStyle = computed(() => ({
  transform: `rotate(-${resolvedAngle.value}deg)`,
}))
</script>

<style lang="less">
.wiki-care-ref-icon {
  flex-shrink: 0;
  width: 88rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  background: #f8fafb;
  border: 1rpx solid #eef1f4;
  overflow: hidden;
}

.wiki-care-ref-icon__emoji {
  font-size: 40rpx;
  line-height: 1;
}

.wiki-care-ref-icon__placeholder {
  width: 24rpx;
  height: 24rpx;
  border-radius: 8rpx;
  background: #e0e0e0;
}

.wiki-care-ref-icon__mini {
  position: relative;
  width: 72rpx;
  height: 72rpx;
}

.wiki-care-ref-icon__mini-vase {
  position: absolute;
  left: 22rpx;
  bottom: 6rpx;
  width: 28rpx;
  height: 40rpx;
  border: 2rpx solid #cfd8dc;
  border-top: none;
  border-radius: 0 0 10rpx 10rpx;
  background: rgba(236, 239, 241, 0.45);

  &--water {
    border-color: #90caf9;
    background: rgba(227, 242, 253, 0.35);
  }
}

.wiki-care-ref-icon__mini-water {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, #64b5f6 0%, #1e88e5 100%);

  &--third {
    height: 33%;
  }

  &--quarter {
    height: 25%;
  }
}

.wiki-care-ref-icon__mini-stem {
  position: absolute;
  left: 34rpx;
  bottom: 14rpx;
  width: 4rpx;
  height: 46rpx;
  border-radius: 999rpx;
  background: linear-gradient(180deg, #66bb6a 0%, #43a047 100%);
  z-index: 1;

  &--upright {
    transform: none;
  }
}

.wiki-care-ref-icon__mini-pivot {
  position: absolute;
  left: 36rpx;
  bottom: 24rpx;
  width: 0;
  height: 0;
  z-index: 2;
  pointer-events: none;
}

.wiki-care-ref-icon__mini-ray {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: center center;

  &--v {
    width: 0;
    height: 32rpx;
    margin-left: -1rpx;
    margin-top: -16rpx;
    border-left: 2rpx dashed rgba(120, 144, 156, 0.55);
  }

  &--cut {
    width: 0;
    height: 22rpx;
    margin-left: -1rpx;
    margin-top: -11rpx;
    border-left: 2rpx dashed rgba(229, 57, 53, 0.9);
  }
}

.wiki-care-ref-icon__mini-tag {
  position: absolute;
  bottom: 20rpx;
  z-index: 2;
  font-size: 12rpx;
  font-weight: 700;
  line-height: 1;
  color: #1565c0;
  padding: 1rpx 4rpx;
  border-radius: 4rpx;
  background: rgba(227, 242, 253, 0.95);

  &--left {
    left: 4rpx;
  }

  &--right {
    right: 4rpx;
  }
}
</style>
