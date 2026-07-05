<template>
  <ScrollAnchorNavShell layer="l2-section" :root-class="rootClass">
    <ScrollAnchorNavShell layer="l2-content">
      <slot />
    </ScrollAnchorNavShell>
  </ScrollAnchorNavShell>
</template>

<script setup lang="ts">
import ScrollAnchorNavShell from '@/components/ScrollAnchorNavShell.vue'

withDefaults(
  defineProps<{
    rootClass?: string
  }>(),
  {
    rootClass: '',
  },
)
</script>
