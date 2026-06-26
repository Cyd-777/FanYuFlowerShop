<template>
  <view class="goods-image" :class="rootClass">
    <view v-if="showPlaceholder" class="goods-image-ph">
      <view v-if="!failed" class="goods-image-shimmer" />
      <text class="goods-image-emoji">{{ emoji }}</text>
      <text v-if="showHint && failed" class="goods-image-hint">{{ hintText }}</text>
    </view>
    <image
      v-if="currentSrc && !failed"
      class="goods-image-img"
      :class="{ loaded }"
      :src="currentSrc"
      :mode="mode"
      @load="onLoad"
      @error="onError"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { isCloudFileId, resolveCloudImageUrl } from '@/utils/goodsImage'

const props = withDefaults(
  defineProps<{
    src?: string
    /** 当前 URL 失效时可凭 fileId 重新换链 */
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

/** 全局内存缓存：已成功加载的 URL 不再走加载动画 */
const loadedUrls = new Set<string>()

const loaded = ref(false)
const failed = ref(false)
const displaySrc = ref('')
let retryTimer: ReturnType<typeof setTimeout> | null = null
let upgradeTimer: ReturnType<typeof setTimeout> | null = null
const currentSrc = computed(() => displaySrc.value || props.src)

const showPlaceholder = computed(() => {
  if (failed.value) return true
  if (!currentSrc.value?.trim()) {
    // 有 cloudFileId 时 soon 会有图，不闪 placeholder
    if (props.cloudFileId) return false
    return true
  }
  if (loadedUrls.has(currentSrc.value)) return false
  if (loaded.value) return false
  return !displaySrc.value
})

function initFromProps(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed && !props.cloudFileId) {
    displaySrc.value = ''
    failed.value = false
    return
  }

  // HTTPS 直出，同时后台升级
  if (/^https?:\/\//.test(trimmed)) {
    loaded.value = loadedUrls.has(trimmed)
    if (props.cloudFileId) {
      const fileId = props.cloudFileId
      void resolveCloudImageUrl(fileId).then((fullUrl) => {
        if (!fullUrl || fullUrl === trimmed) return
        scheduleUpgrade(fullUrl)
      })
    }
    return
  }

  // cloud:// 需要异步换链
  if (trimmed && isCloudFileId(trimmed)) {
    const token = Date.now()
    void resolveCloudImageUrl(trimmed).then((url) => {
      if (url) displaySrc.value = url
    })
  }
}

function scheduleUpgrade(fullUrl: string) {
  if (upgradeTimer) return
  const apply = () => {
    upgradeTimer = null
    if (fullUrl !== currentSrc.value) displaySrc.value = fullUrl
  }
  if (loaded.value) {
    upgradeTimer = setTimeout(apply, 500)
  } else {
    const stop = watch(
      () => loaded.value,
      (v) => {
        if (!v) return
        stop()
        upgradeTimer = setTimeout(apply, 500)
      },
    )
  }
}

async function retryOnError() {
  if (retryTimer || !props.cloudFileId) return
  retryTimer = setTimeout(() => {
    retryTimer = null
    void resolveCloudImageUrl(props.cloudFileId!).then((url) => {
      if (url) {
        displaySrc.value = url
        failed.value = false
      }
    })
  }, 1000)
}

function onLoad() {
  loaded.value = true
  if (currentSrc.value) loadedUrls.add(currentSrc.value)
}

function onError() {
  if (props.cloudFileId) {
    void retryOnError()
  } else {
    failed.value = true
  }
}

watch(() => props.src, initFromProps, { immediate: true })

onUnmounted(() => {
  if (retryTimer) clearTimeout(retryTimer)
  if (upgradeTimer) clearTimeout(upgradeTimer)
})
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
  z-index: 0;
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
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
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
  // 不设 opacity 过渡——已缓存的图立即显示，不放 0→1 动画
}
</style>
