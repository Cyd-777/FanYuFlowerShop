<template>
  <view class="wiki-section">
    <view
      v-if="showVase"
      id="wiki-anchor-careVase"
      class="wiki-section-group"
      :class="{ 'wiki-section-group--highlight': highlightAnchor === 'wiki-anchor-careVase' }"
    >
      <view class="wiki-section-group__title">怎么养（插瓶）</view>

      <WikiFieldSlot label="概要" :empty="!vase.summary">
        <text class="wiki-text">{{ vase.summary }}</text>
      </WikiFieldSlot>
      <WikiFieldSlot label="能开多久" :empty="!vase.vaseLife">
        <text class="wiki-text">{{ vase.vaseLife }}</text>
        <text v-if="vase.vaseLifeNote" class="wiki-text wiki-text--secondary">{{ vase.vaseLifeNote }}</text>
      </WikiFieldSlot>
      <WikiFieldSlot label="怎么换水" :empty="!vase.waterChange">
        <text class="wiki-text">{{ vase.waterChange }}</text>
      </WikiFieldSlot>
      <WikiFieldSlot label="修剪" :empty="!vase.trim">
        <text class="wiki-text">{{ vase.trim }}</text>
      </WikiFieldSlot>
      <WikiFieldSlot label="水深" :empty="!vase.waterDepth">
        <text class="wiki-text">{{ vase.waterDepth }}</text>
      </WikiFieldSlot>
      <WikiFieldSlot label="摆放" :empty="!vase.environment">
        <text class="wiki-text">{{ vase.environment }}</text>
      </WikiFieldSlot>
      <WikiFieldSlot label="小贴士" :empty="!vase.tips.length">
        <view class="wiki-tips">
          <text v-for="(tip, idx) in vase.tips" :key="idx" class="wiki-tip">{{ tip }}</text>
        </view>
      </WikiFieldSlot>
    </view>

    <view
      v-if="showSoil"
      id="wiki-anchor-careSoil"
      class="wiki-section-group wiki-section-group--secondary"
      :class="{ 'wiki-section-group--highlight': highlightAnchor === 'wiki-anchor-careSoil' }"
    >
      <view class="wiki-section-group__title">土培参考</view>

      <WikiFieldSlot label="概要" :empty="!soil.summary">
        <text class="wiki-text">{{ soil.summary }}</text>
      </WikiFieldSlot>
      <WikiFieldSlot label="光照" :empty="!soil.light">
        <text class="wiki-text">{{ soil.light }}</text>
      </WikiFieldSlot>
      <WikiFieldSlot label="浇水" :empty="!soil.water">
        <text class="wiki-text">{{ soil.water }}</text>
      </WikiFieldSlot>
      <WikiFieldSlot label="土壤" :empty="!soil.soil">
        <text class="wiki-text">{{ soil.soil }}</text>
      </WikiFieldSlot>
      <WikiFieldSlot label="温度" :empty="!soil.temperature">
        <text class="wiki-text">{{ soil.temperature }}</text>
      </WikiFieldSlot>
      <WikiFieldSlot label="小贴士" :empty="!soil.tips.length">
        <view class="wiki-tips">
          <text v-for="(tip, idx) in soil.tips" :key="idx" class="wiki-tip">{{ tip }}</text>
        </view>
      </WikiFieldSlot>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WikiFieldSlot from '@/components/WikiFieldSlot.vue'
import type { FlowerWiki } from '@/types/wiki'
import { hasWikiCareSoilContent, hasWikiCareVaseContent, resolveWikiCareSoil, resolveWikiCareVase } from '@/types/wiki'

const props = defineProps<{
  wiki: FlowerWiki
  highlightAnchor?: string
}>()

const vase = computed(() => resolveWikiCareVase(props.wiki))
const soil = computed(() => resolveWikiCareSoil(props.wiki))
const showVase = computed(() => hasWikiCareVaseContent(props.wiki))
const showSoil = computed(() => hasWikiCareSoilContent(props.wiki))
</script>

<style lang="less">
.wiki-section-group {
  margin-bottom: 32rpx;

  &--highlight {
    padding: 12rpx;
    margin-left: -12rpx;
    margin-right: -12rpx;
    border-radius: 12rpx;
    background: #fff8f8;
    box-shadow: 0 0 0 2rpx rgba(229, 57, 53, 0.12);
  }

  &--secondary .wiki-section-group__title {
    color: #888;
  }
}

.wiki-section-group__title {
  margin-bottom: 16rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.wiki-text {
  display: block;
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
  &--secondary {
    margin-top: 8rpx;
    color: #999;
    font-size: 24rpx;
  }
}

.wiki-tips {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.wiki-tip {
  padding: 12rpx 16rpx;
  background: #f8f8f8;
  border-radius: 12rpx;
  font-size: 24rpx;
  color: #666;
  line-height: 1.5;
}
</style>
