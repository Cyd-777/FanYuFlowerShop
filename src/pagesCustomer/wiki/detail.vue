<template>
  <view class="page-wiki-detail">
    <view v-if="loading" class="loading-wrap">
      <nut-skeleton rows="8" animated />
    </view>

    <template v-else-if="wiki">
      <view class="hero">
        <view class="hero-icon">{{ wiki.icon }}</view>
        <view class="hero-name">{{ displayName }}</view>
        <view class="hero-kind">{{ displaySubtitle }}</view>
      </view>

      <view class="section-tabs">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="section-tab"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </view>
      </view>

      <view class="section-body">
        <template v-if="activeTab === 'atlas'">
          <view class="block-title">图鉴简介</view>
          <view class="block-text">{{ wiki.atlas.summary || emptySectionText }}</view>
          <view v-if="wiki.atlas.features?.length" class="block-title">形态特征</view>
          <view v-for="(item, idx) in wiki.atlas.features || []" :key="idx" class="tag-item">
            {{ item }}
          </view>
          <view class="info-row">
            <text class="info-label">花期</text>
            <text class="info-value">{{ wiki.atlas.bloomSeason || '—' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">产地</text>
            <text class="info-value">{{ wiki.atlas.origin || '—' }}</text>
          </view>
        </template>

        <template v-else-if="activeTab === 'care'">
          <view class="block-title">养护概要</view>
          <view class="block-text">{{ wiki.careGuide.summary || emptySectionText }}</view>
          <view class="info-row">
            <text class="info-label">光照</text>
            <text class="info-value">{{ wiki.careGuide.light || '—' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">浇水</text>
            <text class="info-value">{{ wiki.careGuide.water || '—' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">土壤</text>
            <text class="info-value">{{ wiki.careGuide.soil || '—' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">温度</text>
            <text class="info-value">{{ wiki.careGuide.temperature || '—' }}</text>
          </view>
          <view v-if="wiki.careGuide.tips?.length" class="block-title">养护贴士</view>
          <view v-for="(tip, idx) in wiki.careGuide.tips || []" :key="idx" class="tip-item">
            {{ tip }}
          </view>
        </template>

        <template v-else>
          <view class="block-title">花语概要</view>
          <view class="block-text">{{ wiki.language.summary || wiki.language.meaning || emptySectionText }}</view>
          <view class="info-row">
            <text class="info-label">核心花语</text>
            <text class="info-value">{{ wiki.language.meaning || '—' }}</text>
          </view>
          <view v-if="wiki.language.occasions?.length" class="block-title">适用场景</view>
          <view v-for="(item, idx) in wiki.language.occasions || []" :key="idx" class="tag-item">
            {{ item }}
          </view>
          <view v-if="wiki.language.colorMeanings?.length" class="block-title">色彩寓意</view>
          <view
            v-for="(item, idx) in wiki.language.colorMeanings || []"
            :key="idx"
            class="color-item"
          >
            <text class="color-name">{{ item.color }}</text>
            <text class="color-meaning">{{ item.meaning }}</text>
          </view>
        </template>
      </view>

      <view class="cloud-footnote">智库 ID：{{ wiki._id }}</view>
    </template>

    <nut-empty v-else :description="notFoundText" />
  </view>
</template>

<script setup lang="ts">
import { usePageData } from '@/composables/usePageData'

const {
  emptySectionText,
  notFoundText,
  tabs,
  activeTab,
  loading,
  wiki,
  displayName,
  displaySubtitle,
} = usePageData()
</script>

<style lang="less">
.page-wiki-detail {
  min-height: 100vh;
  padding-bottom: 48rpx;
  background: #f8f8f8;
}
.loading-wrap {
  padding: 24rpx;
}
.hero {
  padding: 48rpx 32rpx 32rpx;
  background: linear-gradient(180deg, #fff5f5 0%, #f8f8f8 100%);
  text-align: center;
}
.hero-icon {
  font-size: 88rpx;
  line-height: 1;
}
.hero-name {
  margin-top: 16rpx;
  font-size: 40rpx;
  font-weight: 700;
  color: #333;
}
.hero-kind {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #e53935;
}
.section-tabs {
  display: flex;
  margin: 0 24rpx 16rpx;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}
.section-tab {
  flex: 1;
  text-align: center;
  padding: 20rpx 8rpx;
  font-size: 24rpx;
  color: #666;
  &.active {
    color: #e53935;
    font-weight: 600;
    background: #fff5f5;
  }
}
.section-body {
  margin: 0 24rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 16rpx;
}
.block-title {
  margin-top: 8rpx;
  margin-bottom: 12rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}
.block-text {
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
  margin-bottom: 16rpx;
}
.info-row {
  display: flex;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
  font-size: 26rpx;
}
.info-label {
  width: 140rpx;
  color: #999;
  flex-shrink: 0;
}
.info-value {
  flex: 1;
  color: #333;
  line-height: 1.5;
}
.tag-item,
.tip-item {
  display: inline-block;
  margin: 0 12rpx 12rpx 0;
  padding: 8rpx 20rpx;
  background: #f5f5f5;
  border-radius: 24rpx;
  font-size: 24rpx;
  color: #666;
}
.tip-item {
  display: block;
  border-radius: 12rpx;
}
.color-item {
  display: flex;
  padding: 12rpx 0;
  font-size: 26rpx;
  border-bottom: 1rpx solid #f5f5f5;
}
.color-name {
  width: 80rpx;
  color: #e53935;
  font-weight: 600;
}
.color-meaning {
  flex: 1;
  color: #666;
}
.cloud-footnote {
  margin: 24rpx;
  text-align: center;
  font-size: 20rpx;
  color: #bbb;
  word-break: break-all;
}
</style>
