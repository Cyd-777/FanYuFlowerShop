<template>
  <view class="wiki-article-body wiki-prose">
    <WikiDataText
      v-for="(paragraph, index) in paragraphs"
      :key="index"
      :text="paragraph"
      :source="resolveSource(index)"
      :inline="false"
      extra-class="wiki-article-body__paragraph"
    />
  </view>
</template>

<script setup lang="ts">
import WikiDataText from '@/components/wiki/WikiDataText.vue'

const props = defineProps<{
  paragraphs: string[]
  /** 段落来源前缀，如 language.paragraphs → language.paragraphs[0] */
  sourcePrefix?: string
  sources?: string[]
}>()

function resolveSource(index: number): string | undefined {
  if (props.sources?.[index]) return props.sources[index]
  if (props.sourcePrefix) return `${props.sourcePrefix}[${index}]`
  return undefined
}
</script>

<style lang="less">
.wiki-article-body {
  display: block;
}

.wiki-article-body__paragraph {
  display: block;
  font-size: 28rpx;
  color: #444;
  line-height: 1.85;
  text-align: justify;

  .wiki-data-text--block + .wiki-data-text--block &,
  .wiki-data-text--block + .wiki-data-text--block {
    margin-top: 20rpx;
  }
}

.wiki-article-body .wiki-data-text--block + .wiki-data-text--block {
  margin-top: 20rpx;
}
</style>
