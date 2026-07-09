<template>
  <view class="wiki-care-highlight" :class="rootClass">
    <view :class="contentWrapClass">
      <block v-for="(segment, index) in segments" :key="index">
        <text v-if="segment.kind === 'text'" class="wiki-care-highlight__plain">{{ segment.text }}</text>
        <text v-else class="wiki-care-highlight__value">{{ segment.text }}</text>
      </block>
    </view>
    <text v-if="showTag" class="wiki-data-text__tag wiki-data-text__tag--block">{{ source }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWikiLayoutDebug } from '@/composables/useWikiLayoutDebug'
import { splitWikiCareHighlightText } from '@/utils/wikiCareHighlight'

const props = withDefaults(
  defineProps<{
    text?: string
    tone?: 'default' | 'water' | 'muted'
    extraClass?: string
    block?: boolean
    source?: string
  }>(),
  {
    text: '',
    tone: 'default',
    extraClass: '',
    block: true,
    source: '',
  },
)

const { showWikiDataSourceLabels } = useWikiLayoutDebug()

const segments = computed(() => splitWikiCareHighlightText(props.text))

const showTag = computed(
  () => showWikiDataSourceLabels.value && String(props.source || '').trim().length > 0,
)

const rootClass = computed(() => [
  props.block ? 'wiki-care-highlight--block' : 'wiki-care-highlight--inline',
  props.tone !== 'default' ? `wiki-care-highlight--${props.tone}` : '',
  props.extraClass,
])

const contentWrapClass = computed(() =>
  showTag.value ? 'wiki-care-highlight__content wiki-care-highlight__content--marked' : 'wiki-care-highlight__content',
)
</script>

<style lang="less">
.wiki-care-highlight {
  font-size: inherit;
  color: inherit;
  line-height: inherit;
}

.wiki-care-highlight--block {
  display: block;
}

.wiki-care-highlight--inline {
  display: inline;
}

.wiki-care-highlight__content {
  display: inline;

  &--marked {
    border-bottom: 1rpx solid rgba(198, 40, 40, 0.45);
  }
}

.wiki-care-highlight__plain {
  color: inherit;
}

.wiki-care-highlight__value {
  font-weight: 700;
  color: @color-danger;
  background: rgba(255, 235, 238, 0.85);
  border-radius: 6rpx;
  padding: 0 6rpx;
}

.wiki-care-highlight--water .wiki-care-highlight__value {
  color: @color-link;
  background: rgba(227, 242, 253, 0.95);
}

.wiki-care-highlight--muted .wiki-care-highlight__plain {
  color: #777;
}

.wiki-care-highlight--muted .wiki-care-highlight__value {
  color: @color-primary;
}

.wiki-data-text__tag {
  font-size: 18rpx;
  line-height: 1.2;
  color: @color-danger;
  margin-left: 4rpx;
  opacity: 0.88;
  font-weight: 500;

  &--block {
    display: block;
    margin-left: 0;
    margin-top: 4rpx;
  }
}
</style>
