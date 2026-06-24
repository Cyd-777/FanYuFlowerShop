import { computed } from 'vue'
import Taro from '@tarojs/taro'
import { useNavBarLayout } from '@/composables/useNavBarLayout'

/** 搜索触发条高度（rpx） */
export const SEARCH_TRIGGER_RPX = 72

/** AppSearchInput 吸顶块高度：上下 padding 12rpx + 触发条 72rpx */
export const SEARCH_STICKY_BLOCK_RPX = 96

export function rpxToPx(rpx: number) {
  const { windowWidth } = Taro.getWindowInfo()
  return Math.floor((rpx * windowWidth) / 750)
}

/**
 * 带 AppNavBar 子页的吸顶 top（搜索条 / 次级 Tab）。
 * Tab 浮层页请用 useOverlayStickySearch。
 */
export function usePageSticky() {
  const { layout, statusBarHeightPx, totalHeightPx } = useNavBarLayout()

  const overlayStickyTop = statusBarHeightPx
  const navStickyTop = totalHeightPx

  const searchStickyBlockPx = computed(() => rpxToPx(SEARCH_STICKY_BLOCK_RPX))

  const belowNavSearchStickyTop = computed(
    () => `calc(${layout.value.totalHeight}px + ${searchStickyBlockPx.value}px)`,
  )

  const navSearchStickyStyle = computed(() => ({
    top: `${layout.value.totalHeight}px`,
  }))

  return {
    overlayStickyTop,
    navStickyTop,
    belowNavSearchStickyTop,
    navSearchStickyStyle,
    searchStickyBlockPx,
  }
}
