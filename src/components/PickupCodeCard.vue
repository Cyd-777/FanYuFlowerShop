<template>
  <view class="pickup-card">
    <view class="pickup-title" v-if="orderStatus !== 'completed'">{{ readyTitleText }}</view>
    <view class="pickup-title" v-else>{{ completedTitleText }}</view>

    <canvas
      v-if="showCanvas"
      class="pickup-canvas"
      canvas-id="pickupQrcode"
      :style="canvasStyle"
    />

    <view v-if="orderStatus !== 'completed'" class="pickup-hint">{{ verifyHintText }}</view>

    <view class="pickup-body">
      <view class="pickup-row"><text class="pk-label">{{ orderNoLabelText }}</text><text>{{ orderNo }}</text></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, computed } from 'vue'
import drawQrcode from 'weapp-qrcode'

const readyTitleText = '订单已备好，到店取货'
const completedTitleText = '订单已完成'
const verifyHintText = '向店员出示此码核销'
const orderNoLabelText = '订单号'

const props = defineProps<{
  orderId: string
  verifyToken: string
  orderNo?: string
  orderStatus?: string
}>()

const showCanvas = ref(false)
const QR_TEXT = `fyfs:pickup|${props.orderId}|${props.verifyToken}`

const LOGICAL_SIZE = 220
const dpr = ref(2)

const canvasStyle = computed(() => ({
  width: `${LOGICAL_SIZE}px`,
  height: `${LOGICAL_SIZE}px`,
}))

onMounted(() => {
  const sys = wx.getSystemInfoSync()
  dpr.value = sys.pixelRatio || 2
  showCanvas.value = true
  nextTick(() => {
    setTimeout(() => {
      drawQR()
    }, 400)
  })
})

function drawQR() {
  try {
    // 旧 canvas API 中，createCanvasContext 的尺寸 = canvas CSS 尺寸
    // 这里传入 CSS 像素值
    drawQrcode({
      width: LOGICAL_SIZE,
      height: LOGICAL_SIZE,
      canvasId: 'pickupQrcode',
      text: QR_TEXT,
      typeNumber: 8,   // 确保足够容量
      correctLevel: 1, // L 级纠错，容量最大
    })
  } catch (err) {
    console.warn('[PickupCodeCard] draw qr failed:', err)
  }
}
</script>

<style lang="less">
.pickup-card {
  background: #fff;
  margin: 16rpx;
  padding: 32rpx;
  border-radius: 16rpx;
  text-align: center;
  border: 2rpx solid @color-primary-light;
}
.pickup-title { font-size: 28rpx; font-weight: 600; color: #333; margin-bottom: 16rpx; }
.pickup-canvas {
  display: inline-block;
  margin: 0 auto;
  background: #fff;
  border-radius: 8rpx;
}
.pickup-hint { font-size: 24rpx; color: #999; margin-top: 16rpx; }
.pickup-body { border-top: 2rpx solid @color-bg-muted; margin-top: 16rpx; padding-top: 16rpx; text-align: left; }
.pickup-row { display: flex; gap: 12rpx; font-size: 24rpx; padding: 4rpx 0; }
.pk-label { color: #999; width: 80rpx; flex-shrink: 0; }
</style>
