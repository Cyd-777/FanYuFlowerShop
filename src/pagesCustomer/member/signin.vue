<template>
  <view class="page-signin">
    <AppNavBar />
    <view class="calendar">
      <view class="month">{{ currentMonth }}</view>
      <view class="days">
        <view v-for="(day, idx) in days" :key="idx"
          :class="['day', { signed: day.signed, today: day.isToday }]">
          <text class="day-num">{{ day.num }}</text>
          <text class="day-check" v-if="day.signed">✅</text>
        </view>
      </view>
    </view>
    <nut-button type="primary" block class="signin-btn" :disabled="signedToday" @click="doSignin">
      {{ signedToday ? '今日已签到' : '签到 +5 积分' }}
    </nut-button>
    <view class="rules">
      <view class="title">签到规则</view>
      <view class="rule">每日签到可获得 5 积分</view>
      <view class="rule">连续签到 7 天额外奖励 20 积分</view>
      <view class="rule">连续签到 30 天额外奖励 100 积分</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { showToast } from '@/utils/feedback'
import { ref, computed } from 'vue'

const signedToday = ref(false)

const currentMonth = computed(() => '2026年6月')

const days = ref(
  Array.from({ length: 30 }, (_, i) => ({
    num: i + 1,
    signed: i < 3,
    isToday: i + 1 === 16,
  }))
)

function doSignin() {
  showToast({ title: '签到成功 +5积分', icon: 'success' })
  signedToday.value = true
}
</script>

<style lang="less">
.page-signin { background: #f8f8f8; min-height: 100vh; }
.calendar { background: #fff; margin: 32rpx; border-radius: 24rpx; padding: 32rpx; }
.month { text-align: center; font-size: 32rpx; font-weight: 600; margin-bottom: 24rpx; }
.days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8rpx; }
.day {
  text-align: center; padding: 12rpx 0; border-radius: 50%;
  &.signed { background: #fce4ec; }
  &.today { border: 2rpx solid #e53935; }
  .day-num { font-size: 28rpx; color: #333; display: block; }
  .day-check { font-size: 20rpx; }
}
.signin-btn { margin: 0 32rpx; border-radius: 48rpx; }
.rules { background: #fff; margin: 32rpx; border-radius: 24rpx; padding: 32rpx; }
.title { font-size: 28rpx; font-weight: 600; margin-bottom: 16rpx; }
.rule { font-size: 24rpx; color: #999; padding: 8rpx 0; }
</style>
