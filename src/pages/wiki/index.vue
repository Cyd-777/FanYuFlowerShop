<template>
  <view class="page-wiki" :style="navCssVars">
    <AppFeedbackHost />
    <view
      v-if="statusBarFillStyle"
      class="overlay-status-bar-fill"
      :style="statusBarFillStyle"
    />
    <AppNavBar hide-back />

    <view
      id="wiki-scroll-anchor"
      class="wiki-search page-sticky-search"
      :class="searchStuckClass"
      :style="searchStickyStyle"
    >
      <AppSearchInput
        v-model="keyword"
        :placeholder="searchPlaceholder"
        :suggest-title="suggestTitle"
        :suggest="wikiSuggest"
        history-profile="wiki"
        :sticky="false"
        sticky-bleed="24rpx"
        :trigger-style="searchTriggerStyle"
        @search="onSearchKeyword"
        @select="onPickSuggestion"
      />
    </view>

    <view
      id="wiki-tabs-anchor"
      class="kind-tabs-wrap page-sticky-tabs"
      :class="[tabsStuckClass, { 'is-collapsed': isSearchMode }]"
      :style="tabsStickyStyle"
    >
      <scroll-view
        v-if="!isSearchMode"
        id="wiki-kind-tabs-scroll"
        class="kind-tabs-scroll"
        :scroll-x="true"
        :style="kindTabsScroll.scrollViewportStyle"
        :show-scrollbar="false"
      >
        <view class="kind-tabs-track" :style="kindTabsScroll.trackStyle">
          <view id="wiki-kind-tabs-row-top" class="kind-tabs-row">
            <view
              v-for="tab in kindTabRows.top"
              :key="tab.kindName ?? '__all__'"
              class="kind-tab"
              :class="{ active: isKindTabActive(tab.kindName) }"
              @tap="selectKindTab(tab.kindName)"
            >
              <text v-if="tab.icon" class="kind-tab-icon">{{ tab.icon }}</text>
              <text class="kind-tab-label">{{ tab.label }}</text>
            </view>
          </view>
          <view id="wiki-kind-tabs-row-bottom" class="kind-tabs-row">
            <view
              v-for="tab in kindTabRows.bottom"
              :key="tab.kindName ?? '__all__'"
              class="kind-tab"
              :class="{ active: isKindTabActive(tab.kindName) }"
              @tap="selectKindTab(tab.kindName)"
            >
              <text v-if="tab.icon" class="kind-tab-icon">{{ tab.icon }}</text>
              <text class="kind-tab-label">{{ tab.label }}</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="wiki-body content-pad-x">
      <view v-if="loading" class="loading-text">{{ loadingText }}</view>

      <template v-else>
        <view v-if="wikiAnswer" class="wiki-answer-wrap">
          <WikiAnswerCard :answer="wikiAnswer" />
        </view>

        <view v-if="isSearchMode" class="card-flow">
          <view
            v-for="item in wikiList"
            :key="item._id"
            class="wiki-kind-card surface-card"
            @tap="goDetail(item._id)"
          >
            <view class="wiki-kind-card-icon">{{ item.icon }}</view>
            <view class="wiki-kind-card-name">{{ displayName(item) }}</view>
            <view v-if="displaySubtitle(item)" class="wiki-kind-card-sub">{{ displaySubtitle(item) }}</view>
            <view class="wiki-kind-card-preview">{{ cardPreview(item) }}</view>
          </view>
          <view v-if="!wikiList.length && !wikiAnswer" class="empty-text">{{ emptyText }}</view>
        </view>

        <view v-else class="card-flow">
          <view
            v-for="item in browseFlow"
            :key="item._id"
            class="wiki-kind-card surface-card"
            :class="{ 'is-kind': isWikiKindEntry(item) }"
            @tap="goDetail(item._id)"
          >
            <view class="wiki-kind-card-icon">{{ item.icon }}</view>
            <view class="wiki-kind-card-name">{{ displayName(item) }}</view>
            <view v-if="item.varietyName && displaySubtitle(item)" class="wiki-kind-card-sub">
              {{ displaySubtitle(item) }}
            </view>
            <view class="wiki-kind-card-preview">{{ cardPreview(item) }}</view>
          </view>
          <view v-if="!browseFlow.length" class="empty-text">{{ filterEmptyText }}</view>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppNavBar from '@/components/AppNavBar.vue'
import AppFeedbackHost from '@/components/AppFeedbackHost.vue'
import AppSearchInput from '@/components/AppSearchInput.vue'
import WikiAnswerCard from '@/components/WikiAnswerCard.vue'
import { useNavBarLayout } from '@/composables/useNavBarLayout'
import { useStickyStack } from '@/composables/useStickyStack'
import { usePageData } from '@/composables/usePageData'
import {
  estimateTagRowsTrackWidthPx,
  useScrollXTrack,
} from '@/composables/useScrollXTrack'
import { splitTwoRowsColumnMajor } from '@/utils/splitTwoRowsColumnMajor'
import { useCartTabBadgeSync } from '@/composables/useCartTabBadgeSync'

const { cssVars: navCssVars } = useNavBarLayout()

useCartTabBadgeSync()

const {
  searchPlaceholder,
  suggestTitle,
  loadingText,
  emptyText,
  kindTabItems,
  selectedKindName,
  isSearchMode,
  keyword,
  loading,
  wikiList,
  wikiAnswer,
  browseFlow,
  filterEmptyText,
  displayName,
  displaySubtitle,
  cardPreview,
  wikiSuggest,
  onSearchKeyword,
  onPickSuggestion,
  selectKindTab,
  goDetail,
  isWikiKindEntry,
} = usePageData()

const stickyStack = useStickyStack({
  scrollMode: 'page',
  background: '#fff5f5',
  order: [
    {
      id: 'search',
      selector: '#wiki-scroll-anchor',
      reserveCapsule: true,
    },
    {
      id: 'tabs',
      selector: '#wiki-tabs-anchor',
    },
  ],
  remeasureDeps: [isSearchMode, kindTabItems],
})

const statusBarFillStyle = stickyStack.statusBarFillStyle
const searchStickyStyle = stickyStack.stickyStyle('search')
const tabsStickyStyle = stickyStack.stickyStyle('tabs')
const searchStuckClass = stickyStack.stuckClass('search')
const tabsStuckClass = stickyStack.stuckClass('tabs')
const searchTriggerStyle = stickyStack.triggerStyle('search')

function isKindTabActive(kindName: string | null) {
  if (kindName == null) return selectedKindName.value == null
  return selectedKindName.value === kindName
}

const kindTabRows = computed(() => splitTwoRowsColumnMajor(kindTabItems))

const kindTabsScroll = useScrollXTrack({
  heightRpx: 176,
  measure: {
    rowSelectors: ['#wiki-kind-tabs-row-top', '#wiki-kind-tabs-row-bottom'],
    horizontalPaddingRpx: 48,
  },
  estimateTrackWidthPx: () =>
    estimateTagRowsTrackWidthPx(
      [kindTabRows.value.top, kindTabRows.value.bottom],
      16,
      48,
    ),
  watchSources: [kindTabItems],
})
</script>

<style lang="less">
@import '@/styles/tokens.less';

.page-wiki {
  min-height: 100%;
  background: @color-bg-page;
  box-sizing: border-box;
  width: 100%;
  padding-top: var(--nav-total-height, 0px);
}

.wiki-search {
  left: 0;
  right: 0;
  z-index: 95;
  padding: 12rpx 24rpx;
  background: linear-gradient(180deg, #fff5f5 0%, @color-bg-page 100%);
  box-sizing: border-box;

  &.is-stuck {
    background: @color-bg-page;
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  }
}

.kind-tabs-wrap {
  background: @color-bg-page;
  width: 100%;
  overflow: hidden;

  &.is-collapsed {
    height: 0;
    overflow: hidden;
  }
}

.kind-tabs-scroll {
  box-sizing: border-box;
}

.kind-tabs-track {
  box-sizing: border-box;
  padding: 12rpx 24rpx 16rpx;
}

.kind-tabs-row {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  gap: 16rpx;
  width: fit-content;

  & + & {
    margin-top: 16rpx;
  }
}

.kind-tab {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 20rpx;
  background: @color-bg-card;
  border: 2rpx solid @color-border;
  border-radius: @radius-pill;
  box-sizing: border-box;
  color: @color-text-secondary;
  white-space: nowrap;

  &.active {
    background: @color-primary-light;
    border-color: @color-primary-border;
    color: @color-primary;
    font-weight: 600;
  }
}

.kind-tab-icon {
  font-size: 28rpx;
  line-height: 1;
  flex-shrink: 0;
}

.kind-tab-label {
  font-size: 26rpx;
  line-height: 1.2;
}

.loading-text,
.empty-text {
  padding: 80rpx 32rpx;
  text-align: center;
  font-size: 26rpx;
  color: @color-text-tertiary;
}

.wiki-body {
  padding-top: 16rpx;
  padding-bottom: 48rpx;
}

.wiki-answer-wrap {
  margin-bottom: 16rpx;
}

.card-flow {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  box-sizing: border-box;
}

.wiki-kind-card {
  width: calc((100% - 16rpx) / 2);
  min-width: 0;
  padding: 24rpx 20rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  &.is-kind {
    border: 2rpx solid @color-primary-border;
  }
}

.wiki-kind-card-icon {
  width: 96rpx;
  height: 96rpx;
  line-height: 96rpx;
  font-size: 52rpx;
  background: #fff5f5;
  border-radius: @radius-lg;
  flex-shrink: 0;
}

.wiki-kind-card-name {
  margin-top: 16rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: @color-text-primary;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wiki-kind-card-sub {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: @color-primary;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wiki-kind-card-preview {
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.45;
  color: @color-text-tertiary;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  text-align: left;
}
</style>
