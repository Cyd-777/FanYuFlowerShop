<template>
  <view class="page-points">
    <AppNavBar />
    <view class="total-card">
      <view class="label">{{ uiText_701a03 }}</view>
      <view class="value">{{ points }}</view>
    </view>
    <view class="list">
      <view v-for="(log, idx) in logs" :key="idx" class="log-item">
        <view class="log-left">
          <view class="log-desc">{{ log.desc }}</view>
          <view class="log-time">{{ log.time }}</view>
        </view>
        <view :class="['log-points', log.type]">{{ log.type === 'income' ? '+' : '-' }}{{ log.amount }}</view>
      </view>
    </view>
    <nut-empty description="暂无记录" v-if="!logs.length" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const uiText_701a03 = '当前积分'

const points = ref(120)
const logs = ref<{ desc: string; time: string; type: string; amount: number }[]>([])
</script>

<style lang="less">
.page-points { background: #f8f8f8; min-height: 100vh; }
.total-card {
  background: #fff; padding: 48rpx; text-align: center;
  .label { font-size: 26rpx; color: #999; }
  .value { font-size: 64rpx; font-weight: 700; color: #e53935; margin-top: 8rpx; }
}
.log-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 24rpx 32rpx; background: #fff; border-bottom: 2rpx solid #f5f5f5;
  .log-desc { font-size: 26rpx; color: #333; }
  .log-time { font-size: 22rpx; color: #ccc; margin-top: 4rpx; }
  .log-points { font-size: 28rpx; font-weight: 600; &.income { color: #e53935; } &.expense { color: #999; } }
}
</style>
