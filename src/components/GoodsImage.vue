<template>
  <view class="goods-image" :class="rootClass">
    <view v-show="showPlaceholder" class="goods-image-ph">
      <view v-if="isLoading" class="goods-image-shimmer" />
      <text class="goods-image-emoji">{{ emoji }}</text>
      <text v-if="showHint && !isLoading" class="goods-image-hint">{{ hintText }}</text>
    </view>
    <image
      v-if="displaySrc && !failed"
      :key="imageRenderKey"
      class="goods-image-img"
      :class="{ loaded }"
      :src="displaySrc"
      :mode="mode"
      @load="onLoad"
      @error="onError"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  fetchPublicImageLocalPath,
  isCloudFileId,
  resolveImageDisplayPath,
} from '@/utils/goodsImage'

const props = withDefaults(
  defineProps<{
    src?: string
    /** cloud:// 文件 ID，HTTPS 换链失败时用云函数代理读取 */
    cloudFileId?: string
    mode?: 'aspectFill' | 'aspectFit' | 'widthFix'
    emoji?: string
    showHint?: boolean
    hintText?: string
    rootClass?: string
  }>(),
  {
    src: '',
    cloudFileId: '',
    mode: 'aspectFill',
    emoji: '🌷',
    showHint: false,
    hintText: '暂无图片',
    rootClass: '',
  },
)

const loaded = ref(false)
const failed = ref(false)
const displaySrc = ref('')
const triedProxy = ref(false)
let resolveToken = 0

const imageRenderKey = computed(
  () => `${props.cloudFileId || ''}|${props.src || ''}`,
)

const isLoading = computed(
  () => !!props.src?.trim() && !loaded.value && !failed.value && !displaySrc.value,
)

const showPlaceholder = computed(
  () => !props.src?.trim() || failed.value || !loaded.value || !displaySrc.value,
)

function pickCloudFileId() {
  if (props.cloudFileId && isCloudFileId(props.cloudFileId)) return props.cloudFileId
  const trimmed = (props.src || '').trim()
  if (isCloudFileId(trimmed)) return trimmed
  return ''
}

async function tryPublicImageProxy() {
  const fileId = pickCloudFileId()
  if (!fileId || triedProxy.value) return ''
  triedProxy.value = true
  return fetchPublicImageLocalPath(fileId)
}

async function resolveDisplaySrc(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) {
    displaySrc.value = ''
    loaded.value = false
    failed.value = false
    return
  }

  if (loaded.value && displaySrc.value === trimmed) return

  const token = ++resolveToken
  loaded.value = false
  failed.value = false
  displaySrc.value = ''
  triedProxy.value = false

  const localPath = await resolveImageDisplayPath(trimmed)
  if (token !== resolveToken) return

  if (localPath) {
    displaySrc.value = localPath
    return
  }

  const proxyPath = await tryPublicImageProxy()
  if (token !== resolveToken) return
  if (proxyPath) {
    displaySrc.value = proxyPath
    return
  }

  if (/^https?:\/\//.test(trimmed)) {
    displaySrc.value = trimmed
  }
}

watch(
  () => [props.src, props.cloudFileId] as const,
  ([next]) => {
    void resolveDisplaySrc(next || '')
  },
  { immediate: true },
)

function onLoad() {
  loaded.value = true
}

async function onError() {
  const proxyPath = await tryPublicImageProxy()
  if (proxyPath) {
    failed.value = false
    loaded.value = false
    displaySrc.value = proxyPath
    return
  }
  failed.value = true
  console.warn('[GoodsImage] image render failed, src=', (props.src || '').slice(0, 120))
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
