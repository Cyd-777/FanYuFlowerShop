<template>
  <view v-if="visible" class="wiki-block-sheet">
    <view class="wiki-block-sheet__mask" @tap="onCancel" />
    <view class="wiki-block-sheet__panel" @tap.stop>
      <view class="wiki-block-sheet__handle" />
      <view class="wiki-block-sheet__header">
        <text class="wiki-block-sheet__title">{{ title }}</text>
        <text class="wiki-block-sheet__mode">{{ mode === 'single' ? '单选' : '多选' }}</text>
      </view>
      <scroll-view scroll-y class="wiki-block-sheet__scroll" :show-scrollbar="false">
        <view
          v-for="opt in options"
          :key="opt.id"
          class="wiki-block-sheet__item"
          hover-class="wiki-block-sheet__item--active"
          @tap="toggle(opt.id)"
        >
          <view class="wiki-block-sheet__check" :class="{ checked: isSelected(opt.id) }">
            <text v-if="isSelected(opt.id)" class="wiki-block-sheet__check-icon">✓</text>
          </view>
          <view class="wiki-block-sheet__item-body">
            <text class="wiki-block-sheet__item-label">{{ opt.label }}</text>
            <text v-if="opt.hint" class="wiki-block-sheet__item-hint">{{ opt.hint }}</text>
          </view>
        </view>
        <view v-if="!options.length" class="wiki-block-sheet__empty">暂无可选项</view>
      </scroll-view>
      <view class="wiki-block-sheet__actions">
        <nut-button plain class="wiki-block-sheet__btn" @click="onCancel">取消</nut-button>
        <nut-button type="primary" class="wiki-block-sheet__btn" @click="onConfirm">确定</nut-button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { WikiBlockOption } from '@/utils/wikiBlockCatalog'

const props = withDefaults(
  defineProps<{
    visible: boolean
    title: string
    mode?: 'single' | 'multiple'
    options: WikiBlockOption[]
    modelValue: string | string[]
  }>(),
  { mode: 'single' },
)

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'update:modelValue': [value: string | string[]]
  confirm: [value: string | string[]]
}>()

const draft = ref<string[]>([])

watch(
  () => props.visible,
  (open) => {
    if (!open) return
    if (props.mode === 'single') {
      const v = typeof props.modelValue === 'string' ? props.modelValue : ''
      draft.value = v ? [v] : []
    } else {
      draft.value = Array.isArray(props.modelValue) ? [...props.modelValue] : []
    }
  },
  { immediate: true },
)

function isSelected(id: string) {
  return draft.value.includes(id)
}

function toggle(id: string) {
  if (props.mode === 'single') {
    draft.value = [id]
    return
  }
  if (draft.value.includes(id)) {
    draft.value = draft.value.filter((item) => item !== id)
  } else {
    draft.value = [...draft.value, id]
  }
}

function onCancel() {
  emit('update:visible', false)
}

function onConfirm() {
  const value =
    props.mode === 'single' ? draft.value[0] || '' : draft.value.filter(Boolean)
  emit('update:modelValue', value)
  emit('confirm', value)
  emit('update:visible', false)
}
</script>

<style lang="less">
@import '@/styles/tokens.less';
.wiki-block-sheet {
  position: fixed;
  inset: 0;
  z-index: 2000;
}

.wiki-block-sheet__mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
}

.wiki-block-sheet__panel {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  max-height: 72vh;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
}

.wiki-block-sheet__handle {
  width: 64rpx;
  height: 8rpx;
  margin: 16rpx auto 8rpx;
  border-radius: 4rpx;
  background: #ddd;
}

.wiki-block-sheet__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 32rpx 16rpx;
}

.wiki-block-sheet__title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.wiki-block-sheet__mode {
  font-size: 22rpx;
  color: #999;
}

.wiki-block-sheet__scroll {
  flex: 1;
  min-height: 200rpx;
  max-height: 52vh;
  padding: 0 16rpx;
}

.wiki-block-sheet__item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 20rpx 16rpx;
  border-bottom: 1rpx solid @color-wiki-gray-bg;
}

.wiki-block-sheet__item--active {
  background: @color-bg-input;
}

.wiki-block-sheet__check {
  width: 36rpx;
  height: 36rpx;
  margin-top: 4rpx;
  border-radius: 50%;
  border: 2rpx solid #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &.checked {
    background: @color-primary;
    border-color: @color-primary;
  }
}

.wiki-block-sheet__check-icon {
  color: #fff;
  font-size: 22rpx;
  line-height: 1;
}

.wiki-block-sheet__item-body {
  flex: 1;
  min-width: 0;
}

.wiki-block-sheet__item-label {
  display: block;
  font-size: 28rpx;
  color: #333;
  line-height: 1.45;
}

.wiki-block-sheet__item-hint {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #999;
  line-height: 1.45;
}

.wiki-block-sheet__empty {
  padding: 48rpx;
  text-align: center;
  font-size: 26rpx;
  color: #999;
}

.wiki-block-sheet__actions {
  display: flex;
  gap: 16rpx;
  padding: 16rpx 24rpx 0;
}

.wiki-block-sheet__btn {
  flex: 1;
  border-radius: 48rpx;
}
</style>
