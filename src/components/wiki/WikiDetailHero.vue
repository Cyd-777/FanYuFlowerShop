<template>
  <view class="wiki-detail-hero">
    <view class="wiki-detail-hero-icon">{{ wiki.icon }}</view>
    <WikiDataText
      class="wiki-detail-hero-name-wrap"
      :text="displayName"
      source="varietyName"
      :inline="false"
      extra-class="wiki-detail-hero-name"
    />
    <WikiDataText
      v-if="displaySubtitle"
      class="wiki-detail-hero-kind-wrap"
      :text="displaySubtitle"
      source="kindName"
      :inline="false"
      extra-class="wiki-detail-hero-kind"
    />
    <WikiDataText
      v-if="scientificName"
      class="wiki-detail-hero-scientific-wrap"
      :text="scientificName"
      source="names.scientificName"
      :inline="false"
      extra-class="wiki-detail-hero-scientific"
    />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WikiDataText from '@/components/wiki/WikiDataText.vue'
import type { FlowerWiki } from '@/types/wiki'
import { getWikiDisplayName, getWikiSubtitle } from '@/types/wiki'

const props = defineProps<{
  wiki: FlowerWiki
}>()

const displayName = computed(() => getWikiDisplayName(props.wiki))
const displaySubtitle = computed(() => getWikiSubtitle(props.wiki))
const scientificName = computed(() => props.wiki.names?.scientificName?.trim() || '')
</script>

<style lang="less">
.wiki-detail-hero {
  padding: 32rpx 32rpx 48rpx;
  min-height: 280rpx;
  background: linear-gradient(180deg, #fff5f5 0%, #fff 100%);
  text-align: center;
  box-sizing: border-box;
}

.wiki-detail-hero-icon {
  font-size: 88rpx;
  line-height: 1;
}

.wiki-detail-hero-name-wrap {
  display: block;
  margin-top: 16rpx;
}

.wiki-detail-hero-name {
  font-size: 40rpx;
  font-weight: 700;
  color: #333;
}

.wiki-detail-hero-kind-wrap {
  display: block;
  margin-top: 8rpx;
}

.wiki-detail-hero-kind {
  font-size: 24rpx;
  color: #e53935;
}

.wiki-detail-hero-scientific-wrap {
  display: block;
  margin-top: 8rpx;
}

.wiki-detail-hero-scientific {
  font-size: 24rpx;
  font-style: italic;
  color: #888;
}
</style>
