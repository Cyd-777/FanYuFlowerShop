<template>
  <view
    v-if="visible"
    class="scroll-list-tail-spacer"
    :style="spacerStyle"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import { useScrollListTailSpacer } from '@/composables/useScrollListTailSpacer'
import { SCROLL_TAIL_SPACER_HEIGHT } from '@/utils/scrollListTailSpacer'

const props = withDefaults(
  defineProps<{
    /** 列表/正文容器（不含本组件），用于量内容高度 */
    contentSelector: string
    /** 内嵌 scroll-view 时传入；整页滚动则不传 */
    scrollContainerSelector?: string
    /** 列表长度、loading 等，变化时重新判断是否需留白 */
    watchKey?: string | number | boolean
    height?: string
    /** 额外提前量 px（默认 0；「即将可滚」由内部阈值计算） */
    preemptPx?: number
    /** 整页 / scroll-view 均可用：额外固定底栏高度 px */
    bottomInsetPx?: number
    /** Tab 页或 scroll-view 底部被 TabBar 遮挡时设为 true */
    tabBar?: boolean
  }>(),
  {
    height: SCROLL_TAIL_SPACER_HEIGHT,
    preemptPx: 0,
    bottomInsetPx: 0,
    tabBar: false,
  },
)

const { visible, spacerStyle, remeasure } = useScrollListTailSpacer({
  contentSelector: props.contentSelector,
  scrollContainerSelector: props.scrollContainerSelector,
  watchKey: toRef(props, 'watchKey'),
  height: props.height,
  preemptPx: props.preemptPx,
  bottomInsetPx: props.bottomInsetPx,
  tabBar: props.tabBar,
})

defineExpose({ remeasure })
</script>

<style lang="less">
.scroll-list-tail-spacer {
  box-sizing: border-box;
  flex-shrink: 0;
}
</style>
