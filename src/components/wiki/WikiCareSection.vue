<template>
  <view class="wiki-section">
    <view
      v-if="showVase"
      id="wiki-anchor-careVase"
      class="wiki-care-panel"
      :class="{ 'wiki-care-panel--highlight': highlightAnchor === 'wiki-anchor-careVase' }"
    >
      <WikiCareHighlightText
        v-if="vase.summary"
        :text="vase.summary"
        source="careVase.summary"
        extra-class="wiki-care-panel__summary"
      />

      <view v-if="hasWakeUp" class="wiki-care-panel__phase">
        <text class="wiki-care-panel__phase-title">{{ wakeUpTitle }}</text>
        <WikiCareHighlightText
          v-if="vase.wakeUp.summary"
          :text="vase.wakeUp.summary"
          source="careVase.wakeUp.summary"
          extra-class="wiki-care-panel__text"
        />
        <view v-if="vase.wakeUp.steps.length" class="wiki-care-panel__steps">
          <WikiCareHighlightText
            v-for="(step, idx) in vase.wakeUp.steps"
            :key="idx"
            :text="`${idx + 1}. ${step}`"
            :source="`careVase.wakeUp.steps[${idx}]`"
            extra-class="wiki-care-panel__step"
          />
        </view>
        <view v-if="showWakeUpGuides" class="wiki-care-panel__guides">
          <WikiCareTrimGuide
            v-if="wakeUpDisplay.trimNote || wakeUpDisplay.trimPositionNote"
            :angle="wakeUpDisplay.trimAngle"
            :trim-note="wakeUpDisplay.trimNote"
            :position-note="wakeUpDisplay.trimPositionNote"
            :water-ratio="wakeUpDisplay.waterLevelRatio"
          />
          <WikiCareWaterGuide
            v-if="wakeUpDisplay.waterDepthNote"
            :ratio="wakeUpDisplay.waterLevelRatio"
            :vase-ratio-label="wakeUpDisplay.waterVaseRatioLabel"
            :submerge-note="wakeUpDisplay.waterSubmergeNote"
            :submerge-cm="wakeUpDisplay.waterSubmergeCm"
            :note="wakeUpDisplay.waterDepthNote"
          />
        </view>
        <view v-if="wakeUpMeta.length" class="wiki-care-panel__meta-list">
          <text v-for="(line, idx) in wakeUpMeta" :key="idx" class="wiki-care-panel__meta">{{
            line
          }}</text>
        </view>
      </view>

      <view v-if="hasDaily" class="wiki-care-panel__phase">
        <text v-if="hasWakeUp" class="wiki-care-panel__phase-title">{{ dailyTitle }}</text>

        <view v-if="showDailyGuides" class="wiki-care-panel__guides">
          <WikiCareTrimGuide
            v-if="showDailyTrimGuide"
            :angle="dailyDisplay.trimAngle"
            :trim-note="dailyDisplay.trimNote"
            :position-note="dailyDisplay.trimPositionNote"
            :water-ratio="dailyDisplay.waterLevelRatio"
          />
          <WikiCareWaterGuide
            v-if="dailyDisplay.waterDepthNote"
            :ratio="dailyDisplay.waterLevelRatio"
            :vase-ratio-label="dailyDisplay.waterVaseRatioLabel"
            :submerge-note="dailyDisplay.waterSubmergeNote"
            :submerge-cm="dailyDisplay.waterSubmergeCm"
            :note="dailyDisplay.waterDepthNote"
          />
        </view>

        <view v-if="dailyDisplay.conditions.length" class="wiki-care-panel__conditions">
          <WikiCareConditionItem
            v-for="item in dailyDisplay.conditions"
            :key="item.key + item.text"
            :item="item"
          />
        </view>

        <view v-if="vase.waterChange" class="wiki-care-panel__block">
          <text class="wiki-care-panel__lead">{{ waterChangeLead }}</text>
          <WikiCareHighlightText :text="vase.waterChange" source="careVase.waterChange" extra-class="wiki-care-panel__text" />
        </view>
      </view>

      <view v-if="vase.additives" class="wiki-care-panel__block">
        <text class="wiki-care-panel__lead">{{ additivesLead }}</text>
        <WikiCareHighlightText :text="vase.additives" source="careVase.additives" extra-class="wiki-care-panel__text" />
      </view>

      <WikiCareCommonIssuesCard
        v-if="vase.commonIssues.length"
        :issues="vase.commonIssues"
      />

      <view v-if="hasEmergency" class="wiki-care-panel__block">
        <view class="wiki-care-panel__lead">
          <WikiDataText
            v-if="vase.emergency.title"
            :text="vase.emergency.title"
            source="careVase.emergency.title"
          />
          <text v-else>{{ emergencyTitle }}</text>
        </view>
        <view class="wiki-care-panel__steps">
          <WikiCareHighlightText
            v-for="(step, idx) in vase.emergency.steps"
            :key="idx"
            :text="`${idx + 1}. ${step}`"
            :source="`careVase.emergency.steps[${idx}]`"
            extra-class="wiki-care-panel__step"
          />
        </view>
      </view>

      <view v-if="vase.tips.length" class="wiki-care-panel__tips">
        <WikiCareHighlightText
          v-for="(tip, idx) in vase.tips"
          :key="idx"
          :text="`${tipPrefix}${tip}`"
          :source="`careVase.tips[${idx}]`"
          extra-class="wiki-care-panel__tip"
        />
      </view>
    </view>

    <view
      v-if="showSoil"
      id="wiki-anchor-careSoil"
      class="wiki-care-panel wiki-care-panel--secondary"
      :class="{ 'wiki-care-panel--highlight': highlightAnchor === 'wiki-anchor-careSoil' }"
    >
      <text class="wiki-care-panel__section-title">{{ soilTitle }}</text>
      <WikiCareHighlightText
        v-if="soil.summary"
        :text="soil.summary"
        extra-class="wiki-care-panel__summary"
      />
      <view v-if="soilConditions.length" class="wiki-care-panel__conditions">
        <WikiCareConditionItem
          v-for="item in soilConditions"
          :key="`${item.label}-${item.text}`"
          :item="item"
        />
      </view>
      <view v-if="soil.tips.length" class="wiki-care-panel__tips">
        <WikiCareHighlightText
          v-for="(tip, idx) in soil.tips"
          :key="idx"
          :text="`${tipPrefix}${tip}`"
          extra-class="wiki-care-panel__tip"
        />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WikiCareCommonIssuesCard from '@/components/wiki/WikiCareCommonIssuesCard.vue'
import WikiCareConditionItem from '@/components/wiki/WikiCareConditionItem.vue'
import WikiCareHighlightText from '@/components/wiki/WikiCareHighlightText.vue'
import WikiDataText from '@/components/wiki/WikiDataText.vue'
import WikiCareTrimGuide from '@/components/wiki/WikiCareTrimGuide.vue'
import WikiCareWaterGuide from '@/components/wiki/WikiCareWaterGuide.vue'
import type { FlowerWiki } from '@/types/wiki'
import {
  hasWikiCareSoilContent,
  hasWikiCareVaseContent,
  resolveWikiCareSoil,
  resolveWikiCareVase,
} from '@/types/wiki'
import { buildWikiCareConditions, resolveWikiCareDisplay } from '@/utils/wikiCareDisplay'

const props = defineProps<{
  wiki: FlowerWiki
  highlightAnchor?: string
}>()

const waterChangeLead = '换水：'
const additivesLead = '延长花期：'
const emergencyTitle = '急救'
const soilTitle = '土培参考'
const wakeUpTitle = '收到后 · 醒花'
const dailyTitle = '日常养护'
const tipPrefix = '· '

const vase = computed(() => resolveWikiCareVase(props.wiki))
const soil = computed(() => resolveWikiCareSoil(props.wiki))
const showVase = computed(() => hasWikiCareVaseContent(props.wiki))
const showSoil = computed(() => hasWikiCareSoilContent(props.wiki))

const hasWakeUp = computed(() => {
  const w = vase.value.wakeUp
  return !!(
    w.summary ||
    w.steps.length ||
    w.trim ||
    w.trimPosition ||
    w.waterDepth ||
    w.headClearance ||
    w.duration ||
    w.environment
  )
})

const hasDaily = computed(
  () =>
    vase.value.waterChange ||
    vase.value.trim ||
    vase.value.trimPosition ||
    vase.value.waterDepth ||
    dailyDisplay.value.conditions.length,
)

const wakeUpDisplay = computed(() =>
  resolveWikiCareDisplay({
    trim: vase.value.wakeUp.trim,
    trimPosition: vase.value.wakeUp.trimPosition,
    waterDepth: vase.value.wakeUp.waterDepth,
    tips: vase.value.tips,
  }),
)

const dailyDisplay = computed(() =>
  resolveWikiCareDisplay({
    trim: vase.value.trim,
    trimPosition: vase.value.trimPosition,
    waterDepth: vase.value.waterDepth,
    waterChange: vase.value.waterChange,
    environment: vase.value.environment,
    light: soil.value.light || props.wiki.careGuide?.light,
    tips: vase.value.tips,
  }),
)

const showWakeUpGuides = computed(
  () =>
    wakeUpDisplay.value.trimNote ||
    wakeUpDisplay.value.trimPositionNote ||
    wakeUpDisplay.value.waterDepthNote,
)

const showDailyGuides = computed(
  () => showDailyTrimGuide.value || Boolean(dailyDisplay.value.waterDepthNote),
)

const showDailyTrimGuide = computed(
  () => Boolean(dailyDisplay.value.trimNote || dailyDisplay.value.trimPositionNote),
)

const wakeUpMeta = computed(() => {
  const w = vase.value.wakeUp
  const lines: string[] = []
  if (w.headClearance) lines.push(w.headClearance)
  if (w.duration) lines.push(`静置 ${w.duration}`)
  if (w.environment) lines.push(w.environment)
  return lines
})

const hasEmergency = computed(
  () => vase.value.emergency.title || vase.value.emergency.steps.length,
)

const soilConditions = computed(() => {
  const items = buildWikiCareConditions({ light: soil.value.light })
  const extras: ReturnType<typeof buildWikiCareConditions> = []
  if (soil.value.water) {
    extras.push({ key: 'placement', icon: '💧', label: '浇水', text: soil.value.water })
  }
  if (soil.value.temperature) {
    extras.push({ key: 'airflow', icon: '🌡️', label: '温度', text: soil.value.temperature })
  }
  return [...items, ...extras]
})
</script>

<style lang="less">
.wiki-care-panel {
  padding-bottom: 24rpx;

  &--highlight {
    padding: 12rpx;
    margin: 0 -12rpx;
    border-radius: 12rpx;
    background: #fff8f8;
    box-shadow: 0 0 0 2rpx rgba(229, 57, 53, 0.12);
  }

  &--secondary {
    padding-top: 24rpx;
    border-top: 1rpx solid #f0f0f0;
  }
}

.wiki-care-panel__section-title {
  display: block;
  margin-bottom: 12rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #888;
}

.wiki-care-panel__summary {
  display: block;
  font-size: 28rpx;
  color: #444;
  line-height: 1.75;
}

.wiki-care-panel__phase {
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #f0f0f0;

  &:first-child {
    margin-top: 0;
    padding-top: 0;
    border-top: none;
  }
}

.wiki-care-panel__phase-title {
  display: block;
  margin-bottom: 12rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
}

.wiki-care-panel__guides {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-top: 16rpx;
}

.wiki-care-panel__conditions {
  margin-top: 8rpx;
  padding-top: 8rpx;
  border-top: 1rpx solid #f0f0f0;
}

.wiki-care-panel__block {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;
}

.wiki-care-panel__lead {
  font-size: 24rpx;
  font-weight: 600;
  color: #888;
}

.wiki-care-panel__text {
  display: block;
  margin-top: 6rpx;
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
}

.wiki-care-panel__steps {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  margin-top: 10rpx;
}

.wiki-care-panel__step {
  font-size: 26rpx;
  color: #666;
  line-height: 1.65;
}

.wiki-care-panel__meta-list {
  margin-top: 12rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.wiki-care-panel__meta {
  font-size: 24rpx;
  color: #888;
  line-height: 1.5;
}

.wiki-care-panel__tips {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-top: 16rpx;
}

.wiki-care-panel__tip {
  font-size: 24rpx;
  color: #666;
  line-height: 1.6;
}

</style>
