<template>
  <view class="app-nav-bar-root">
    <view
      class="app-nav-bar"
      :class="[
        `app-nav-bar--${mode}`,
        `app-nav-bar--bg-${resolvedBackground}`,
        { 'app-nav-bar--search-modal-open': searchModalHostOpen },
      ]"
      :style="barStyle"
    >
      <view class="app-nav-bar__status" :style="{ height: `${layout.statusBarHeight}px` }" />
      <view class="app-nav-bar__content" :style="contentStyle">
        <AppNavBackButton
          v-if="showBack"
          :width-px="backWidthPx"
          :height-px="layout.capsuleHeight"
          @tap="onBack"
        />
        <view
          v-if="title"
          class="app-nav-bar__title-wrap"
          :class="`app-nav-bar__title-wrap--${titleAlign}`"
          :style="titleWrapStyle"
        >
          <text class="app-nav-bar__title">{{ title }}</text>
        </view>
      </view>
    </view>

    <view
      v-if="mode === 'spacer'"
      class="app-nav-bar__placeholder"
      :style="{ height: `${placeholderHeightPx}px` }"
    />

    <AppFeedbackHost />
  </view>
</template>

<script setup lang="ts">
import AppFeedbackHost from '@/components/AppFeedbackHost.vue'
import { computed, onMounted, ref } from 'vue'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import {
  getCurrentPageRoute,
  isTabBarRoute,
  resolvePageNav,
  type NavBarBackground,
  type NavBarMode,
  type NavBarTitleAlign,
} from '@/config/pageNav'
import { getNavBarLayout, type NavBarLayout } from '@/utils/navBarLayout'
import AppNavBackButton from '@/components/AppNavBackButton.vue'
import { layoutDebugConfig } from '@/config/layoutDebug'
import { searchModalHostOpen } from '@/utils/searchModalHost'

/** 左对齐标题与返回图标之间的固定间距（px） */
const TITLE_LEFT_GAP_PX = 8

const props = withDefaults(
  defineProps<{
    title?: string
    hideBack?: boolean
    mode?: NavBarMode
    background?: NavBarBackground
    titleAlign?: NavBarTitleAlign
    /** false 时隐藏 fixed 导航条（占位仅保留状态栏高度，收回导航内容区体积） */
    barVisible?: boolean
  }>(),
  {
    hideBack: false,
    barVisible: true,
  },
)

const layout = ref<NavBarLayout>(getNavBarLayout())
const route = ref('')
const taroRouter = useRouter()

function readRoute(): string {
  const fromStack = getCurrentPageRoute()
  if (fromStack) return fromStack
  const path = taroRouter.path || ''
  return path.startsWith('/') ? path.slice(1) : path
}

function refreshNavContext() {
  layout.value = getNavBarLayout(true)
  route.value = readRoute()
}

onMounted(() => {
  refreshNavContext()
})

useDidShow(() => {
  refreshNavContext()
})

const routeNav = computed(() => resolvePageNav(route.value))

const mode = computed(() => props.mode ?? routeNav.value.mode)
const showBack = computed(() => {
  if (props.hideBack) return false
  if (isTabBarRoute(route.value)) return false
  if (routeNav.value.showBack === false) return false
  return mode.value === 'spacer'
})
const title = computed(() => props.title ?? routeNav.value.title ?? '')
const titleAlign = computed(
  () => props.titleAlign ?? routeNav.value.titleAlign ?? 'center',
)
const resolvedBackground = computed(
  () => props.background ?? routeNav.value.background ?? 'white',
)

const barStyle = computed(() => {
  if (mode.value === 'flow') return {}
  if (props.barVisible) {
    return {
      opacity: '1',
      pointerEvents: 'auto' as const,
      transform: 'translate3d(0, 0, 0)',
    }
  }
  return {
    opacity: '0',
    pointerEvents: 'none' as const,
    transform: 'translate3d(0, -100%, 0)',
  }
})

/** 隐藏 fixed 条时只保留状态栏占位，收回自定义导航内容区体积 */
const placeholderHeightPx = computed(() =>
  props.barVisible ? layout.value.totalHeight : layout.value.statusBarHeight,
)

const backWidthPx = computed(() =>
  Math.max(layout.value.capsuleHeight + 16, 44),
)

const contentStyle = computed(() => ({
  height: `${layout.value.navContentHeight}px`,
  paddingTop: `${layout.value.capsuleTopGap}px`,
  ...(titleAlign.value === 'left'
    ? { paddingRight: `${layout.value.titleAreaPaddingRight}px` }
    : {}),
}))

const titleWrapStyle = computed(() => {
  const debugBg = layoutDebugConfig.showLayoutDebugBg
    ? layoutDebugConfig.navTitleBg
    : 'transparent'

  if (titleAlign.value === 'center') {
    const symmetricInset = Math.max(
      showBack.value ? backWidthPx.value : 0,
      layout.value.titleAreaPaddingRight,
    )
    return {
      top: `${layout.value.capsuleTopGap}px`,
      height: `${layout.value.capsuleHeight}px`,
      paddingLeft: `${symmetricInset}px`,
      paddingRight: `${symmetricInset}px`,
      background: debugBg,
    }
  }

  return {
    height: `${layout.value.capsuleHeight}px`,
    marginLeft: showBack.value ? `${TITLE_LEFT_GAP_PX}px` : '0',
    paddingLeft: showBack.value ? '0' : '16px',
    background: debugBg,
  }
})

function onBack() {
  const pages = Taro.getCurrentPages()
  if (pages.length > 1) {
    Taro.navigateBack()
    return
  }
  Taro.switchTab({ url: '/pages/home/index' })
}
</script>

<style lang="less">
@import '@/styles/tokens.less';

.app-nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  box-sizing: border-box;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
  will-change: opacity, transform;

  &--search-modal-open {
    z-index: 50;
  }

  &--bg-transparent {
    background: transparent;
  }

  &--bg-blur {
    background: rgba(255, 255, 255, 0.72);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }

  &--bg-white {
    background: #fff;
  }

  &--overlay {
    box-shadow: none;
  }

  &--flow {
    position: relative;
    z-index: 1;
    pointer-events: auto;
    transition: none;
    will-change: auto;
  }

  &--spacer.app-nav-bar--bg-white,
  &--spacer.app-nav-bar--bg-blur {
    border-bottom: 1rpx solid rgba(0, 0, 0, 0.06);
  }
}

.app-nav-bar__status {
  width: 100%;
}

.app-nav-bar__content {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  box-sizing: border-box;
  width: 100%;
  pointer-events: auto;
}

.app-nav-bar__back {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  pointer-events: auto;
}

.app-nav-bar__back--active {
  opacity: 0.55;
}

.app-nav-bar__title-wrap {
  box-sizing: border-box;
  overflow: hidden;
  pointer-events: none;

  &--center {
    position: absolute;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &--left {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }
}

.app-nav-bar__title {
  max-width: 100%;
  font-size: 24rpx;
  font-weight: 600;
  color: @color-text-primary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-nav-bar__title-wrap--center .app-nav-bar__title {
  text-align: center;
}

.app-nav-bar__title-wrap--left .app-nav-bar__title {
  text-align: left;
}

.app-nav-bar__placeholder {
  flex-shrink: 0;
  width: 100%;
}
</style>
