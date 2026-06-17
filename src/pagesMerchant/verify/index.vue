<template>
  <view class="page-verify">
    <view class="intro">
      <view class="icon">📱</view>
      <view class="title">扫码核销</view>
      <view class="desc">扫描顾客出示的身份码，确认提货身份</view>
    </view>

    <nut-button type="primary" block class="scan-btn" :loading="scanning" @click="scan">
      开始扫码
    </nut-button>

    <view class="history" v-if="records.length">
      <view class="section-title">核销记录</view>
      <view v-for="(r, idx) in records" :key="idx" class="record-item">
        <view class="record-main">
          <view class="order-no">{{ r.label }}</view>
          <view class="openid-hint">{{ r.openidHint }}</view>
        </view>
        <view class="time">{{ r.time }}</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { parseIdentityQr } from '@/utils/identity'

interface VerifyRecord {
  label: string
  openidHint: string
  time: string
}

const records = ref<VerifyRecord[]>([])
const scanning = ref(false)

function maskOpenid(openid: string) {
  if (openid.length <= 8) return openid
  return `${openid.slice(0, 4)}...${openid.slice(-4)}`
}

function formatTime(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

async function scan() {
  scanning.value = true
  try {
    const res = await wx.scanCode({ scanType: ['qrCode'] })
    const openid = parseIdentityQr(res.result)

    if (!openid) {
      wx.showToast({ title: '无法识别的身份码', icon: 'none' })
      return
    }

    const { confirm } = await new Promise<{ confirm: boolean }>((resolve) => {
      wx.showModal({
        title: '确认核销',
        content: `确认该顾客身份（${maskOpenid(openid)}）已完成提货？`,
        success: (r) => resolve({ confirm: r.confirm }),
      })
    })

    if (!confirm) return

    // 后续对接订单云函数，当前记录本地核销
    records.value.unshift({
      label: '身份核销',
      openidHint: maskOpenid(openid),
      time: formatTime(new Date()),
    })

    wx.showToast({ title: '核销成功', icon: 'success' })
  } catch (err) {
    if ((err as { errMsg?: string }).errMsg?.includes('cancel')) return
    wx.showToast({ title: '扫码失败', icon: 'none' })
  } finally {
    scanning.value = false
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
.record-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 2rpx solid #f5f5f5;
}
.order-no { font-size: 26rpx; color: #333; }
.openid-hint { margin-top: 4rpx; font-size: 22rpx; color: #999; }
.time { font-size: 22rpx; color: #999; flex-shrink: 0; margin-left: 16rpx; }
</style>
