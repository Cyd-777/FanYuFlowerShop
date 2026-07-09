<template>
  <view
    class="wiki-field-slot"
    :id="anchorId || undefined"
    :class="{ 'wiki-field-slot--empty': empty, 'wiki-field-slot--highlight': highlight }"
  >
    <view v-if="label" class="wiki-field-slot__label">{{ label }}</view>
    <view class="wiki-field-slot__box">
      <slot v-if="!empty" />
      <text v-else class="wiki-field-slot__placeholder">{{ emptyText }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string
    empty?: boolean
    emptyText?: string
    /** 锚点滚动定位 id（须为 scroll-view 子节点） */
    anchorId?: string
    highlight?: boolean
  }>(),
  {
    empty: true,
    emptyText: '—',
    highlight: false,
  },
)
</script>

<style lang="less">
@import '@/styles/tokens.less';

.wiki-field-slot {
  margin-bottom: 20rpx;

  &--empty .wiki-field-slot__box {
    border-style: dashed;
    background: @color-bg-input;
  }

  &--highlight .wiki-field-slot__box {
    border-color: @color-primary-border;
    background: @color-primary-bg-alt;
    box-shadow: 0 0 0 2rpx rgba(229, 57, 53, 0.12);
  }
}

.wiki-field-slot__label {
  margin-bottom: 8rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: @color-text-tertiary;
}

.wiki-field-slot__box {
  min-height: 72rpx;
  padding: 16rpx 20rpx;
  background: @color-bg-card;
  border: 2rpx solid @color-border;
  border-radius: 12rpx;
  box-sizing: border-box;
}

.wiki-field-slot__placeholder {
  font-size: 26rpx;
  color: @color-text-placeholder;
  line-height: 1.5;
}
</style>
