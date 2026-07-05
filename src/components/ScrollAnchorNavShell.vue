<template>
  <view
    class="scroll-anchor-nav-shell"
    :class="[`scroll-anchor-nav-shell--${layer}`, rootClass]"
    :style="shellStyle"
  >
    <slot />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { layoutDebugConfig } from '@/config/layoutDebug'
import type { ScrollAnchorNavDebugLayer } from '@/types/scrollAnchorNav'

const props = withDefaults(
  defineProps<{
    layer: ScrollAnchorNavDebugLayer
    rootClass?: string
  }>(),
  {
    rootClass: '',
  },
)

const LAYER_BG: Record<ScrollAnchorNavDebugLayer, string> = {
  'l1-tab-rail': layoutDebugConfig.scrollAnchorL1TabRailBg,
  'l1-scroll': layoutDebugConfig.scrollAnchorL1ScrollBg,
  'l1-content': layoutDebugConfig.scrollAnchorL1ContentBg,
  'l2-section': layoutDebugConfig.scrollAnchorL2SectionBg,
  'l2-pill': layoutDebugConfig.scrollAnchorL2PillBg,
  'l2-pill-spacer': layoutDebugConfig.scrollAnchorL2PillSpacerBg,
  'l2-content': layoutDebugConfig.scrollAnchorL2ContentBg,
}

const shellStyle = computed(() => {
  if (!layoutDebugConfig.showLayoutDebugBg) return undefined
  return { background: LAYER_BG[props.layer] }
})
</script>

<style lang="less">
.scroll-anchor-nav-shell {
  box-sizing: border-box;
}
</style>
