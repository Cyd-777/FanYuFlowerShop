<template>
  <view class="goods-image" :class="rootClass">
    <image
      v-if="currentSrc && !failed"
      class="goods-image-img"
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
    /** 标准图 URL（原图或750px）。无 preview-src 时此值直接显示 */
    src?: string
    /** 缩略图 URL（160px）。有此值时优先显示缩略图，后台升级到 src */
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

/** 全局内存：已加载 URL 不再走加载动画 */
const loadedUrls = new Set<string>()

/** 当前实际显示在 <image> 上的 URL */
const displaySrc = ref('')
const loaded = ref(false)
const failed = ref(false)
const upgrading = ref(false)

const currentSrc = computed(() => displaySrc.value || props.previewSrc || props.src)

let upgradeTimer: ReturnType<typeof setTimeout> | null = null
let retryTimer: ReturnType<typeof setTimeout> | null = null

/** 从初始化值或变化开始加载链路 */
function startLoad() {
  const preview = props.previewSrc?.trim()
  const standard = props.src?.trim()

  // 有缩略图：先显示缩略图（秒出），后台升级到标准图
  if (preview) {
    displaySrc.value = preview
    loaded.value = loadedUrls.has(preview)
    upgrading.value = true
    scheduleUpgradeTo(standard)
    return
  }

  // 无缩略图，直接显示标准图
  if (standard) {
    displaySrc.value = standard
    loaded.value = loadedUrls.has(standard)
    return
  }

  // 空
  displaySrc.value = ''
  loaded.value = false
}

/** 等当前缩略图稳定后升级到标准图 */
function scheduleUpgradeTo(standardUrl: string) {
  if (!standardUrl || upgradeTimer) return
  if (standardUrl === displaySrc.value) return

  const apply = () => {
    upgradeTimer = null
    upgrading.value = false
    displaySrc.value = standardUrl
  }

  if (loaded.value) {
    upgradeTimer = setTimeout(apply, 400)
  } else {
    const stop = watch(
      () => loaded.value,
      (v) => {
        if (!v) return
        stop()
        upgradeTimer = setTimeout(apply, 400)
      },
    )
  }
}

function onLoad() {
  loaded.value = true
  if (currentSrc.value) loadedUrls.add(currentSrc.value)
}

function onError() {
  // 缩略图失败：直接跳到标准图
  if (props.previewSrc && displaySrc.value === props.previewSrc) {
    const standard = props.src?.trim()
    if (standard && standard !== displaySrc.value) {
      displaySrc.value = standard
      return
    }
  }

  // 标准图也失败：重试
  if (props.cloudFileId) {
    if (retryTimer) return
    retryTimer = setTimeout(() => {
      retryTimer = null
      void resolveCloudImageUrl(props.cloudFileId!).then((url) => {
        if (url) {
          displaySrc.value = url
          failed.value = false
        }
      })
    }, 1000)
  } else {
    failed.value = true
  }
}

watch(
  () => [props.src, props.previewSrc] as const,
  () => {
    failed.value = false
    startLoad()
  },
  { immediate: true },
)

onUnmounted(() => {
  if (upgradeTimer) clearTimeout(upgradeTimer)
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

.goods-image-img {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
