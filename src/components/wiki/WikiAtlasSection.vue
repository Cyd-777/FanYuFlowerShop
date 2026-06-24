<template>
  <view class="wiki-section">
    <WikiFieldSlot
      anchor-id="wiki-anchor-taxonomy"
      label="生物学分类"
      :empty="!fields.taxonomyRows.length"
      :highlight="highlightAnchor === 'wiki-anchor-taxonomy'"
    >
      <view class="wiki-taxonomy-rows">
        <view v-for="row in fields.taxonomyRows" :key="row.label" class="wiki-taxonomy-row">
          <text class="wiki-taxonomy-label">{{ row.label }}</text>
          <text class="wiki-text">{{ row.value }}</text>
        </view>
      </view>
    </WikiFieldSlot>

    <WikiFieldSlot
      anchor-id="wiki-anchor-names"
      label="名称"
      :empty="!fields.scientificName && !fields.commonNames"
      :highlight="highlightAnchor === 'wiki-anchor-names'"
    >
      <view v-if="fields.scientificName" class="wiki-name-row">
        <text class="wiki-name-label">学名</text>
        <text class="wiki-text wiki-text--name">{{ fields.scientificName }}</text>
      </view>
      <view v-if="fields.commonNames" class="wiki-name-row">
        <text class="wiki-name-label">俗名</text>
        <text class="wiki-text">{{ fields.commonNames }}</text>
      </view>
    </WikiFieldSlot>

    <WikiFieldSlot
      anchor-id="wiki-anchor-atlas"
      label="图鉴简介"
      :empty="!fields.summary"
      :highlight="highlightAnchor === 'wiki-anchor-atlas'"
    >
      <text class="wiki-text">{{ fields.summary }}</text>
    </WikiFieldSlot>

    <WikiFieldSlot label="形态特征" :empty="!fields.features.length">
      <view class="wiki-tags">
        <text v-for="(item, idx) in fields.features" :key="idx" class="wiki-tag">{{ item }}</text>
      </view>
    </WikiFieldSlot>

    <WikiFieldSlot
      label="能开多久"
      anchor-id="wiki-anchor-bloom"
      :empty="!fields.vaseLife"
      :highlight="highlightAnchor === 'wiki-anchor-bloom'"
    >
      <text class="wiki-text">{{ fields.vaseLife }}</text>
      <text v-if="fields.vaseNote" class="wiki-text wiki-text--secondary">{{ fields.vaseNote }}</text>
    </WikiFieldSlot>

    <WikiFieldSlot label="自然花期" :empty="!fields.soilBloom">
      <text class="wiki-text">{{ fields.soilBloom }}</text>
      <text v-if="fields.soilNote" class="wiki-text wiki-text--secondary">{{ fields.soilNote }}</text>
    </WikiFieldSlot>

    <WikiFieldSlot label="产地" :empty="!fields.origin">
      <text class="wiki-text">{{ fields.origin }}</text>
    </WikiFieldSlot>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WikiFieldSlot from '@/components/WikiFieldSlot.vue'
import type { FlowerWiki } from '@/types/wiki'
import { resolveWikiAtlas } from '@/types/wiki'

const props = defineProps<{
  wiki: FlowerWiki
  highlightAnchor?: string
}>()

const fields = computed(() => resolveWikiAtlas(props.wiki))
</script>

<style lang="less">
.wiki-section {
  padding-bottom: 8rpx;
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
.wiki-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.wiki-tag {
  padding: 8rpx 20rpx;
  background: #f5f5f5;
  border-radius: 24rpx;
  font-size: 24rpx;
  color: #666;
}
.wiki-taxonomy-rows {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.wiki-taxonomy-row {
  display: flex;
  gap: 16rpx;
  align-items: flex-start;
}
.wiki-taxonomy-label {
  flex-shrink: 0;
  width: 40rpx;
  font-size: 24rpx;
  color: #999;
  line-height: 1.6;
}
.wiki-name-row {
  display: flex;
  gap: 16rpx;
  align-items: flex-start;
  & + & {
    margin-top: 12rpx;
  }
}
.wiki-name-label {
  flex-shrink: 0;
  width: 64rpx;
  font-size: 24rpx;
  color: #999;
  line-height: 1.6;
}
.wiki-text--name {
  font-style: italic;
}
</style>
