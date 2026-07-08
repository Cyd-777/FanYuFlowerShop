<template>
  <view v-if="visible" class="login-legal-mask" @tap="emit('close')">
    <view class="login-legal-sheet" @tap.stop="noop">
      <view class="login-legal-sheet__head">
        <text class="login-legal-sheet__title">{{ doc?.title || '' }}</text>
        <text class="login-legal-sheet__close" @tap="emit('close')">{{ closeText }}</text>
      </view>
      <scroll-view class="login-legal-sheet__body" :scroll-y="true">
        <text class="login-legal-sheet__meta">更新日期：{{ doc?.updatedAt || '' }}</text>
        <text
          v-for="(para, idx) in doc?.paragraphs || []"
          :key="idx"
          class="login-legal-sheet__para"
        >
          {{ para }}
        </text>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { LEGAL_DOCUMENTS, type LegalDocKind } from '@/config/legal'

const props = defineProps<{
  visible: boolean
  kind: LegalDocKind | ''
}>()

const emit = defineEmits<{
  close: []
}>()

const closeText = '关闭'

const doc = computed(() => (props.kind ? LEGAL_DOCUMENTS[props.kind] : null))

function noop() {}
</script>

<style lang="less">
@import '@/styles/tokens.less';

.login-legal-mask {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
}
.login-legal-sheet {
  width: 100%;
  max-height: 78vh;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  display: flex;
  flex-direction: column;
}
.login-legal-sheet__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx 16rpx;
}
.login-legal-sheet__title {
  font-size: 32rpx;
  font-weight: 600;
  color: @color-text-primary;
}
.login-legal-sheet__close {
  font-size: 28rpx;
  color: @color-primary;
}
.login-legal-sheet__body {
  flex: 1;
  min-height: 0;
  padding: 0 32rpx 48rpx;
  box-sizing: border-box;
}
.login-legal-sheet__meta {
  display: block;
  margin-bottom: 24rpx;
  font-size: 24rpx;
  color: @color-text-tertiary;
}
.login-legal-sheet__para {
  display: block;
  margin-bottom: 20rpx;
  font-size: 28rpx;
  line-height: 1.7;
  color: @color-text-secondary;
}
</style>
