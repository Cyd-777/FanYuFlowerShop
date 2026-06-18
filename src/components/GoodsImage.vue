<template>
  <view class="goods-image" :class="rootClass">
    <view v-show="showPlaceholder" class="goods-image-ph">
      <view v-if="isLoading" class="goods-image-shimmer" />
      <text class="goods-image-emoji">{{ emoji }}</text>
      <text v-if="showHint && !isLoading" class="goods-image-hint">{{ hintText }}</text>
    </view>
    <image
      v-if="effectiveSrc && !failed"
      class="goods-image-img"
      :class="{ loaded }"
      :src="effectiveSrc"
      :mode="mode"
      @load="onLoad"
      @error="onError"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    src?: string
    mode?: 'aspectFill' | 'aspectFit' | 'widthFix'
    emoji?: string
    showHint?: boolean
    hintText?: string
    rootClass?: string
  }>(),
  {
    src: '',
    mode: 'aspectFill',
    emoji: '🌷',
    showHint: false,
    hintText: '暂无图片',
    rootClass: '',
  },
)

const loaded = ref(false)
const failed = ref(false)

const effectiveSrc = computed(() => props.src?.trim() || '')

const isLoading = computed(
  () => !!effectiveSrc.value && !loaded.value && !failed.value,
)

const showPlaceholder = computed(
  () => !effectiveSrc.value || failed.value || !loaded.value,
)

watch(effectiveSrc, () => {
  loaded.value = false
  failed.value = false
})

function onLoad() {
  loaded.value = true
}

function onError() {
  failed.value = true
}
</script>

<style lang="less">
@import '@/styles/tokens.less';

.goods-image {
  position: relative;
  overflow: hidden;
  background: @color-bg-placeholder;
  isolation: isolate;
}

.goods-image-ph {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: @color-bg-placeholder;
}

.goods-image-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    @color-bg-placeholder 0%,
    @color-bg-muted 45%,
    @color-bg-placeholder 100%
  );
  background-size: 200% 100%;
  animation: goods-image-shimmer 1.4s ease-in-out infinite;
}

@keyframes goods-image-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.goods-image-emoji {
  position: relative;
  z-index: 1;
  font-size: 48rpx;
  line-height: 1;
  opacity: 0.55;
}

.goods-image-hint {
  position: relative;
  z-index: 1;
  margin-top: 8rpx;
  font-size: 20rpx;
  color: @color-text-placeholder;
}

.goods-image-img {
  display: block;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.2s ease;
  &.loaded {
    opacity: 1;
  }
}
</style>
