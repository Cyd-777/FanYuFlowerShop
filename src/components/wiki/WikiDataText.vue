<template>
  <!-- 无标注：行内尽量保持纯 text，避免 custom 组件撑成块级 -->
  <text v-if="!showTag && inline" :class="contentClasses">{{ text }}</text>

  <!-- 有标注或非行内：view 包裹，小程序下划线/ tag 更稳定 -->
  <view
    v-else
    class="wiki-data-text"
    :class="inline ? 'wiki-data-text--inline' : 'wiki-data-text--block'"
  >
    <text class="wiki-data-text__content" :class="contentClasses">{{ text }}</text>
    <text v-if="showTag" class="wiki-data-text__tag" :class="{ 'wiki-data-text__tag--block': !inline }">
      {{ source }}
    </text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWikiLayoutDebug } from '@/composables/useWikiLayoutDebug'

const props = withDefaults(
  defineProps<{
    text?: string
    /** 数据模型字段路径，如 language.meaning、block:care.rose.vase_base */
    source?: string
    /** 行内（默认）或块级段落 */
    inline?: boolean
    extraClass?: string
  }>(),
  {
    text: '',
    source: '',
    inline: true,
    extraClass: '',
  },
)

const { showWikiDataSourceLabels } = useWikiLayoutDebug()

const showTag = computed(
  () => showWikiDataSourceLabels.value && String(props.source || '').trim().length > 0,
)

const contentClasses = computed(() => {
  const classes = [props.extraClass]
  if (showTag.value) classes.push('wiki-data-text__content--marked')
  return classes.filter(Boolean).join(' ')
})
</script>

<style lang="less">
.wiki-data-text {
  &--inline {
    display: inline;
  }

  &--block {
    display: block;
  }
}

.wiki-data-text__content--marked {
  border-bottom: 1rpx solid rgba(198, 40, 40, 0.45);
}

.wiki-data-text__tag {
  font-size: 18rpx;
  line-height: 1.25;
  color: @color-danger;
  margin-left: 6rpx;
  opacity: 0.92;
  font-weight: 500;

  &--block {
    display: block;
    margin-left: 0;
    margin-top: 4rpx;
  }
}
</style>
