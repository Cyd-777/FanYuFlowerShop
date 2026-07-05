<template>
  <view class="goods-image" :class="rootClass">
    <!-- 预览层：缩略图，始终可见 -->
    <image
      v-if="previewUrl && !previewFailed && !finalFailed"
      class="goods-image-img goods-image-img--preview"
      :class="{ loaded: previewLoaded }"
      :src="previewUrl"
      :mode="mode"
      @load="onPreviewLoad"
      @error="onPreviewError"
    />

    <!-- 标准层：加载完成后淡入覆盖预览层 -->
    <image
      v-if="standardUrl && !finalFailed"
      class="goods-image-img goods-image-img--standard"
      :class="{ loaded: standardLoaded }"
      :src="standardUrl"
      :mode="mode"
      @load="onStandardLoad"
      @error="onStandardError"
    />

    <!-- 无任何可用 URL 时的占位 -->
    <view v-if="!previewUrl && !standardUrl && !finalFailed" class="goods-image-ph">
      <text class="goods-image-emoji">{{ emoji }}</text>
    </view>

    <!-- 完全失败的备用 -->
    <view v-if="finalFailed" class="goods-image-ph">
      <text class="goods-image-emoji">{{ emoji }}</text>
      <text v-if="showHint" class="goods-image-hint">{{ hintText }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { getAppResumeCount, isCloudFileId, readCachedImageUrl, resolveCloudImageUrl } from '@/utils/goodsImage'

const props = withDefaults(
  defineProps<{
    /** 标准图 URL（750px） */
    src?: string
    /** 缩略图 URL（160px，秒出） */
    previewSrc?: string
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
    previewSrc: '',
    cloudFileId: '',
    mode: 'aspectFill',
    emoji: '🌷',
    showHint: false,
    hintText: '暂无图片',
    rootClass: '',
  },
)

/** 预览层状态 */
const previewUrl = ref('')
const previewLoaded = ref(false)
const previewFailed = ref(false)

/** 标准层状态 */
const standardUrl = ref('')
const standardLoaded = ref(false)

/** 最终失败（两层都失败后） */
const finalFailed = ref(false)

let retryTimer: ReturnType<typeof setTimeout> | null = null

/** 初始化加载链路 */
function init() {
  const p = props.previewSrc?.trim()
  const s = props.src?.trim()

  finalFailed.value = false
  previewFailed.value = false

  // 预览层
  if (p) {
    previewUrl.value = p
    previewLoaded.value = true  // 缩略图大概率已缓存，直接显示
  }

  // 标准层 —— 始终尝试加载
  if (s) {
    standardUrl.value = s
    standardLoaded.value = false
    return
  }

  // 无标准图但有 cloudFileId：异步换链后作为标准图
  if (props.cloudFileId) {
    const cached = readCachedImageUrl(props.cloudFileId)
    if (cached) {
      standardUrl.value = cached
    }
    // 后台重新解析，如果链接已过期则更新
    void resolveCloudImageUrl(props.cloudFileId).then((url) => {
      if (url && url !== standardUrl.value) {
        standardUrl.value = url
        if (!s) previewLoaded.value = true
      }
    })
  }
}

function onPreviewLoad() {
  previewLoaded.value = true
}

function onPreviewError() {
  previewFailed.value = true
  // 如果标准图还没来，尝试加载
  if (!standardUrl.value && props.cloudFileId) {
    void resolveCloudImageUrl(props.cloudFileId).then((url) => {
      if (url) standardUrl.value = url
    })
  }
}

function onStandardLoad() {
  standardLoaded.value = true
}

function onStandardError() {
  // 有 cloudFileId 则重试换链
  if (props.cloudFileId && !retryTimer) {
    retryTimer = setTimeout(() => {
      retryTimer = null
      void resolveCloudImageUrl(props.cloudFileId!).then((url) => {
        if (url) {
          standardUrl.value = url
        }
      })
    }, 1000)
    return
  }
  // 没有 cloudFileId 且预览层也挂了 → 最终失败
  if (previewFailed.value) {
    finalFailed.value = true
  }
}

watch(
  () => [props.src, props.previewSrc] as const,
  () => {
    standardLoaded.value = false
    init()
  },
  { immediate: true },
)

/** 后台切前台时检查缓存链接是否过期，过期则重新换链 */
watch(
  () => getAppResumeCount(),
  () => {
    if (!props.cloudFileId) return
    const cached = readCachedImageUrl(props.cloudFileId)
    if (!cached) {
      // 缓存已过期（或不存在），重新解析
      void resolveCloudImageUrl(props.cloudFileId).then((url) => {
        if (url && url !== standardUrl.value) {
          standardLoaded.value = false
          standardUrl.value = url
        }
      })
    }
  },
)

onUnmounted(() => {
  if (retryTimer) clearTimeout(retryTimer)
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

.goods-image-emoji {
  font-size: 48rpx;
  line-height: 1;
  opacity: 0.55;
}

.goods-image-hint {
  margin-top: 8rpx;
  font-size: 20rpx;
  color: @color-text-placeholder;
}

.goods-image-img {
  display: block;
  width: 100%;
  height: 100%;
}

.goods-image-img--preview {
  position: absolute;
  inset: 0;
  z-index: 1;
  opacity: 0;
  transition: opacity 0.3s ease;
  &.loaded {
    opacity: 1;
  }
}

.goods-image-img--standard {
  position: absolute;
  inset: 0;
  z-index: 2;
  opacity: 0;
  transition: opacity 0.4s ease;
  &.loaded {
    opacity: 1;
  }
}
</style>
