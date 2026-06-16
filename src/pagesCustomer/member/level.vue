<template>
  <view class="page-level">
    <view class="levels">
      <view v-for="(lv, idx) in levels" :key="idx" :class="['level-card', { current: idx === currentLevel }]">
        <view class="lv-icon">{{ lv.icon }}</view>
        <view class="lv-name">{{ lv.name }}</view>
        <view class="lv-condition">需 {{ lv.points }} 积分</view>
        <view class="lv-discount">{{ lv.discount }}折</view>
      </view>
    </view>
    <view class="benefits">
      <view class="title">等级权益</view>
      <view v-for="(b, idx) in benefits" :key="idx" class="benefit-item">{{ b }}</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const currentLevel = ref(0)
const levels = ref([
  { icon: '🌱', name: '普通会员', points: 0, discount: 10 },
  { icon: '🌸', name: '银卡会员', points: 200, discount: 9.5 },
  { icon: '🌹', name: '金卡会员', points: 500, discount: 9 },
  { icon: '💎', name: '钻石会员', points: 1000, discount: 8.5 },
])
const benefits = ref([
  '等级越高，折扣越大',
  '生日当月赠送双倍积分',
  '金卡及以上会员免配送费',
  '钻石会员专享新品优先预订',
])
</script>

<style lang="less">
.page-level { background: #f8f8f8; min-height: 100vh; padding: 32rpx; }
.levels { display: flex; gap: 16rpx; overflow-x: auto; padding-bottom: 16rpx; }
.level-card {
  flex-shrink: 0; width: 200rpx; background: #fff; border-radius: 16rpx;
  padding: 32rpx 16rpx; text-align: center; border: 2rpx solid transparent;
  &.current { border-color: #e53935; background: #fce4ec; }
  .lv-icon { font-size: 64rpx; }
  .lv-name { margin-top: 8rpx; font-size: 28rpx; font-weight: 600; }
  .lv-condition { margin-top: 4rpx; font-size: 22rpx; color: #999; }
  .lv-discount { margin-top: 12rpx; font-size: 40rpx; font-weight: 700; color: #e53935; }
}
.benefits { background: #fff; border-radius: 16rpx; padding: 32rpx; margin-top: 24rpx; }
.title { font-size: 28rpx; font-weight: 600; margin-bottom: 16rpx; }
.benefit-item { padding: 12rpx 0; font-size: 26rpx; color: #666; border-bottom: 2rpx solid #f5f5f5; }
</style>
