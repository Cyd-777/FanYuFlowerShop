<template>
  <view class="page-verify">
    <AppNavBar />
    <view class="intro">
      <view class="icon">📱</view>
      <view class="title">{{ uiText_a0a954 }}</view>
      <view class="desc">{{ uiText_be7335 }}</view>
    </view>

    <view class="page-actions">
      <nut-button type="primary" block class="action-btn" :loading="scanning" @click="scan">
        开始扫码
      </nut-button>
    </view>

    <view v-if="lastResult" class="result-card">
      <view class="result-status" :class="{ success: lastSuccess, fail: !lastSuccess }">
        {{ lastSuccess ? '✅ 核销成功' : '❌ 核销失败' }}
      </view>
      <view class="result-msg">{{ lastResult }}</view>
    </view>

    <view v-if="records.length" class="history">
      <view class="section-title">{{ verifyHistoryTitleText }}</view>
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
import { ref } from 'vue'
import { scanAndVerifyPickup } from '@/utils/pickupVerifyScan'

const uiText_a0a954 = '扫码核销'
const uiText_be7335 = '扫描顾客出示的取货码，确认门店自提'
const verifyHistoryTitleText = '核销记录'

interface VerifyRecord {
  label: string
  orderHint: string
  time: string
}

const records = ref<VerifyRecord[]>([])
const scanning = ref(false)
const lastResult = ref('')
const lastSuccess = ref(false)

function formatTime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

async function scan() {
  scanning.value = true
  lastResult.value = ''
  try {
    const result = await scanAndVerifyPickup()
    if (!result.message) return
    lastResult.value = result.message
    lastSuccess.value = result.success
  } finally {
    scanning.value = false
    if (lastResult.value) {
      records.value.unshift({
        label: lastSuccess.value ? '✅ 核销成功' : '❌ 核销失败',
        orderHint: lastResult.value,
        time: formatTime(new Date()),
      })
    }
  }
}
</script>

<style lang="less">
.page-verify { background: #f8f8f8; min-height: 100vh; box-sizing: border-box; width: 100%; max-width: 100%; }
.intro { text-align: center; padding: 80rpx 32rpx 48rpx; box-sizing: border-box; }
.icon { font-size: 100rpx; }
.title { margin-top: 16rpx; font-size: 36rpx; font-weight: 600; }
.desc { margin-top: 8rpx; font-size: 26rpx; color: #999; }
.page-actions { padding: 0 32rpx; box-sizing: border-box; }
.action-btn { width: 100%; max-width: 100%; border-radius: 48rpx; height: 100rpx; font-size: 32rpx; box-sizing: border-box; }

.result-card {
  margin: 24rpx 32rpx 0; padding: 24rpx; border-radius: 16rpx;
  background: #fff; text-align: center;
}
.result-status { font-size: 32rpx; font-weight: 600; &.success { color: #2e7d32; } &.fail { color: #c62828; } }
.result-msg { margin-top: 8rpx; font-size: 24rpx; color: #666; }

.history { margin-top: 48rpx; padding: 0 32rpx; box-sizing: border-box; }
.section-title { font-size: 28rpx; font-weight: 600; margin-bottom: 16rpx; }
.record-item { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; border-bottom: 2rpx solid #f5f5f5; }
.order-no { font-size: 26rpx; color: #333; }
.order-hint { margin-top: 4rpx; font-size: 22rpx; color: #999; }
.time { font-size: 22rpx; color: #999; flex-shrink: 0; margin-left: 16rpx; }
</style>
