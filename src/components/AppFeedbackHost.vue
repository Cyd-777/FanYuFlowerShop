<template>
  <view class="app-feedback-host">
    <view
      v-if="pullRefreshLoadingState.visible"
      class="app-pull-refresh"
      :style="pullRefreshStyle"
    >
      <view class="app-pull-refresh__track">
        <view class="app-pull-refresh__bar" />
      </view>
    </view>

    <view
      v-if="feedbackBarState.visible"
      class="app-notify-bar-wrap"
      :class="`app-notify-bar-wrap--${feedbackBarState.position}`"
      :style="wrapPositionStyle"
    >
      <view
        class="app-notify-bar"
        :class="`app-notify-bar--${feedbackBarState.tone}`"
        :style="barChipStyle"
        @tap="onNotifyBarClose"
      >
        <image class="app-notify-bar__icon" :src="barStyle.iconSrc" mode="aspectFit" />
        <text class="app-notify-bar__text">{{ feedbackBarState.message }}</text>
      </view>
    </view>

    <!-- 自定义模态：避免 nut-dialog 在 Tab 页首屏初始化导致白屏 -->
    <view
      v-if="feedbackAlertState.visible"
      class="app-feedback-alert-mask"
      @tap="onMaskTap"
    >
      <view
        class="app-feedback-alert"
        :class="alertDialogClass"
        @tap.stop="noop"
      >
        <text class="app-feedback-alert__title">{{ feedbackAlertState.title }}</text>
        <text class="app-feedback-alert__message">{{ feedbackAlertState.message }}</text>
        <view v-if="isConfirmMode" class="app-feedback-dialog__footer">
          <view
            class="app-feedback-dialog__confirm app-feedback-alert__btn"
            @tap="onNotifyAlertConfirm"
          >
            {{ feedbackAlertState.confirmText }}
          </view>
          <view
            class="app-feedback-dialog__cancel app-feedback-alert__btn app-feedback-alert__btn--primary"
            @tap="onNotifyAlertCancel"
          >
            {{ feedbackAlertState.cancelText }}
          </view>
        </view>
        <view
          v-else
          class="app-feedback-alert__btn app-feedback-alert__btn--primary app-feedback-alert__btn--single"
          @tap="onNotifyAlertConfirm"
        >
          {{ feedbackAlertState.confirmText }}
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDidShow } from '@tarojs/taro'
import {
  FEEDBACK_TONE_STYLES,
  feedbackAlertState,
  feedbackBarState,
  getNotifyBarTopOffsetPx,
  getPullRefreshTopOffsetPx,
  onNotifyAlertCancel,
  onNotifyAlertConfirm,
  onNotifyBarClose,
  pullRefreshLoadingState,
} from '@/utils/feedback'

const notifyTopPx = ref(getNotifyBarTopOffsetPx())
const pullRefreshTopPx = ref(getPullRefreshTopOffsetPx())

function refreshTopOffset() {
  notifyTopPx.value = getNotifyBarTopOffsetPx(true)
  pullRefreshTopPx.value = getPullRefreshTopOffsetPx()
}

useDidShow(refreshTopOffset)

function noop() {}

function onMaskTap() {
  if (feedbackAlertState.mode === 'confirm') {
    onNotifyAlertCancel()
  }
}

const isConfirmMode = computed(() => feedbackAlertState.mode === 'confirm')

const barStyle = computed(() => FEEDBACK_TONE_STYLES[feedbackBarState.tone])

const wrapPositionStyle = computed(() => {
  if (feedbackBarState.position === 'bottom') return {}
  return { top: `${notifyTopPx.value}px` }
})

const barChipStyle = computed(() => {
  const colors = barStyle.value
  return {
    background: colors.background,
    color: colors.color,
    borderColor: colors.borderColor,
  }
})

const pullRefreshStyle = computed(() => ({
  top: `${pullRefreshTopPx.value}px`,
}))

const alertDialogClass = computed(
  () => `app-feedback-dialog--${feedbackAlertState.tone}`,
)
</script>

<style lang="less">
@import '@/styles/tokens.less';

.app-feedback-host {
  pointer-events: none;
}

.app-notify-bar-wrap {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 1500;
  display: flex;
  justify-content: center;
  padding: 0 32rpx;
  box-sizing: border-box;
  pointer-events: none;
}

.app-notify-bar-wrap--bottom {
  bottom: calc(24rpx + env(safe-area-inset-bottom));
}

.app-notify-bar-wrap:not(.app-notify-bar-wrap--bottom) {
  padding-top: 12rpx;
}

.app-notify-bar {
  pointer-events: auto;
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 12rpx;
  max-width: 560rpx;
  width: 100%;
  min-height: 72rpx;
  padding: 16rpx 24rpx;
  border-radius: 16rpx;
  border: 1rpx solid transparent;
  box-sizing: border-box;
  box-shadow: 0 8rpx 28rpx rgba(0, 0, 0, 0.12);
}

.app-notify-bar__icon {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
}

.app-notify-bar__text {
  flex: 1;
  min-width: 0;
  font-size: @font-size-md;
  line-height: 1.45;
  word-break: break-word;
}

.app-pull-refresh {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 1499;
  height: 6rpx;
  pointer-events: none;
}

.app-pull-refresh__track {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: rgba(229, 57, 53, 0.12);
}

.app-pull-refresh__bar {
  position: absolute;
  top: 0;
  left: 0;
  width: 36%;
  height: 100%;
  background: @color-primary;
  animation: app-pull-refresh-slide 0.9s ease-in-out infinite;
}

@keyframes app-pull-refresh-slide {
  0% {
    transform: translateX(-110%);
  }
  100% {
    transform: translateX(320%);
  }
}

.app-feedback-alert-mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1600;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.45);
  pointer-events: auto;
}

.app-feedback-alert {
  width: 100%;
  max-width: 560rpx;
  padding: 40rpx 32rpx 32rpx;
  border-radius: 16rpx;
  background: #fff;
  box-sizing: border-box;
}

.app-feedback-alert__title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: @color-text-primary;
  line-height: 1.4;
  text-align: center;
}

.app-feedback-alert__message {
  display: block;
  margin-top: 20rpx;
  font-size: 28rpx;
  color: @color-text-secondary;
  line-height: 1.55;
  text-align: center;
}

.app-feedback-alert__btn {
  flex: 1;
  min-width: 0;
  height: 72rpx;
  line-height: 72rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
  text-align: center;
  box-sizing: border-box;
}

.app-feedback-alert__btn--single {
  margin-top: 32rpx;
}

.app-feedback-alert__btn--primary {
  color: #fff;
  background: @color-primary;
}

.app-feedback-dialog__footer {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
  margin-top: 32rpx;
  gap: 16rpx;
}

.app-feedback-dialog__confirm {
  color: @color-text-secondary;
  background: #f5f5f5;
}

.app-feedback-dialog__cancel {
  color: #fff;
  background: @color-primary;
}

.app-feedback-dialog--success .app-feedback-alert__title {
  color: @color-success;
}

.app-feedback-dialog--warning .app-feedback-alert__title {
  color: @color-warning;
}

.app-feedback-dialog--danger .app-feedback-alert__title {
  color: @color-danger;
}

.app-feedback-dialog--primary .app-feedback-alert__title {
  color: @color-primary;
}
</style>
