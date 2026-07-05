import { computed, nextTick, ref, watch, type MaybeRefOrGetter, toValue } from 'vue'
import Taro, { useDidShow, useReady } from '@tarojs/taro'
import { getNavBarLayout } from '@/utils/navBarLayout'
import {
  SCROLL_TAIL_SPACER_HEIGHT,
  shouldShowScrollTailSpacer,
} from '@/utils/scrollListTailSpacer'

export interface ScrollListTailSpacerProps {
  contentSelector: string
  scrollContainerSelector?: string
  watchKey?: MaybeRefOrGetter<string | number | boolean | undefined>
  height?: string
  /** 额外提前量 px */
  preemptPx?: number
  bottomInsetPx?: number
  tabBar?: boolean
}

/**
 * 列表末尾留白：内容即将占满可滚区域时显示，
 * 避免短页多余滚动，长列表时防止末项被 TabBar / 固定底栏遮挡。
 */
export function useScrollListTailSpacer(props: ScrollListTailSpacerProps) {
  const visible = ref(false)
  const height = props.height ?? SCROLL_TAIL_SPACER_HEIGHT
  const spacerStyle = computed(() => ({
    height,
    width: '100%',
    flexShrink: '0',
    pointerEvents: 'none' as const,
  }))

  function evaluate(contentHeight: number, viewportHeight: number) {
    visible.value = shouldShowScrollTailSpacer({
      contentHeight,
      viewportHeight,
      tabBar: props.tabBar,
      bottomInsetPx: props.bottomInsetPx,
      preemptPx: props.preemptPx ?? 0,
    })
  }

  function measure() {
    const q = Taro.createSelectorQuery()

    if (props.scrollContainerSelector) {
      q.select(props.scrollContainerSelector).boundingClientRect()
      q.select(props.contentSelector).boundingClientRect()
      q.exec((res) => {
        const viewport = res?.[0] as { height?: number } | null
        const content = res?.[1] as { height?: number } | null
        if (!viewport?.height || !content?.height) {
          visible.value = false
          return
        }
        evaluate(content.height, viewport.height)
      })
      return
    }

    q.select(props.contentSelector).boundingClientRect()
    q.exec((res) => {
      const content = res?.[0] as { height?: number } | null
      if (!content?.height) {
        visible.value = false
        return
      }
      const { windowHeight } = Taro.getWindowInfo()
      const nav = getNavBarLayout().totalHeight
      const viewport = Math.max(0, windowHeight - nav)
      evaluate(content.height, viewport)
    })
  }

  function scheduleMeasure() {
    void nextTick(() => {
      measure()
      setTimeout(measure, 64)
      setTimeout(measure, 280)
      setTimeout(measure, 520)
    })
  }

  useReady(scheduleMeasure)
  useDidShow(scheduleMeasure)

  if (props.watchKey !== undefined) {
    watch(() => toValue(props.watchKey), scheduleMeasure)
  }

  watch(visible, (show) => {
    if (show) {
      void nextTick(() => setTimeout(measure, 80))
    }
  })

  return { visible, spacerStyle, remeasure: scheduleMeasure }
}
