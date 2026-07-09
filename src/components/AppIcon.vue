<template>
  <image
    class="app-icon"
    :src="iconSrc"
    mode="aspectFit"
    :style="iconStyle"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getAppIconSrc, type AppIconType } from '@/assets/icons'

const props = withDefaults(
  defineProps<{
    /** 图标名称（中文，见 `@/assets/icons` 注册表） */
    type: AppIconType
    /** 图标边长（px） */
    size?: number
  }>(),
  {
    size: 24,
  },
)

const iconSrc = computed(() => getAppIconSrc(props.type))

const iconStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
}))
</script>

<style lang="less">
.app-icon {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: middle;
}
</style>
