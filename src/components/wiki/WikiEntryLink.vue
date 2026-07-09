<template>
  <text class="wiki-entry-link" @tap.stop="onTap">{{ label }}</text>
</template>

<script setup lang="ts">
const props = defineProps<{
  label: string
}>()

const emit = defineEmits<{
  navigate: [label: string]
}>()

function onTap() {
  emit('navigate', props.label)
}
</script>

<style lang="less">
.wiki-entry-link {
  color: @color-danger;
  border-bottom: 2rpx dashed rgba(198, 40, 40, 0.55);
  padding-bottom: 2rpx;
}
</style>
