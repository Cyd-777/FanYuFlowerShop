<template>
  <view class="page-verify">
    <view class="intro">
      <view class="icon">📱</view>
      <view class="title">扫码核销</view>
      <view class="desc">扫描顾客的提货码，确认提货</view>
    </view>

    <nut-button type="primary" block class="scan-btn" @click="scan">
      开始扫码
    </nut-button>

    <view class="history" v-if="records.length">
      <view class="section-title">核销记录</view>
      <view v-for="(r, idx) in records" :key="idx" class="record-item">
        <view class="order-no">订单: {{ r.orderNo }}</view>
        <view class="time">{{ r.time }}</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const records = ref<{ orderNo: string; time: string }[]>([])

async function scan() {
  try {
    const res = await wx.scanCode({})
    // 扫码结果处理 - 后续对接云函数
    wx.showToast({ title: '核销成功', icon: 'success' })
  } catch {
    wx.showToast({ title: '扫码取消', icon: 'none' })
  }
}
</script>

<style lang="less">
.page-verify { background: #f8f8f8; min-height: 100vh; }
.intro { text-align: center; padding: 80rpx 32rpx 48rpx; }
.icon { font-size: 100rpx; }
.title { margin-top: 16rpx; font-size: 36rpx; font-weight: 600; }
.desc { margin-top: 8rpx; font-size: 26rpx; color: #999; }
.scan-btn { margin: 0 32rpx; border-radius: 48rpx; height: 100rpx; font-size: 32rpx; }
.history { margin-top: 48rpx; padding: 0 32rpx; }
.section-title { font-size: 28rpx; font-weight: 600; margin-bottom: 16rpx; }
.record-item { display: flex; justify-content: space-between; padding: 16rpx 0; border-bottom: 2rpx solid #f5f5f5; }
.order-no { font-size: 26rpx; color: #333; }
.time { font-size: 22rpx; color: #999; }
</style>
