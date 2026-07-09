<template>
  <view class="wiki-atlas-intro">
    <block v-for="(segment, index) in segments" :key="index">
      <WikiDataText
        v-if="segment.kind === 'text'"
        :text="segment.text"
        :source="segment.source"
        extra-class="wiki-atlas-intro__plain"
      />
      <view v-else-if="segment.kind === 'break'" class="wiki-atlas-intro__break" />
      <WikiDataText
        v-else-if="segment.kind === 'marker' && segment.type === 'commonNames'"
        :text="formatValues(segment.values)"
        :source="segment.source"
        extra-class="wiki-atlas-intro__mark wiki-atlas-intro__mark--names"
      />
      <WikiDataText
        v-else-if="segment.kind === 'marker'"
        :text="markerValue(segment)"
        :source="segment.source"
        :extra-class="`wiki-atlas-intro__mark ${markClass(segment.type)}`"
      />
    </block>
  </view>
</template>

<script setup lang="ts">
import WikiDataText from '@/components/wiki/WikiDataText.vue'
import type { WikiIntroMarkerKind, WikiIntroSegment } from '@/types/wiki'

defineProps<{
  segments: WikiIntroSegment[]
}>()

function formatValues(values?: string[]): string {
  return (values || []).filter(Boolean).join('、')
}

function markerValue(segment: Extract<WikiIntroSegment, { kind: 'marker' }>): string {
  if (segment.type === 'commonNames') return formatValues(segment.values)
  return segment.value || ''
}

function markClass(type: WikiIntroMarkerKind): string {
  return `wiki-atlas-intro__mark--${type}`
}
</script>

<style lang="less">
@import '@/styles/tokens.less';
.wiki-atlas-intro {
  display: block;
  font-size: 28rpx;
  color: #444;
  line-height: 1.85;
  word-break: break-all;
}

.wiki-atlas-intro__plain {
  color: #444;
}

.wiki-atlas-intro__break {
  display: block;
  height: 0;
  margin-top: 0.75em;
}

.wiki-atlas-intro__mark {
  font-size: inherit;
  font-weight: 700;
}

.wiki-atlas-intro__mark--taxonomy {
  color: @color-success;
}

.wiki-atlas-intro__mark--group {
  color: @color-link;
  font-weight: 700;
}

.wiki-atlas-intro__mark--region {
  color: @color-tag-purple;
  font-weight: 700;
}

.wiki-atlas-intro__mark--names {
  color: @color-warning;
  font-weight: 600;
}

.wiki-atlas-intro__mark--scientificName {
  color: @color-wiki-gray;
  font-style: italic;
  font-weight: 400;
}

.wiki-atlas-intro__mark--feature {
  color: @color-danger;
  background: rgba(255, 235, 59, 0.35);
  font-weight: 700;
}
</style>
