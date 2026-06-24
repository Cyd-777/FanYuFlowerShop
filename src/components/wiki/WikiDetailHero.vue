<template>
  <view class="wiki-detail-hero">
    <view class="wiki-detail-hero-icon">{{ wiki.icon }}</view>
    <view class="wiki-detail-hero-name">{{ displayName }}</view>
    <view v-if="displaySubtitle" class="wiki-detail-hero-kind">{{ displaySubtitle }}</view>
    <view v-if="scientificName" class="wiki-detail-hero-scientific">{{ scientificName }}</view>
    <view class="wiki-detail-hero-meta">
      <text class="wiki-detail-hero-chip">{{ plantFormLabel }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FlowerWiki } from '@/types/wiki'
import { getWikiDisplayName, getWikiPlantFormLabel, getWikiSubtitle } from '@/types/wiki'

const props = defineProps<{
  wiki: FlowerWiki
}>()

const displayName = computed(() => getWikiDisplayName(props.wiki))
const displaySubtitle = computed(() => getWikiSubtitle(props.wiki))
const scientificName = computed(() => props.wiki.names?.scientificName?.trim() || '')
const plantFormLabel = computed(() => getWikiPlantFormLabel(props.wiki.plantForm))
</script>

<style lang="less">
.wiki-detail-hero {
  padding: 48rpx 32rpx 32rpx;
  background: linear-gradient(180deg, #fff5f5 0%, #f8f8f8 100%);
  text-align: center;
}

.wiki-detail-hero-icon {
  font-size: 88rpx;
  line-height: 1;
}

.wiki-detail-hero-name {
  margin-top: 16rpx;
  font-size: 40rpx;
  font-weight: 700;
  color: #333;
}

.wiki-detail-hero-kind {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #e53935;
}

.wiki-detail-hero-scientific {
  margin-top: 8rpx;
  font-size: 24rpx;
  font-style: italic;
  color: #888;
}

.wiki-detail-hero-meta {
  margin-top: 16rpx;
}

.wiki-detail-hero-chip {
  display: inline-block;
  padding: 4rpx 16rpx;
  font-size: 20rpx;
  color: #667eea;
  background: rgba(102, 126, 234, 0.12);
  border-radius: 999rpx;
}
</style>
