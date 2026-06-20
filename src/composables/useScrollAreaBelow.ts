import { nextTick, ref } from 'vue'
import Taro, { useDidShow, useReady } from '@tarojs/taro'

/** 搜索栏区域的 rpx 估算（padding + input），用于首帧与测量失败时的兜底 */
const SEARCH_BAR_RPX = 104

function rpxToPx(rpx: number) {
  const { windowWidth } = Taro.getWindowInfo()
  return Math.floor((rpx * windowWidth) / 750)
}

function fallbackLayout() {
  const { windowHeight } = Taro.getWindowInfo()
  const top = rpxToPx(SEARCH_BAR_RPX)
  return {
    topPx: top,
    heightPx: Math.max(0, windowHeight - top),
  }
}

/**
 * 计算锚点元素下方剩余可视区域（px）。
 * 返回 topPx（锚点 bottom）与 heightPx，供 fixed 布局 + scroll-view 显式高度。
 */
export function useScrollAreaBelow(anchorSelector: string) {
  const layout = fallbackLayout()
  const topPx = ref(layout.topPx)
  const heightPx = ref(layout.heightPx)

  function measure() {
    const { windowHeight } = Taro.getWindowInfo()

    // 页面级节点：不要 .in(component)，否则 Taro 页面内选择器常失效
    Taro.createSelectorQuery()
      .select(anchorSelector)
      .boundingClientRect()
      .exec((res) => {
        const rect = res?.[0] as { bottom?: number } | undefined
        const bottom = rect?.bottom ?? 0
        if (bottom > 0 && bottom < windowHeight) {
          topPx.value = Math.floor(bottom)
          heightPx.value = Math.max(0, Math.floor(windowHeight - bottom))
        }
      })
  }

  function scheduleMeasure() {
    void nextTick(() => {
      measure()
      setTimeout(measure, 80)
    })
  }

  useReady(scheduleMeasure)
  useDidShow(scheduleMeasure)

  return { topPx, heightPx, remeasure: measure }
}
