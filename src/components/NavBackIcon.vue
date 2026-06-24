<template>
  <AppIcon type="返回" :size="size" />
</template>

<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'

withDefaults(
  defineProps<{
    /** 图标边长（px） */
    size?: number
  }>(),
  {
    size: 24,
  },
)
</script>
