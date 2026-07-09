<template>
  <view class="wiki-section">
    <view
      id="wiki-anchor-atlas"
      class="wiki-section__intro wiki-prose"
      :class="{
        'wiki-section__intro--highlight': highlightAnchor === 'wiki-anchor-atlas',
        'wiki-note-editable--zone': editable,
      }"
      @tap="onEdit('atlasIntroParagraphsText')"
    >
      <WikiAtlasIntro v-if="fields.introSegments.length" :segments="fields.introSegments" />
      <WikiArticleBody
        v-else-if="fields.paragraphs.length"
        :paragraphs="fields.paragraphs"
        source-prefix="atlas.paragraphs"
      />
      <text v-else class="wiki-section__empty">{{ editable ? emptyEditableText : emptyText }}</text>
      <text v-if="editable" class="wiki-note-tap-hint">{{ tapHint }}</text>
    </view>

    <view
      v-if="fields.features.length || editable"
      class="wiki-section__features"
      :class="{ 'wiki-note-editable--zone': editable }"
      @tap="onEdit('picker:features')"
    >
      <text
        v-for="(feature, idx) in fields.features"
        :key="idx"
        class="wiki-section__feature-chip"
      >
        {{ feature }}
      </text>
      <text v-if="editable && !fields.features.length" class="wiki-section__empty">{{ tapPickFeatures }}</text>
    </view>

    <view v-if="cultivarLine" class="wiki-section__meta">
      <WikiDataText
        :text="cultivarLine"
        source="atlas.cultivar"
        :inline="false"
        extra-class="wiki-section__meta-text"
      />
    </view>

    <view v-if="fields.productionRegions.length" class="wiki-section__meta">
      <WikiDataText
        :text="productionLine"
        source="atlas.productionRegions"
        :inline="false"
        extra-class="wiki-section__meta-text"
      />
    </view>

    <view v-if="fields.distinguishFrom.length" class="wiki-section__block">
      <text class="wiki-section__block-title">{{ distinguishTitle }}</text>
      <view
        v-for="(item, idx) in fields.distinguishFrom"
        :key="idx"
        class="wiki-section__distinguish"
      >
        <view class="wiki-section__distinguish-name">
          <WikiEntryLink
            v-if="canLinkVariety(item.name)"
            :label="item.name"
            @navigate="onDistinguishNavigate"
          />
          <WikiDataText
            v-else
            :text="item.name"
            :source="`atlas.distinguishFrom[${idx}].name`"
          />
        </view>
        <WikiDataText
          class="wiki-section__distinguish-diff-wrap"
          :text="item.difference"
          :source="`atlas.distinguishFrom[${idx}].difference`"
          :inline="false"
          extra-class="wiki-section__distinguish-diff"
        />
      </view>
    </view>

    <view
      v-if="fields.vaseLife || fields.vaseBySeason.length || editable"
      id="wiki-anchor-bloom"
      class="wiki-section__block"
      :class="{
        'wiki-section__block--highlight': highlightAnchor === 'wiki-anchor-bloom',
        'wiki-note-editable--zone': editable,
      }"
      @tap="onEdit('bloomVase')"
    >
      <WikiVaseLifeBar
        v-if="fields.vaseLife"
        :vase-life="fields.vaseLife"
        :note="fields.vaseNote"
        vase-source="bloom.vase"
        note-source="bloom.vaseNote"
      />
      <view v-if="fields.vaseBySeason.length" class="wiki-section__seasons">
        <view
          v-for="(item, idx) in fields.vaseBySeason"
          :key="idx"
          class="wiki-section__season-row"
        >
          <WikiDataText :text="item.season" :source="`bloom.vaseBySeason[${idx}].season`" />
          <WikiDataText :text="item.days" :source="`bloom.vaseBySeason[${idx}].days`" />
          <WikiDataText
            v-if="item.note"
            :text="item.note"
            :source="`bloom.vaseBySeason[${idx}].note`"
          />
        </view>
      </view>
    </view>

    <view v-if="fields.origin" class="wiki-section__block">
      <view class="wiki-section__paragraph">
        <text class="wiki-section__lead">{{ originLead }}</text>
        <WikiDataText :text="fields.origin" source="atlas.origin" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WikiArticleBody from '@/components/wiki/WikiArticleBody.vue'
import WikiAtlasIntro from '@/components/wiki/WikiAtlasIntro.vue'
import WikiDataText from '@/components/wiki/WikiDataText.vue'
import WikiEntryLink from '@/components/wiki/WikiEntryLink.vue'
import WikiVaseLifeBar from '@/components/wiki/WikiVaseLifeBar.vue'
import type { FlowerWiki } from '@/types/wiki'
import { getWikiDisplayName, resolveWikiAtlas } from '@/types/wiki'
import { navigateToWikiByName } from '@/utils/wikiNavigate'

import type { WikiNoteEditTarget } from '@/utils/wikiNoteEdit'

const props = defineProps<{
  wiki: FlowerWiki
  highlightAnchor?: string
  editable?: boolean
}>()

const emit = defineEmits<{
  edit: [target: WikiNoteEditTarget]
}>()

const emptyText = '暂无简介'
const emptyEditableText = '点击填写介绍正文'
const tapHint = '点击编辑'
const tapPickFeatures = '点击选择特征 chip'
const originLead = '主要产地：'
const distinguishTitle = '易混辨识'

const fields = computed(() => resolveWikiAtlas(props.wiki))

const cultivarLine = computed(() => {
  const c = fields.value.cultivar
  const parts: string[] = []
  if (c.horticulturalGroup) parts.push(c.horticulturalGroup)
  if (c.breeder) parts.push(`${c.breeder} 推出`)
  if (c.introducedYear) parts.push(c.introducedYear)
  if (c.namingNote) parts.push(c.namingNote)
  return parts.join(' · ')
})

const productionLine = computed(() => {
  const regions = fields.value.productionRegions
  if (!regions.length) return ''
  return `主产区：${regions.join('、')}`
})

const currentDisplayName = computed(() => getWikiDisplayName(props.wiki))

function canLinkVariety(name: string): boolean {
  const label = String(name || '').trim()
  if (!label) return false
  if (label === currentDisplayName.value) return false
  if (label === props.wiki.varietyName) return false
  return true
}

function onDistinguishNavigate(name: string) {
  void navigateToWikiByName(name, {
    kindName: props.wiki.kindName,
    excludeWikiId: props.wiki._id,
  })
}

function onEdit(target: WikiNoteEditTarget) {
  if (!props.editable) return
  emit('edit', target)
}
</script>

<style lang="less">
.wiki-section {
  padding-bottom: 8rpx;
}

.wiki-section__intro {
  padding: 4rpx 0 20rpx;

  &--highlight {
    padding: 12rpx 0 20rpx;
    background: rgba(255, 245, 245, 0.6);
    border-radius: 8rpx;
  }
}

.wiki-section__features {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  padding-bottom: 16rpx;
}

.wiki-section__feature-chip {
  padding: 8rpx 16rpx;
  font-size: 24rpx;
  color: @color-danger;
  background: rgba(229, 57, 53, 0.08);
  border-radius: 999rpx;
  line-height: 1.3;
}

.wiki-note-tap-hint {
  display: block;
  margin-top: 8rpx;
  font-size: 20rpx;
  color: @color-wiki-purple-mid-light;
}

.wiki-section__empty {
  font-size: 28rpx;
  color: #999;
  line-height: 1.85;
}

.wiki-section__meta {
  padding-bottom: 16rpx;
}

.wiki-section__meta-text {
  font-size: 28rpx;
  color: #888;
  line-height: 1.85;
}

.wiki-section__block {
  padding: 16rpx 0 0;

  & + & {
    padding-top: 20rpx;
  }

  &--highlight {
    background: rgba(255, 245, 245, 0.6);
    margin: 0 -8rpx;
    padding: 16rpx 8rpx 0;
    border-radius: 8rpx;
  }
}

.wiki-section__block-title {
  display: block;
  margin-bottom: 12rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.wiki-section__distinguish {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  padding: 12rpx 0;

  & + & {
    border-top: 1rpx solid @color-bg-muted;
  }
}

.wiki-section__distinguish-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #444;
}

.wiki-section__distinguish-diff {
  font-size: 28rpx;
  color: #666;
  line-height: 1.85;
}

.wiki-section__seasons {
  margin-top: 12rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.wiki-section__season-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8rpx;
}

.wiki-section__season-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #666;
}

.wiki-section__season-days {
  font-size: 28rpx;
  color: #333;
}

.wiki-section__season-note {
  font-size: 28rpx;
  color: #999;
}

.wiki-section__paragraph {
  font-size: 28rpx;
  color: #666;
  line-height: 1.85;
}

.wiki-section__lead {
  font-weight: 600;
  color: #888;
}
</style>
