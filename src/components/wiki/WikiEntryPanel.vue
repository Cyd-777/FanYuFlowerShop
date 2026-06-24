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

    <WikiDetailContent v-model="activeTab" :wiki="wiki" compact />

    <view v-if="showFullLink" class="wiki-entry-foot" @tap="emit('open-full')">
      <text class="wiki-entry-foot-text">查看完整百科</text>
      <text class="wiki-entry-foot-arrow">›</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import WikiDetailContent from '@/components/wiki/WikiDetailContent.vue'
import type { FlowerWiki, WikiTab } from '@/types/wiki'
import { getWikiDisplayName, getWikiSubtitle } from '@/types/wiki'

const props = withDefaults(
  defineProps<{
    wiki: FlowerWiki
    defaultTab?: WikiTab
    showFullLink?: boolean
  }>(),
  {
    defaultTab: 'care',
    showFullLink: true,
  },
)

const emit = defineEmits<{
  'open-full': []
}>()

const activeTab = ref<WikiTab>(props.defaultTab)
const displayName = computed(() => getWikiDisplayName(props.wiki))
const displaySubtitle = computed(() => getWikiSubtitle(props.wiki))
const scientificName = computed(() => props.wiki.names?.scientificName?.trim() || '')
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
  margin-bottom: 20rpx;
}

.wiki-entry-icon {
  width: 72rpx;
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  font-size: 36rpx;
  background: #fff5f5;
  border-radius: 12rpx;
  flex-shrink: 0;
}

.wiki-entry-titles {
  flex: 1;
  min-width: 0;
}

.wiki-entry-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.wiki-entry-sub {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #e53935;
}

.wiki-entry-scientific {
  margin-top: 4rpx;
  font-size: 22rpx;
  font-style: italic;
  color: #888;
}

.wiki-entry-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 20rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f5e8e8;
}

.wiki-entry-foot-text {
  font-size: 24rpx;
  color: #e53935;
}

.wiki-entry-foot-arrow {
  margin-left: 4rpx;
  font-size: 28rpx;
  color: #e53935;
}
</style>
