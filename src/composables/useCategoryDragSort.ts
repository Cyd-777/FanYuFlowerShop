import { showToast } from '@/utils/feedback'
import { ref, watch, type Ref } from 'vue'
import type { Category } from '@/types/category'

const ITEM_HEIGHT_RPX = 128

function rpxToPx(rpx: number) {
  const { windowWidth } = wx.getSystemInfoSync()
  return (windowWidth / 750) * rpx
}

/**
 * 分类列表拖拽排序（按住左侧手柄上下拖动）。
 */
export function useCategoryDragSort(source: Ref<Category[]>, onCommit: (orderedIds: string[]) => Promise<void>) {
  const localList = ref<Category[]>([])
  const dragIndex = ref<number | null>(null)
  const dragOffsetY = ref(0)
  const savingOrder = ref(false)
  const startY = ref(0)
  const startIndex = ref(0)

  watch(
    source,
    (list) => {
      if (dragIndex.value != null) return
      localList.value = [...list]
    },
    { immediate: true, deep: true },
  )

  function moveItem(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= localList.value.length || to >= localList.value.length) {
      return
    }
    const next = [...localList.value]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    localList.value = next
  }

  function onHandleTouchStart(index: number, e: WechatMiniprogram.TouchEvent) {
    if (savingOrder.value) return
    const touch = e.touches?.[0]
    if (!touch) return
    dragIndex.value = index
    startIndex.value = index
    startY.value = touch.clientY
    dragOffsetY.value = 0
  }

  function onHandleTouchMove(e: WechatMiniprogram.TouchEvent) {
    if (dragIndex.value == null || savingOrder.value) return
    const touch = e.touches?.[0]
    if (!touch) return
    dragOffsetY.value = touch.clientY - startY.value

    const itemHeight = rpxToPx(ITEM_HEIGHT_RPX)
    const shift = Math.round(dragOffsetY.value / itemHeight)
    const target = Math.max(0, Math.min(localList.value.length - 1, startIndex.value + shift))
    if (target !== dragIndex.value) {
      moveItem(dragIndex.value, target)
      dragIndex.value = target
    }
  }

  async function onHandleTouchEnd() {
    if (dragIndex.value == null) return
    dragIndex.value = null
    dragOffsetY.value = 0

    const orderedIds = localList.value.map((item) => item._id)
    savingOrder.value = true
    try {
      await onCommit(orderedIds)
    } catch (err) {
      localList.value = [...source.value]
      showToast({
        title: err instanceof Error ? err.message : '排序保存失败',
        icon: 'none',
      })
    } finally {
      savingOrder.value = false
    }
  }

  return {
    localList,
    dragIndex,
    dragOffsetY,
    savingOrder,
    onHandleTouchStart,
    onHandleTouchMove,
    onHandleTouchEnd,
  }
}
