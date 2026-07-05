<template>
  <view
    class="app-nav-back-btn"
    hover-class="app-nav-back-btn--active"
    :style="buttonStyle"
    aria-role="button"
    aria-label="返回"
    @tap="emit('tap')"
  >
    <AppIcon type="返回" :size="24" />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { getNavBarLayout } from '@/utils/navBarLayout'

const props = withDefaults(
  defineProps<{
    widthPx?: number
    heightPx?: number
  }>(),
  {},
)

const emit = defineEmits<{ tap: [] }>()

const layout = getNavBarLayout()

const buttonStyle = computed(() => ({
  width: `${props.widthPx ?? Math.max(layout.capsuleHeight + 16, 44)}px`,
  height: `${props.heightPx ?? layout.capsuleHeight}px`,
}))
</script>

<style lang="less">
.app-nav-back-btn {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  pointer-events: auto;
}

.app-nav-back-btn--active {
  opacity: 0.55;
}
</style>
