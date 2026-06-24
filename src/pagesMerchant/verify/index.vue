<template>
  <view class="page-verify">
    <AppNavBar />
    <view class="intro">
      <view class="icon">📱</view>
      <view class="title">扫码核销</view>
      <view class="desc">扫描顾客订单码，确认门店自提（开发中）</view>
    </view>

    <view class="page-actions">
      <nut-button type="primary" block class="action-btn" :loading="scanning" @click="scan">
        开始扫码
      </nut-button>
    </view>

    <view class="tip">订单码核销功能即将上线，届时将对接订单云函数校验提货状态。</view>

    <view class="history" v-if="records.length">
      <view class="section-title">核销记录</view>
      <view v-for="(r, idx) in records" :key="idx" class="record-item">
        <view class="record-main">
          <view class="order-no">{{ r.label }}</view>
          <view class="order-hint">{{ r.orderHint }}</view>
        </view>
        <view class="time">{{ r.time }}</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { showToast } from '@/utils/feedback'
import { ref } from 'vue'

interface VerifyRecord {
  label: string
  orderHint: string
  time: string
}

const records = ref<VerifyRecord[]>([])
const scanning = ref(false)

function formatTime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

async function scan() {
  scanning.value = true
  try {
    const res = await wx.scanCode({ scanType: ['qrCode'] })
    const raw = (res.result || '').trim()
    if (!raw) {
      showToast({ title: '无法识别的订单码', icon: 'none' })
      return
    }

    showToast({ title: '订单码核销开发中', icon: 'none' })
    records.value.unshift({
      label: '扫码记录',
      orderHint: raw.length > 24 ? `${raw.slice(0, 24)}…` : raw,
      time: formatTime(new Date()),
    })
  } catch (err) {
    if ((err as { errMsg?: string }).errMsg?.includes('cancel')) return
    showToast({ title: '扫码失败', icon: 'none' })
  } finally {
    scanning.value = false
  }
}
</script>

<style lang="less">
.page-verify {
  background: #f8f8f8;
  min-height: 100vh;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
}
.intro { text-align: center; padding: 80rpx 32rpx 48rpx; box-sizing: border-box; }
.icon { font-size: 100rpx; }
.title { margin-top: 16rpx; font-size: 36rpx; font-weight: 600; }
.desc { margin-top: 8rpx; font-size: 26rpx; color: #999; }
.page-actions {
  padding: 0 32rpx;
  box-sizing: border-box;
}
.action-btn {
  width: 100%;
  max-width: 100%;
  border-radius: 48rpx;
  height: 100rpx;
  font-size: 32rpx;
  box-sizing: border-box;
}
.tip {
  margin: 24rpx 32rpx 0;
  font-size: 24rpx;
  color: #bbb;
  line-height: 1.5;
  text-align: center;
  box-sizing: border-box;
}
.history { margin-top: 48rpx; padding: 0 32rpx; box-sizing: border-box; }
.section-title { font-size: 28rpx; font-weight: 600; margin-bottom: 16rpx; }
.record-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 2rpx solid #f5f5f5;
}
.order-no { font-size: 26rpx; color: #333; }
.order-hint { margin-top: 4rpx; font-size: 22rpx; color: #999; }
.time { font-size: 22rpx; color: #999; flex-shrink: 0; margin-left: 16rpx; }
</style>
