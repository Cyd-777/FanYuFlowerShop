import { nextTick, ref, watch, type MaybeRefOrGetter, type WatchSource, toValue } from 'vue'
import Taro from '@tarojs/taro'
import { rpxToPx } from '@/composables/usePageSticky'

export interface UseScrollXActiveAlignOptions {
  scrollSelector: string
  /** track 内胶囊项选择器，如 '.pill-item' */
  itemSelector: string
  activeIndex: MaybeRefOrGetter<number>
  /** 激活项对齐到的槽位（0=第一个位置，1=第二个位置，美团常用 1） */
  anchorSlotIndex?: number
  /** 项间距（rpx，与 track gap 一致） */
  itemGapRpx?: number
  /** track 水平 padding（rpx，左右合计或单侧按页面样式） */
  trackPaddingRpx?: number
  enabled?: MaybeRefOrGetter<boolean>
  watchSources?: WatchSource[]
}

/**
 * 横向 scroll-view：随选中项自动 scroll-left，使激活胶囊滚入可视区并对齐到锚点槽位。
 * 例：anchorSlot=1 时，第 3 个激活会滚到原先第 2 个的位置（滚窗口，不是 DOM 换位）。
 */
export function useScrollXActiveAlign(options: UseScrollXActiveAlignOptions) {
  const scrollLeft = ref(0)
  const anchorSlot = options.anchorSlotIndex ?? 1
  const itemGapPx = () => rpxToPx(options.itemGapRpx ?? 8)
  const trackPadPx = () => rpxToPx(options.trackPaddingRpx ?? 12)

  function isEnabled(): boolean {
    return options.enabled === undefined ? true : Boolean(toValue(options.enabled))
  }

  function alignToActive() {
    if (!isEnabled()) return

    const activeIdx = toValue(options.activeIndex)
    const query = Taro.createSelectorQuery()
    query.select(options.scrollSelector).boundingClientRect()
    query.selectAll(options.itemSelector).boundingClientRect()
    query.exec((res) => {
      const viewport = res?.[0] as { width?: number } | undefined
      const items = (res?.[1] || []) as Array<{ width?: number }>
      if (!viewport?.width || !items.length) return

      const pad = trackPadPx()
      const gap = itemGapPx()
      const offsets: number[] = []
      let cursor = pad
      for (let i = 0; i < items.length; i++) {
        offsets.push(cursor)
        cursor += (items[i].width ?? 0) + gap
      }
      const trackWidth = Math.max(cursor - gap + pad, 0)
      const maxScroll = Math.max(0, trackWidth - viewport.width)

      const slotIdx = Math.min(anchorSlot, activeIdx, items.length - 1)
      const anchorOffset = offsets[slotIdx] ?? pad
      const activeOffset = offsets[activeIdx] ?? pad
      const target = activeIdx <= slotIdx ? 0 : Math.max(0, activeOffset - anchorOffset)

      scrollLeft.value = Math.min(target, maxScroll)
    })
  }

  function scheduleAlign() {
    void nextTick(() => {
      setTimeout(alignToActive, 32)
    })
  }

  function resetScroll() {
    scrollLeft.value = 0
  }

  watch(
    () => toValue(options.activeIndex),
    () => scheduleAlign(),
  )

  if (options.watchSources?.length) {
    watch(options.watchSources, () => scheduleAlign())
  }

  return {
    scrollLeft,
    alignToActive: scheduleAlign,
    resetScroll,
  }
}
