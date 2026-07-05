<template>
  <view class="wiki-entry-panel surface-card">
    <view class="wiki-entry-head">
      <text class="wiki-entry-icon">{{ wiki.icon }}</text>
      <view class="wiki-entry-titles">
        <view class="wiki-entry-name">{{ displayName }}</view>
        <view v-if="displaySubtitle" class="wiki-entry-sub">{{ displaySubtitle }}</view>
        <view v-if="scientificName" class="wiki-entry-scientific">{{ scientificName }}</view>
      </view>
    </view>

    <!-- 精简摘要：养护提示 + 花语（两行以内） -->
    <view class="wiki-entry-summary">
      <view v-if="careSummary" class="summary-row">
        <text class="summary-label">{{ careLabelText }}</text>
        <text class="summary-text">{{ careSummary }}</text>
      </view>
      <view v-if="languageSummary" class="summary-row">
        <text class="summary-label">{{ languageLabelText }}</text>
        <text class="summary-text">{{ languageSummary }}</text>
      </view>
    </view>

    <view class="wiki-entry-foot" @tap="emit('open-full')">
      <text class="wiki-entry-foot-text">{{ openFullText }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FlowerWiki } from '@/types/wiki'
import { getWikiDisplayName, getWikiSubtitle } from '@/types/wiki'

const careLabelText = '🌱 养护'
const languageLabelText = '💬 花语'
const openFullText = '查看养护指南 ›'

const props = defineProps<{
  wiki: FlowerWiki
}>()

const emit = defineEmits<{
  'open-full': []
}>()

const displayName = computed(() => getWikiDisplayName(props.wiki))
const displaySubtitle = computed(() => getWikiSubtitle(props.wiki))
const scientificName = computed(() => props.wiki.names?.scientificName?.trim() || '')

/** 养护摘要：取 vaseLife 或浇水和日照的简短描述 */
const careSummary = computed(() => {
  const w = props.wiki
  if (w.careVase?.vaseLife) return `水养期约 ${w.careVase.vaseLife}`
  if (w.careVase?.waterChange) return w.careVase.waterChange
  if (w.careSoil?.watering) return w.careSoil.watering
  return ''
})

/** 花语摘要 */
const languageSummary = computed(() => {
  const w = props.wiki
  if (w.language?.meaning) return w.language.meaning
  if (w.language?.giftScenario) return w.language.giftScenario
  return ''
})
</script>

<style lang="less">
.wiki-entry-panel {
  margin: 16rpx 24rpx 0;
  padding: 24rpx;
  border: 2rpx solid #fce4ec;
}

.wiki-entry-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.wiki-entry-icon {
  width: 72rpx; height: 72rpx; line-height: 72rpx; text-align: center;
  font-size: 36rpx; background: #fff5f5; border-radius: 12rpx; flex-shrink: 0;
}

.wiki-entry-titles { flex: 1; min-width: 0; }
.wiki-entry-name { font-size: 30rpx; font-weight: 600; color: #333; }
.wiki-entry-sub { margin-top: 4rpx; font-size: 22rpx; color: #e53935; }
.wiki-entry-scientific { margin-top: 4rpx; font-size: 22rpx; font-style: italic; color: #888; }

.wiki-entry-summary {
  background: #fafafa;
  border-radius: 12rpx;
  padding: 16rpx;
}

.summary-row {
  display: flex;
  gap: 8rpx;
  font-size: 24rpx;
  line-height: 1.5;
  & + & { margin-top: 8rpx; }
}

.summary-label {
  color: #888;
  flex-shrink: 0;
  white-space: nowrap;
}

.summary-text {
  color: #555;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wiki-entry-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 16rpx;
  padding-top: 14rpx;
  border-top: 1rpx solid #f5e8e8;
}

.wiki-entry-foot-text {
  font-size: 24rpx;
  color: #e53935;
}
</style>
