<template>
  <view class="wiki-language">
    <view v-if="fields.meaning" class="wiki-language__core">
      <text class="wiki-language__core-label">{{ coreLabel }}</text>
      <WikiDataText
        :text="fields.meaning"
        source="language.meaning"
        :inline="false"
        extra-class="wiki-language__core-text"
      />
    </view>

    <view
      id="wiki-anchor-language"
      class="wiki-language__body"
      :class="{ 'wiki-language__body--highlight': highlightAnchor === 'wiki-anchor-language' }"
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
      <text v-else-if="!fields.meaning" class="wiki-language__empty">{{ emptyText }}</text>
    </view>

    <view v-if="fields.occasions.length" class="wiki-language__block">
      <text class="wiki-language__block-title">{{ occasionsTitle }}</text>
      <view class="wiki-language__occasions">
        <WikiLanguageOccasionChip
          v-for="(item, idx) in fields.occasions"
          :key="idx"
          :label="item"
          :source="`language.occasions[${idx}]`"
        />
      </view>
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

    <view v-if="fields.caution" class="wiki-language__caution">
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

const props = defineProps<{
  wiki: FlowerWiki
  highlightAnchor?: string
}>()

const emptyText = '暂无花语介绍'
const coreLabel = '核心花语'
const occasionsTitle = '适用场景'
const colorsTitle = '色彩寓意'
const pairingTitle = '搭配建议'
const cautionLabel = '送花注意'

const fields = computed(() => resolveWikiLanguage(props.wiki))
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

.wiki-language__core {
  margin-bottom: 24rpx;
  padding: 20rpx 24rpx;
  border-left: 6rpx solid #e53935;
  border-radius: 0 12rpx 12rpx 0;
  background: linear-gradient(90deg, rgba(255, 245, 245, 0.95) 0%, rgba(255, 255, 255, 0) 100%);
}

.wiki-language__core-label {
  display: block;
  font-size: 22rpx;
  font-weight: 600;
  color: #e53935;
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
  border-top: 1rpx solid #f0f0f0;

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
    border-top: 1rpx solid #f5f5f5;
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
  background: #fafafa;
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
