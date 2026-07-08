import { computed, nextTick, ref, watch, type WatchSource } from 'vue'
import Taro, { useDidShow, useReady } from '@tarojs/taro'
import { rpxToPx } from '@/composables/usePageSticky'

export interface ScrollXTrackMeasureOptions {
  /** 每一行的选择器（量最宽一行） */
  rowSelectors: string[]
  /** 二次测量：用子项选择器逐项累加宽度（更精确，避免 track 被固定宽度误导） */
  itemSelectors?: string[]
  /** 子项之间的 gap（px，仅在 itemSelectors 模式下用于累加） */
  itemGapPx?: number
  /** track 左右 padding 之和（rpx） */
  horizontalPaddingRpx?: number
}

/**
 * 微信小程序 scroll-x 生效条件：
 * 1. scroll-view 自身有明确的宽、高（建议用 windowWidth px + rpx 换算高度）
 * 2. 唯一内层 track 的 width（px）必须大于 scroll-view 宽度
 *
 * 勿依赖 max-content / inline-block 自动撑宽——基础库常把内层算成与视口同宽，导致永不出现横向滚动。
 */
export function useScrollXTrack(options: {
  heightRpx: number
  measure: ScrollXTrackMeasureOptions
  /** 首屏与测量失败时的兜底宽度（px，应 ≥ 视口宽 + 1） */
  estimateTrackWidthPx: () => number
  /** 内容变化时重新测量 */
  watchSources?: WatchSource[]
}) {
  const viewportWidthPx = ref(getWindowWidthPx())
  const trackWidthPx = ref(
    Math.max(Math.ceil(options.estimateTrackWidthPx()), getWindowWidthPx() + 1),
  )

  const scrollViewportStyle = computed(() => ({
    width: `${viewportWidthPx.value}px`,
    height: `${rpxToPx(options.heightRpx)}px`,
  }))

  const trackStyle = computed(() => {
    const width = trackWidthPx.value
    if (width <= 0) return undefined
    return { width: `${width}px` }
  })

  function getWindowWidthPx() {
    return Taro.getWindowInfo().windowWidth
  }

  function applyTrackWidth(measuredContentPx: number) {
    const viewport = getWindowWidthPx()
    viewportWidthPx.value = viewport
    const pad = rpxToPx(options.measure.horizontalPaddingRpx ?? 0)
    const measured = Math.ceil(measuredContentPx + pad)
    const estimated = Math.ceil(options.estimateTrackWidthPx())
    const min = Math.max(estimated, viewport + 1)
    trackWidthPx.value = Math.max(measured, min)
  }

  /** 将 track width 设为 0（取消固定宽度），让 DOM 自然撑开，再测量实际内容宽度 */
  function releaseTrackWidth() {
    trackWidthPx.value = 0
  }

  function measureTrack() {
    // 优先用 itemSelectors 逐项累加（不受 track 固定宽度影响）
    const itemSel = options.measure.itemSelectors?.filter(Boolean)
    if (itemSel?.length) {
      const q = Taro.createSelectorQuery()
      itemSel.forEach((sel) => q.selectAll(sel).boundingClientRect())
      q.exec((res) => {
        let maxRow = 0
        for (const items of res) {
          const rects = (items || []) as Array<{ width?: number }>
          const sum = rects.reduce((s, r) => s + (r.width ?? 0), 0)
          const gaps = Math.max(0, rects.length - 1) * (options.measure.itemGapPx ?? 0)
          maxRow = Math.max(maxRow, sum + gaps)
        }
        applyTrackWidth(maxRow)
      })
      return
    }

    // 兜底：量 track DOM 本身（第一次量会拿到自然宽度，因为 releaseTrackWidth 已清空固定宽）
    const rowSelectors = options.measure.rowSelectors.filter(Boolean)
    if (!rowSelectors.length) {
      applyTrackWidth(0)
      return
    }

    const q = Taro.createSelectorQuery()
    rowSelectors.forEach((sel) => q.select(sel).boundingClientRect())
    q.exec((res) => {
      let maxRow = 0
      for (const rect of res) {
        if (rect?.width) maxRow = Math.max(maxRow, rect.width)
      }
      applyTrackWidth(maxRow)
    })
  }

  async function remeasure() {
    releaseTrackWidth()
    await nextTick()
    setTimeout(measureTrack, 32)
    setTimeout(measureTrack, 160)
  }

  useReady(() => {
    void remeasure()
  })

  useDidShow(() => {
    void remeasure()
  })

  if (options.watchSources?.length) {
    watch(options.watchSources, () => {
      void remeasure()
    })
  }

  return {
    scrollViewportStyle,
    trackStyle,
    trackWidthPx,
    viewportWidthPx,
    remeasure,
  }
}

/** Tag 胶囊宽度估算（rpx），用于 scroll-x 首屏兜底 */
export function estimateTagChipWidthRpx(label: string, hasIcon: boolean): number {
  const chars = [...String(label || '')].length
  // 胶囊最小宽度 144rpx；如果文本较长则按文本计算
  const textW = chars * 28
  const iconW = hasIcon ? 36 : 0
  const gap = hasIcon ? 8 : 0
  const padX = 40
  const border = 4
  const computed = padX + border + iconW + gap + textW
  return Math.max(144, computed)
}

export function estimateTagRowsTrackWidthPx(
  rows: { label: string; icon: string }[][],
  gapRpx = 16,
  horizontalPaddingRpx = 48,
): number {
  const viewport = getWindowWidthPxStatic()

  function rowWidth(items: { label: string; icon: string }[]) {
    if (!items.length) return 0
    return items.reduce(
      (sum, item, index) =>
        sum +
        estimateTagChipWidthRpx(item.label, Boolean(item.icon)) +
        (index > 0 ? gapRpx : 0),
      0,
    )
  }

  const maxRowRpx = Math.max(0, ...rows.map(rowWidth)) + horizontalPaddingRpx
  return Math.max(rpxToPx(maxRowRpx), viewport + 1)
}

function getWindowWidthPxStatic() {
  return Taro.getWindowInfo().windowWidth
}
