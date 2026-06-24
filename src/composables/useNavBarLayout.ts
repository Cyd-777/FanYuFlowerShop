import { computed } from 'vue'
import { getNavBarLayout, navBarCssVars } from '@/utils/navBarLayout'

/**
 * 页面内获取 Head 高度与 CSS 变量。
 *
 * cssVars 注入页面根节点后可使用：
 * - var(--nav-status-bar-height)  状态栏高度
 * - var(--nav-capsule-top)          胶囊距顶
 * - var(--nav-capsule-width)        胶囊宽度
 * - var(--nav-capsule-height)       胶囊高度
 * - var(--nav-capsule-top-gap)      胶囊上间距（capsuleTop − statusBarHeight）
 * - var(--nav-bar-height)           导航内容区
 * - var(--nav-total-height)         Head 总高
 */
export function useNavBarLayout() {
  const layout = computed(() => getNavBarLayout())
  const cssVars = computed(() => navBarCssVars(layout.value))
  const totalHeightPx = computed(() => `${layout.value.totalHeight}px`)
  const statusBarHeightPx = computed(() => `${layout.value.statusBarHeight}px`)
  const navBarHeightPx = computed(() => `${layout.value.navContentHeight}px`)

  return {
    layout,
    cssVars,
    totalHeightPx,
    statusBarHeightPx,
    navBarHeightPx,
  }
}

/** @alias useNavBarLayout */
export const useHeadLayout = useNavBarLayout
