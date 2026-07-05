import Taro from '@tarojs/taro'
import { rpxToPx } from '@/composables/usePageSticky'

/** 列表末尾留白默认高度 */
export const SCROLL_TAIL_SPACER_HEIGHT = '20vh'

/** 常见固定底栏占用（px），供整页滚动阈值计算 */
export function scrollTailActionBarInsetPx(large = false): number {
  return rpxToPx(large ? 160 : 120)
}

/** TabBar 占用（含底部安全区） */
export function scrollTailTabBarInsetPx(): number {
  const info = Taro.getWindowInfo()
  const safeBottom = Math.max(0, info.screenHeight - (info.safeArea?.bottom ?? info.screenHeight))
  return rpxToPx(100) + safeBottom
}

/** 将 spacer 高度字符串转为 px（支持 vh / rpx / px） */
export function scrollTailSpacerHeightPx(height = SCROLL_TAIL_SPACER_HEIGHT): number {
  const trimmed = height.trim()
  if (trimmed.endsWith('vh')) {
    const vh = Number.parseFloat(trimmed)
    return (Taro.getWindowInfo().windowHeight * vh) / 100
  }
  if (trimmed.endsWith('rpx')) {
    return rpxToPx(Number.parseFloat(trimmed))
  }
  if (trimmed.endsWith('px')) {
    return Number.parseFloat(trimmed)
  }
  return (Taro.getWindowInfo().windowHeight * 20) / 100
}

export interface ScrollTailVisibilityInput {
  contentHeight: number
  viewportHeight: number
  tabBar?: boolean
  bottomInsetPx?: number
  /** 额外提前量 px */
  preemptPx?: number
}

/**
 * 是否应显示末尾留白。
 * 在内容即将占满可滚区域时显示（>=），而非等内容严格超出容器（>）才显示。
 */
export function shouldShowScrollTailSpacer(input: ScrollTailVisibilityInput): boolean {
  const {
    contentHeight,
    viewportHeight,
    tabBar = false,
    bottomInsetPx = 0,
    preemptPx = 0,
  } = input
  if (!contentHeight || !viewportHeight) return false

  const bottomOverlay = bottomInsetPx + (tabBar ? scrollTailTabBarInsetPx() : 0)
  const effectiveViewport = Math.max(0, viewportHeight - bottomOverlay)
  const triggerLine = Math.max(0, effectiveViewport - preemptPx)
  return contentHeight >= triggerLine
}
