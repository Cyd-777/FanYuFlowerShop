<template>
  <view class="wiki-language-occasion">
    <text class="wiki-language-occasion__icon">{{ icon }}</text>
    <WikiDataText
      :text="label"
      :source="source"
      extra-class="wiki-language-occasion__text"
    />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WikiDataText from '@/components/wiki/WikiDataText.vue'
import { resolveWikiOccasionIcon } from '@/utils/wikiLanguageDisplay'

const props = defineProps<{
  label: string
  source?: string
}>()

const icon = computed(() => resolveWikiOccasionIcon(props.label))
</script>

<style lang="less">
@import '@/styles/tokens.less';
.wiki-language-occasion {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(229, 57, 53, 0.06);
}

.wiki-language-occasion__icon {
  font-size: 24rpx;
  line-height: 1;
}

.wiki-language-occasion__text {
  font-size: 24rpx;
  color: @color-danger;
  line-height: 1.3;
}
</style>
