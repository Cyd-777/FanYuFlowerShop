<template>
  <view v-if="visible" class="wiki-note-sheet" @tap="onMaskTap">
    <view class="wiki-note-sheet__panel" @tap.stop>
      <view class="wiki-note-sheet__head">
        <text class="wiki-note-sheet__title">{{ title }}</text>
        <text class="wiki-note-sheet__close" @tap="emit('cancel')">取消</text>
      </view>
      <textarea
        v-if="multiline"
        class="wiki-note-sheet__textarea"
        :value="draft"
        :placeholder="placeholder"
        :maxlength="maxlength"
        :focus="visible"
        :cursor-spacing="120"
        @input="onInput"
      />
      <input
        v-else
        class="wiki-note-sheet__input"
        :value="draft"
        :placeholder="placeholder"
        :maxlength="maxlength"
        :focus="visible"
        @input="onInput"
      />
      <button class="wiki-note-sheet__confirm" @tap="onConfirm">完成</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    visible: boolean
    title: string
    value: string
    placeholder?: string
    multiline?: boolean
    maxlength?: number
  }>(),
  {
    placeholder: '',
    multiline: true,
    maxlength: 8000,
  },
)

const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: [value: string]
  cancel: []
}>()

const draft = ref('')

watch(
  () => props.visible,
  (open) => {
    if (open) draft.value = props.value
  },
)

function onInput(e: { detail: { value: string } }) {
  draft.value = e.detail.value
}

function onMaskTap() {
  emit('cancel')
  emit('update:visible', false)
}

function onConfirm() {
  emit('confirm', draft.value)
  emit('update:visible', false)
}
</script>

<style lang="less">
.wiki-note-sheet {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
}

.wiki-note-sheet__panel {
  width: 100%;
  max-height: 72vh;
  padding: 24rpx 24rpx calc(24rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  box-sizing: border-box;
}

.wiki-note-sheet__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.wiki-note-sheet__title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.wiki-note-sheet__close {
  font-size: 28rpx;
  color: #999;
  padding: 8rpx;
}

.wiki-note-sheet__textarea {
  width: 100%;
  min-height: 280rpx;
  max-height: 40vh;
  padding: 20rpx;
  box-sizing: border-box;
  font-size: 28rpx;
  line-height: 1.6;
  background: @color-bg-surface-alt;
  border-radius: 12rpx;
}

.wiki-note-sheet__input {
  width: 100%;
  height: 80rpx;
  padding: 0 20rpx;
  box-sizing: border-box;
  font-size: 28rpx;
  background: @color-bg-surface-alt;
  border-radius: 12rpx;
}

.wiki-note-sheet__confirm {
  margin-top: 20rpx;
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  font-size: 30rpx;
  color: #fff;
  background: @color-primary;
  border-radius: 44rpx;
  border: none;

  &::after {
    border: none;
  }
}
</style>
