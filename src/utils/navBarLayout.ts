import Taro from '@tarojs/taro'

/**
 * 自定义 Head 布局（微信小程序）
 *
 * 采集：状态栏高度、胶囊距顶、胶囊宽高（`getMenuButtonBoundingClientRect`）
 *
 * 总高 = statusBarHeight + (capsuleTop − statusBarHeight) × 2 + capsuleHeight
 * 导航内容区高 = (capsuleTop − statusBarHeight) × 2 + capsuleHeight
 */
export interface NavBarLayout {
  /** 状态栏高度 */
  statusBarHeight: number
  /** 胶囊距屏幕顶部的距离 */
  capsuleTop: number
  /** 胶囊距屏幕左缘 */
  capsuleLeft: number
  /** 胶囊宽度 */
  capsuleWidth: number
  /** 胶囊高度 */
  capsuleHeight: number
  /** 胶囊顶边 − 状态栏底边（=(capsuleTop − statusBarHeight)） */
  capsuleTopGap: number
  /** 导航内容区高度 */
  navContentHeight: number
  /** Head 总高度（占位 / sticky 用） */
  totalHeight: number
  /** 胶囊距屏幕右缘 */
  capsuleRight: number
  /** 标题区右侧留白，避免与胶囊重叠（= windowWidth − capsuleLeft） */
  titleAreaPaddingRight: number
  windowWidth: number
  /** @deprecated 使用 capsuleWidth */
  menuButtonWidth: number
  /** @deprecated 使用 capsuleTop */
  menuButtonTop: number
  /** @deprecated 使用 capsuleRight */
  menuButtonRight: number
  /** @deprecated 使用 navContentHeight */
  navBarHeight: number
}

export interface SearchBarCapsuleLayout {
  /** 胶囊宽度（px，`getMenuButtonBoundingClientRect`） */
  capsuleWidthPx: number
  /** 胶囊左缘距屏幕左缘（px） */
  capsuleLeftPx: number
  /** 胶囊右缘距屏幕右缘（px） */
  capsuleRightPx: number
  /** 页内搜索触发条 max-width（px）：左 pagePad 到胶囊左缘前 gap */
  triggerMaxWidthPx: number
}

function rpxToPx(rpx: number, windowWidth: number) {
  return Math.floor((rpx * windowWidth) / 750)
}

/**
 * 按胶囊位置计算页内搜索条宽度（Tab 浮层页吸顶时用）。
 * 左缘取 pageHorizontalPadRpx，右缘止于 capsuleLeft − gapBeforeCapsulePx。
 */
export function getSearchBarCapsuleLayout(options?: {
  pageHorizontalPadRpx?: number
  gapBeforeCapsulePx?: number
  force?: boolean
}): SearchBarCapsuleLayout {
  const layout = getNavBarLayout(options?.force)
  const pageHorizontalPadRpx = options?.pageHorizontalPadRpx ?? 24
  const gapBeforeCapsulePx = options?.gapBeforeCapsulePx ?? 8
  const padPx = rpxToPx(pageHorizontalPadRpx, layout.windowWidth)
  const triggerMaxWidthPx = Math.max(
    0,
    Math.floor(layout.capsuleLeft - padPx - gapBeforeCapsulePx),
  )

  return {
    capsuleWidthPx: layout.capsuleWidth,
    capsuleLeftPx: layout.capsuleLeft,
    capsuleRightPx: layout.capsuleRight,
    triggerMaxWidthPx,
  }
}

/** @alias HeadLayout */
export type HeadLayout = NavBarLayout

let cachedLayout: NavBarLayout | null = null

function isValidCapsule(capsule: ReturnType<typeof Taro.getMenuButtonBoundingClientRect>) {
  return capsule.height > 0 && capsule.width > 0 && capsule.top > 0
}

function buildLayout(
  windowInfo: ReturnType<typeof Taro.getWindowInfo>,
  capsule: ReturnType<typeof Taro.getMenuButtonBoundingClientRect>,
): NavBarLayout {
  const statusBarHeight = windowInfo.statusBarHeight ?? 20
  const windowWidth = windowInfo.windowWidth ?? 375
  const capsuleTop = capsule.top
  const capsuleLeft = capsule.left
  const capsuleWidth = capsule.width
  const capsuleHeight = capsule.height
  const capsuleTopGap = Math.max(0, capsuleTop - statusBarHeight)
  const navContentHeight = capsuleTopGap * 2 + capsuleHeight
  const totalHeight = statusBarHeight + navContentHeight
  const capsuleRight = windowWidth - capsule.right
  const titleAreaPaddingRight = windowWidth - capsuleLeft

  return {
    statusBarHeight,
    capsuleTop,
    capsuleLeft,
    capsuleWidth,
    capsuleHeight,
    capsuleTopGap,
    navContentHeight,
    totalHeight,
    capsuleRight,
    titleAreaPaddingRight,
    windowWidth,
    menuButtonWidth: capsuleWidth,
    menuButtonTop: capsuleTop,
    menuButtonRight: capsuleRight,
    navBarHeight: navContentHeight,
  }
}

/** 胶囊尚未量到时的保守默认值（避免内容区高度为 0） */
function buildFallbackLayout(windowInfo: ReturnType<typeof Taro.getWindowInfo>): NavBarLayout {
  const statusBarHeight = windowInfo.statusBarHeight ?? 20
  const windowWidth = windowInfo.windowWidth ?? 375
  const capsuleHeight = 32
  const capsuleWidth = 87
  const capsuleTopGap = 4
  const capsuleTop = statusBarHeight + capsuleTopGap
  const capsuleLeft = windowWidth - capsuleWidth - 10
  const navContentHeight = capsuleTopGap * 2 + capsuleHeight
  const totalHeight = statusBarHeight + navContentHeight
  const capsuleRight = 10
  const titleAreaPaddingRight = windowWidth - capsuleLeft

  return {
    statusBarHeight,
    capsuleTop,
    capsuleLeft,
    capsuleWidth,
    capsuleHeight,
    capsuleTopGap,
    navContentHeight,
    totalHeight,
    capsuleRight,
    titleAreaPaddingRight,
    windowWidth,
    menuButtonWidth: capsuleWidth,
    menuButtonTop: capsuleTop,
    menuButtonRight: capsuleRight,
    navBarHeight: navContentHeight,
  }
}

export function getNavBarLayout(force = false): NavBarLayout {
  const windowInfo = Taro.getWindowInfo()
  const capsule = Taro.getMenuButtonBoundingClientRect()

  if (!force && cachedLayout && !isValidCapsule(capsule)) {
    return cachedLayout
  }

  if (!isValidCapsule(capsule)) {
    return buildFallbackLayout(windowInfo)
  }

  const layout = buildLayout(windowInfo, capsule)
  cachedLayout = layout
  return layout
}

/** @alias getHeadLayout */
export const getHeadLayout = getNavBarLayout

export function navBarCssVars(layout = getNavBarLayout()) {
  return {
    '--nav-status-bar-height': `${layout.statusBarHeight}px`,
    '--nav-capsule-top': `${layout.capsuleTop}px`,
    '--nav-capsule-left': `${layout.capsuleLeft}px`,
    '--nav-capsule-width': `${layout.capsuleWidth}px`,
    '--nav-capsule-height': `${layout.capsuleHeight}px`,
    '--nav-capsule-top-gap': `${layout.capsuleTopGap}px`,
    '--nav-bar-height': `${layout.navContentHeight}px`,
    '--nav-total-height': `${layout.totalHeight}px`,
    '--nav-title-area-padding-right': `${layout.titleAreaPaddingRight}px`,
  }
}

/** @alias headCssVars */
export const headCssVars = navBarCssVars
