<template>
  <view class="wiki-answer-card" @tap="onTap">
    <view class="wiki-answer-head">
      <text class="wiki-answer-badge">{{ badgeText }}</text>
      <text class="wiki-answer-title">{{ answer.title }}</text>
    </view>
    <view class="wiki-answer-body">{{ answer.answer }}</view>
    <view v-if="answer.note" class="wiki-answer-note">{{ answer.note }}</view>
    <view class="wiki-answer-foot">
      <text class="wiki-answer-link">{{ detailLinkText }}</text>
      <text class="wiki-answer-arrow">›</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { WikiAnswerSnippet } from '@/types/search'
import { navigateTo } from '@/utils/router'

const badgeText = '百科速答'
const detailLinkText = '查看词条详情'

const props = defineProps<{
  answer: WikiAnswerSnippet
}>()

function onTap() {
  if (!props.answer.detailUrl) return
  navigateTo({ url: props.answer.detailUrl })
}
</script>

<style lang="less">
.wiki-answer-card {
  box-sizing: border-box;
  max-width: 100%;
  margin-bottom: 16rpx;
  padding: 24rpx;
  background: linear-gradient(180deg, #fff8f8 0%, #fff 100%);
  border: 1rpx solid #ffe0e0;
  border-radius: 16rpx;
}

.wiki-answer-head {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.wiki-answer-badge {
  align-self: flex-start;
  padding: 4rpx 12rpx;
  font-size: 20rpx;
  color: #e53935;
  background: #fff0f0;
  border-radius: 8rpx;
}

.wiki-answer-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.wiki-answer-body {
  margin-top: 16rpx;
  font-size: 32rpx;
  line-height: 1.5;
  color: #222;
}

.wiki-answer-note {
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.5;
  color: #888;
}

.wiki-answer-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 20rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f5e8e8;
}

.wiki-answer-link {
  font-size: 24rpx;
  color: #e53935;
}

.wiki-answer-arrow {
  margin-left: 4rpx;
  font-size: 32rpx;
  color: #e53935;
}
</style>
