<template>
  <view class="page-member">
    <view class="member-card">
      <view class="level-icon">{{ levelInfo.icon }}</view>
      <view class="level-name">{{ levelInfo.name }}</view>
      <view class="points">{{ points }} 积分</view>
      <view class="progress-bar">
        <view class="progress-fill" :style="{ width: progress + '%' }" />
      </view>
      <view class="progress-text">距离下一级还差 {{ nextPoints }} 积分</view>
    </view>

    <view class="actions">
      <nut-cell title="积分明细" is-link @click="goPoints" />
      <nut-cell title="会员等级说明" is-link @click="goLevel" />
      <nut-cell title="每日签到" is-link @click="goSignin" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { navigateTo } from '@/utils/router'

const points = ref(120)
const nextPoints = ref(80)
const progress = ref(60)

const levelInfo = ref({ icon: '🌸', name: '银卡会员' })

function goPoints() { navigateTo({ url: '/pagesCustomer/member/points' }) }
function goLevel() { navigateTo({ url: '/pagesCustomer/member/level' }) }
function goSignin() { navigateTo({ url: '/pagesCustomer/member/signin' }) }
</script>

<style lang="less">
.page-member { background: #f8f8f8; min-height: 100vh; }
.member-card {
  margin: 32rpx; padding: 48rpx 32rpx; background: linear-gradient(135deg, #fce4ec, #f8bbd0);
  border-radius: 24rpx; text-align: center;
  .level-icon { font-size: 80rpx; }
  .level-name { margin-top: 16rpx; font-size: 36rpx; font-weight: 600; color: #333; }
  .points { margin-top: 8rpx; font-size: 28rpx; color: #666; }
  .progress-bar { margin-top: 24rpx; height: 12rpx; background: rgba(255,255,255,0.5); border-radius: 6rpx; overflow: hidden; }
  .progress-fill { height: 100%; background: #e53935; border-radius: 6rpx; }
  .progress-text { margin-top: 8rpx; font-size: 22rpx; color: #999; }
}
.actions { background: #fff; }
</style>
