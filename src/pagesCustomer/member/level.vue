<template>
  <view class="page-level">
    <view class="intro">会员等级以花卉命名，积分越高，花开越盛，礼遇越多。</view>

    <view class="levels">
      <view
        v-for="(lv, idx) in levels"
        :key="lv.id"
        :class="['level-card', { current: idx === currentLevelIndex }]"
      >
        <view class="lv-icon">{{ lv.icon }}</view>
        <view class="lv-name">{{ lv.name }}</view>
        <view class="lv-flower">{{ lv.flower }}</view>
        <view class="lv-condition">需 {{ lv.minPoints }} 积分</view>
        <view class="lv-discount">{{ formatDiscount(lv.discount) }}</view>
      </view>
    </view>

    <view class="benefits">
      <view class="title">等级权益</view>
      <view v-for="(item, idx) in benefits" :key="idx" class="benefit-item">{{ item }}</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  MEMBER_LEVELS,
  MEMBER_LEVEL_BENEFITS,
  resolveMemberLevelIndex,
  formatMemberDiscount,
} from '@/types/member'

const points = ref(120)

const levels = MEMBER_LEVELS
const benefits = MEMBER_LEVEL_BENEFITS
const currentLevelIndex = computed(() => resolveMemberLevelIndex(points.value))

function formatDiscount(discount: number) {
  return formatMemberDiscount(discount)
}
</script>

<style lang="less">
.page-level { background: #f8f8f8; min-height: 100vh; padding: 32rpx; }
.intro {
  margin-bottom: 24rpx;
  font-size: 26rpx;
  color: #666;
  line-height: 1.5;
}
.levels { display: flex; gap: 16rpx; overflow-x: auto; padding-bottom: 16rpx; }
.level-card {
  flex-shrink: 0; width: 200rpx; background: #fff; border-radius: 16rpx;
  padding: 32rpx 16rpx; text-align: center; border: 2rpx solid transparent;
  &.current { border-color: #e53935; background: #fce4ec; }
  .lv-icon { font-size: 64rpx; }
  .lv-name { margin-top: 8rpx; font-size: 28rpx; font-weight: 600; }
  .lv-flower { margin-top: 4rpx; font-size: 22rpx; color: #e53935; }
  .lv-condition { margin-top: 8rpx; font-size: 22rpx; color: #999; }
  .lv-discount { margin-top: 12rpx; font-size: 40rpx; font-weight: 700; color: #e53935; }
}
.benefits { background: #fff; border-radius: 16rpx; padding: 32rpx; margin-top: 24rpx; }
.title { font-size: 28rpx; font-weight: 600; margin-bottom: 16rpx; }
.benefit-item { padding: 12rpx 0; font-size: 26rpx; color: #666; border-bottom: 2rpx solid #f5f5f5; }
</style>
