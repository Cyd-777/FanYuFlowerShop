<template>
  <view class="wiki-care-issues">
    <text class="wiki-care-issues__lead">{{ sectionTitle }}</text>
    <view
      v-for="(issue, idx) in issues"
      :key="idx"
      class="wiki-care-issue"
    >
      <WikiDataText
        class="wiki-care-issue__title-wrap"
        :text="issue.title"
        :source="`careVase.commonIssues[${idx}].title`"
        :inline="false"
        extra-class="wiki-care-issue__title"
      />
      <view v-if="issue.cause" class="wiki-care-issue__line">
        <text class="wiki-care-issue__label">{{ causeLabel }}</text>
        <WikiDataText
          :text="issue.cause"
          :source="`careVase.commonIssues[${idx}].cause`"
        />
      </view>
      <view v-if="issue.prevention" class="wiki-care-issue__line">
        <text class="wiki-care-issue__label">{{ preventionLabel }}</text>
        <WikiDataText
          :text="issue.prevention"
          :source="`careVase.commonIssues[${idx}].prevention`"
        />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import WikiDataText from '@/components/wiki/WikiDataText.vue'
import type { WikiCareCommonIssue } from '@/types/wiki'

defineProps<{
  issues: WikiCareCommonIssue[]
}>()

const sectionTitle = '常见现象 · 怎么防'
const causeLabel = '原因：'
const preventionLabel = '预防：'
</script>

<style lang="less">
.wiki-care-issues {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;
}

.wiki-care-issues__lead {
  display: block;
  font-size: 24rpx;
  font-weight: 600;
  color: #888;
}

.wiki-care-issue {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  padding: 14rpx 0;

  & + & {
    border-top: 1rpx solid #f5f5f5;
  }
}

.wiki-care-issue__title {
  font-size: 28rpx;
  font-weight: 600;
  color: #444;
  line-height: 1.5;
}

.wiki-care-issue__line {
  display: block;
  font-size: 26rpx;
  color: #666;
  line-height: 1.75;
}

.wiki-care-issue__label {
  color: #888;
  font-weight: 600;
}
</style>
