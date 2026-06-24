<template>
  <view
    v-if="feedbackBarState.visible"
    class="app-notify-bar"
    :class="[
      `app-notify-bar--${feedbackBarState.position}`,
      `app-notify-bar--${feedbackBarState.tone}`,
    ]"
    :style="barPositionStyle"
    @tap="onNotifyBarClose"
  >
    <text class="app-notify-bar__text">{{ feedbackBarState.message }}</text>
  </view>
  <nut-dialog
    v-model:visible="feedbackAlertState.visible"
    :title="feedbackAlertState.title"
    :content="feedbackAlertState.message"
    :no-cancel-btn="true"
    :no-ok-btn="isConfirmMode"
    :ok-text="feedbackAlertState.confirmText"
    :custom-class="alertDialogClass"
    @ok="onNotifyAlertConfirm"
  >
    <template v-if="isConfirmMode" #footer>
      <view class="app-feedback-dialog__footer">
        <nut-button
          size="small"
          class="app-feedback-dialog__confirm"
          @click="onNotifyAlertConfirm"
        >
          {{ feedbackAlertState.confirmText }}
        </nut-button>
        <nut-button
          type="primary"
          size="small"
          class="app-feedback-dialog__cancel"
          @click="onNotifyAlertCancel"
        >
          {{ feedbackAlertState.cancelText }}
        </nut-button>
      </view>
    </template>
  </nut-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDidShow } from '@tarojs/taro'
import {
  FEEDBACK_TONE_STYLES,
  feedbackAlertState,
  feedbackBarState,
  getNotifyBarTopOffsetPx,
  onNotifyAlertCancel,
  onNotifyAlertConfirm,
  onNotifyBarClose,
} from '@/utils/feedback'

const topOffsetPx = ref(getNotifyBarTopOffsetPx())

function refreshTopOffset() {
  topOffsetPx.value = getNotifyBarTopOffsetPx(true)
}

useDidShow(refreshTopOffset)

const isConfirmMode = computed(() => feedbackAlertState.mode === 'confirm')

const barStyle = computed(() => FEEDBACK_TONE_STYLES[feedbackBarState.tone])

const barPositionStyle = computed(() => {
  const colors = barStyle.value
  if (feedbackBarState.position === 'bottom') {
    return {
      background: colors.background,
      color: colors.color,
    }
  }
  return {
    top: `${topOffsetPx.value}px`,
    background: colors.background,
    color: colors.color,
  }
})

const alertDialogClass = computed(
  () => `app-feedback-dialog app-feedback-dialog--${feedbackAlertState.tone}`,
)
</script>

<style lang="less">
@import '@/styles/tokens.less';

.app-notify-bar {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 1500;
  width: 100%;
  min-height: 72rpx;
  line-height: 1.45;
  padding: 20rpx 32rpx;
  font-size: @font-size-md;
  box-sizing: border-box;
  box-shadow: 0 6rpx 24rpx rgba(0, 0, 0, 0.12);
}

.app-notify-bar__text {
  display: block;
  word-break: break-word;
}

.app-notify-bar--bottom {
  bottom: 0;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
}

.app-feedback-dialog {
  .nut-dialog__header {
    font-weight: 600;
  }

  .nut-dialog__content {
    color: @color-text-secondary;
    line-height: 1.55;
  }

  .nut-button--primary {
    background: @color-primary;
    border-color: @color-primary;
  }
}

.app-feedback-dialog__footer {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
  padding: 0 24rpx 24rpx;
  gap: 16rpx;
}

.app-feedback-dialog__confirm,
.app-feedback-dialog__cancel {
  flex: 1;
  min-width: 0;
}

.app-feedback-dialog__confirm {
  color: @color-text-secondary;
  background: #f5f5f5;
  border-color: #f5f5f5;
}

.app-feedback-dialog--success .nut-dialog__header {
  color: @color-success;
}

.app-feedback-dialog--warning .nut-dialog__header {
  color: @color-warning;
}

.app-feedback-dialog--danger .nut-dialog__header {
  color: @color-danger;
}

.app-feedback-dialog--primary .nut-dialog__header {
  color: @color-primary;
}
</style>
