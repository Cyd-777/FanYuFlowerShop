<template>
  <view v-if="tags.length" class="wiki-kind-card-tags">
    <view
      v-for="tag in tags"
      :key="`${tag.kind}-${tag.label}`"
      class="wiki-kind-card-tag"
      :class="`wiki-kind-card-tag--${tag.kind}`"
    >
      <text class="wiki-kind-card-tag__text">{{ tag.label }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FlowerWikiListItem } from '@/types/wiki'
import { getWikiCardTags } from '@/utils/wikiCardTags'

const props = defineProps<{
  item: FlowerWikiListItem
}>()

const tags = computed(() => getWikiCardTags(props.item))
</script>

<style lang="less">
.wiki-kind-card-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 8rpx;
  margin-top: 12rpx;
  width: 100%;
}

.wiki-kind-card-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  max-width: 100%;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  box-sizing: border-box;
}

.wiki-kind-card-tag__text {
  font-size: 20rpx;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wiki-kind-card-tag--plant_form {
  color: @color-tag-brown;
  background: rgba(109, 76, 65, 0.1);

  .wiki-kind-card-tag__text {
    color: @color-tag-brown;
  }
}

.wiki-kind-card-tag--identity {
  color: @color-tag-blue-gray;
  background: @color-tag-bg;

  .wiki-kind-card-tag__text {
    color: @color-tag-blue-gray;
  }
}

.wiki-kind-card-tag--flower_form {
  color: @color-danger;
  background: rgba(198, 40, 40, 0.08);

  .wiki-kind-card-tag__text {
    color: @color-danger;
  }
}

.wiki-kind-card-tag--horticulture {
  color: @color-tag-indigo;
  background: rgba(92, 107, 192, 0.1);

  .wiki-kind-card-tag__text {
    color: @color-tag-indigo;
  }
}

.wiki-kind-card-tag--vase_life {
  color: @color-success;
  background: rgba(46, 125, 50, 0.1);

  .wiki-kind-card-tag__text {
    color: @color-success;
  }
}

.wiki-kind-card-tag--scent {
  color: @color-tag-purple;
  background: rgba(123, 31, 162, 0.1);

  .wiki-kind-card-tag__text {
    color: @color-tag-purple;
  }
}
</style>
