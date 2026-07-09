<template>
  <view class="wiki-language">
    <view
      v-if="fields.meaning || editable"
      class="wiki-language__core"
      :class="{ 'wiki-note-editable--zone': editable }"
      @tap="onEdit('languageMeaning')"
    >
      <text class="wiki-language__core-label">{{ coreLabel }}</text>
      <WikiDataText
        v-if="fields.meaning"
        :text="fields.meaning"
        source="language.meaning"
        :inline="false"
        extra-class="wiki-language__core-text"
      />
      <text v-else-if="editable" class="wiki-language__empty">{{ emptyEditableCore }}</text>
    </view>

    <view
      id="wiki-anchor-language"
      class="wiki-language__body"
      :class="{
        'wiki-language__body--highlight': highlightAnchor === 'wiki-anchor-language',
        'wiki-note-editable--zone': editable,
      }"
      @tap="onEdit('languageParagraphsText')"
    >
      <WikiArticleBody
        v-if="fields.paragraphs.length"
        :paragraphs="fields.paragraphs"
        source-prefix="language.paragraphs"
      />
      <WikiDataText
        v-else-if="fields.summary"
        :text="fields.summary"
        source="language.summary"
        :inline="false"
        extra-class="wiki-language__summary"
      />
      <text v-else-if="!fields.meaning" class="wiki-language__empty">{{ editable ? emptyEditableBody : emptyText }}</text>
      <text v-if="editable" class="wiki-note-tap-hint">{{ tapHint }}</text>
    </view>

    <view
      v-if="fields.occasions.length || editable"
      class="wiki-language__block"
      :class="{ 'wiki-note-editable--zone': editable }"
      @tap="onEdit('picker:occasions')"
    >
      <text class="wiki-language__block-title">{{ occasionsTitle }}</text>
      <view class="wiki-language__occasions">
        <WikiLanguageOccasionChip
          v-for="(item, idx) in fields.occasions"
          :key="idx"
          :label="item"
          :source="`language.occasions[${idx}]`"
        />
      </view>
      <text v-if="editable && !fields.occasions.length" class="wiki-language__empty">{{ tapPickOccasions }}</text>
    </view>

    <view v-if="fields.colorMeanings.length" class="wiki-language__block">
      <text class="wiki-language__block-title">{{ colorsTitle }}</text>
      <view class="wiki-language__colors">
        <WikiLanguageColorCard
          v-for="(item, idx) in fields.colorMeanings"
          :key="idx"
          :color="item.color"
          :meaning="item.meaning"
          :color-source="`language.colorMeanings[${idx}].color`"
          :meaning-source="`language.colorMeanings[${idx}].meaning`"
        />
      </view>
    </view>

    <view v-if="fields.pairing.length" class="wiki-language__block">
      <text class="wiki-language__block-title">{{ pairingTitle }}</text>
      <view
        v-for="(item, idx) in fields.pairing"
        :key="idx"
        class="wiki-language__pairing"
      >
        <WikiDataText
          :text="item.style"
          :source="`language.pairing[${idx}].style`"
          :inline="false"
          extra-class="wiki-language__pairing-style"
        />
        <WikiDataText
          :text="item.flowers.join(' · ')"
          :source="`language.pairing[${idx}].flowers`"
          :inline="false"
          extra-class="wiki-language__pairing-flowers"
        />
        <WikiDataText
          v-if="item.note"
          :text="item.note"
          :source="`language.pairing[${idx}].note`"
          :inline="false"
          extra-class="wiki-language__pairing-note"
        />
      </view>
    </view>

    <view
      v-if="fields.caution || editable"
      class="wiki-language__caution"
      :class="{ 'wiki-note-editable--zone': editable }"
      @tap="onEdit('languageCaution')"
    >
      <text class="wiki-language__caution-label">{{ cautionLabel }}</text>
      <WikiDataText
        :text="fields.caution"
        source="language.caution"
        :inline="false"
        extra-class="wiki-language__caution-text"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WikiArticleBody from '@/components/wiki/WikiArticleBody.vue'
import WikiDataText from '@/components/wiki/WikiDataText.vue'
import WikiLanguageColorCard from '@/components/wiki/WikiLanguageColorCard.vue'
import WikiLanguageOccasionChip from '@/components/wiki/WikiLanguageOccasionChip.vue'
import type { FlowerWiki } from '@/types/wiki'
import { resolveWikiLanguage } from '@/types/wiki'
import type { WikiNoteEditTarget } from '@/utils/wikiNoteEdit'

const props = defineProps<{
  wiki: FlowerWiki
  highlightAnchor?: string
  editable?: boolean
}>()

const emit = defineEmits<{
  edit: [target: WikiNoteEditTarget]
}>()

const emptyText = '暂无花语介绍'
const emptyEditableCore = '点击填写核心花语'
const emptyEditableBody = '点击填写花语正文'
const tapHint = '点击编辑'
const tapPickOccasions = '点击选择适用场合'
const coreLabel = '核心花语'
const occasionsTitle = '适用场景'
const colorsTitle = '色彩寓意'
const pairingTitle = '搭配建议'
const cautionLabel = '送花注意'

const fields = computed(() => resolveWikiLanguage(props.wiki))

function onEdit(target: WikiNoteEditTarget) {
  if (!props.editable) return
  emit('edit', target)
}
</script>

<style lang="less">
.wiki-language {
  padding-bottom: 8rpx;
}

.wiki-language__body {
  padding: 4rpx 0 20rpx;

  &--highlight {
    padding: 12rpx 0 20rpx;
    background: rgba(255, 245, 245, 0.6);
    border-radius: 8rpx;
  }
}

.wiki-language__summary {
  display: block;
  font-size: 28rpx;
  color: #444;
  line-height: 1.85;
}

.wiki-language__empty {
  display: block;
  font-size: 26rpx;
  color: #999;
  line-height: 1.6;
}

.wiki-note-tap-hint {
  display: block;
  margin-top: 8rpx;
  font-size: 20rpx;
  color: @color-wiki-purple-mid-light;
}

.wiki-language__core {
  margin-bottom: 24rpx;
  padding: 20rpx 24rpx;
  border-left: 6rpx solid @color-primary;
  border-radius: 0 12rpx 12rpx 0;
  background: linear-gradient(90deg, rgba(255, 245, 245, 0.95) 0%, rgba(255, 255, 255, 0) 100%);
}

.wiki-language__core-label {
  display: block;
  font-size: 22rpx;
  font-weight: 600;
  color: @color-primary;
  letter-spacing: 1rpx;
}

.wiki-language__core-text {
  display: block;
  margin-top: 10rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #333;
  line-height: 1.6;
}

.wiki-language__block {
  padding-top: 20rpx;
  border-top: 1rpx solid @color-bg-placeholder;

  & + & {
    margin-top: 4rpx;
  }
}

.wiki-language__block-title {
  display: block;
  margin-bottom: 14rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
}

.wiki-language__occasions {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.wiki-language__colors {
  display: flex;
  flex-direction: column;
}

.wiki-language__pairing {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  padding: 14rpx 0;

  & + & {
    border-top: 1rpx solid @color-bg-muted;
  }
}

.wiki-language__pairing-style {
  font-size: 24rpx;
  font-weight: 600;
  color: #444;
}

.wiki-language__pairing-flowers {
  font-size: 24rpx;
  color: #666;
  line-height: 1.5;
}

.wiki-language__pairing-note {
  font-size: 22rpx;
  color: #999;
  line-height: 1.55;
}

.wiki-language__caution {
  margin-top: 20rpx;
  padding: 16rpx 20rpx;
  border-radius: 12rpx;
  background: @color-bg-input;
}

.wiki-language__caution-label {
  display: block;
  font-size: 22rpx;
  font-weight: 600;
  color: #888;
}

.wiki-language__caution-text {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #666;
  line-height: 1.6;
}
</style>
