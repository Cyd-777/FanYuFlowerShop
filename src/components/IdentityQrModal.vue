<template>
  <view v-if="visible" class="identity-modal-mask" @tap="close">
    <view class="identity-modal" @tap.stop="noop">
      <view class="modal-close" @tap="close">{{ closeText }}</view>

      <view class="modal-title">{{ titleText }}</view>
      <view class="modal-desc">{{ descText }}</view>

      <view class="qr-placeholder">
        <text class="placeholder-icon">{{ qrIcon }}</text>
        <text class="placeholder-text">{{ qrText }}</text>
        <text class="placeholder-hint">{{ qrHint }}</text>
      </view>

      <view class="openid-row">{{ openid || emptyOpenidText }}</view>

      <view
        class="copy-btn"
        :class="{ disabled: !openid }"
        @tap="copyOpenid"
      >
        {{ copyText }}
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
const props = defineProps<{
  visible: boolean
  openid: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const titleText = '我的身份码'
const descText = '商家可扫描身份码添加工作人员，到店提货时出示此码核销'
const qrIcon = '📱'
const qrText = '二维码生成开发中'
const qrHint = '当前请出示下方 OpenID'
const copyText = '复制 OpenID'
const closeText = '×'
const emptyOpenidText = '未获取到 OpenID'

function noop() {}

function close() {
  emit('update:visible', false)
}

function copyOpenid() {
  if (!props.openid) return
  wx.setClipboardData({
    data: props.openid,
    success: () => wx.showToast({ title: 'OpenID 已复制', icon: 'success' }),
  })
}
</script>

<style lang="less">
.identity-modal-mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
}
.identity-modal {
  position: relative;
  width: 560rpx;
  padding: 48rpx 40rpx 40rpx;
  background: #fff;
  border-radius: 24rpx;
  text-align: center;
  box-sizing: border-box;
}
.modal-close {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  width: 56rpx;
  height: 56rpx;
  line-height: 56rpx;
  font-size: 44rpx;
  color: #999;
  text-align: center;
}
.modal-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #333;
}
.modal-desc {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #999;
  line-height: 1.5;
}
.qr-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 400rpx;
  height: 400rpx;
  margin: 32rpx auto 24rpx;
  background: #fafafa;
  border: 2rpx dashed #e0e0e0;
  border-radius: 16rpx;
  .placeholder-icon {
    font-size: 80rpx;
    line-height: 1;
  }
  .placeholder-text {
    margin-top: 16rpx;
    font-size: 28rpx;
    color: #999;
  }
  .placeholder-hint {
    margin-top: 8rpx;
    font-size: 22rpx;
    color: #ccc;
  }
}
.openid-row {
  margin-bottom: 24rpx;
  padding: 16rpx;
  font-size: 22rpx;
  color: #666;
  word-break: break-all;
  background: #f8f8f8;
  border-radius: 8rpx;
}
.copy-btn {
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 44rpx;
  font-size: 30rpx;
  color: #fff;
  background: #e53935;
  &.disabled {
    opacity: 0.45;
  }
}
</style>
