<template>
  <view class="page-wiki" :style="navCssVars">
    <AppNavBar hide-back :bar-visible="!isSearchStuck" />

    <view
      v-if="isSearchStuck"
      class="overlay-status-bar-fill"
      :style="statusBarFillStyle"
    />

    <view
      id="wiki-search-sticky"
      class="wiki-search page-sticky-search"
      :class="{ 'is-stuck': isSearchStuck }"
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
      v-if="!isSearchMode"
      class="kind-tabs-wrap page-sticky-tabs"
      :class="{ 'is-search-stuck': isSearchStuck }"
      :style="tabsStickyStyle"
    >
      <scroll-view
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

    <view v-if="loading" class="loading-text">{{ loadingText }}</view>

    <view v-else class="wiki-body content-pad-x">
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
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppNavBar from '@/components/AppNavBar.vue'
import AppSearchInput from '@/components/AppSearchInput.vue'
import WikiAnswerCard from '@/components/WikiAnswerCard.vue'
import { useNavBarLayout } from '@/composables/useNavBarLayout'
import { useOverlayStickySearch } from '@/composables/useOverlayStickySearch'
import { usePageData } from '@/composables/usePageData'
import {
  estimateTagRowsTrackWidthPx,
  useScrollXTrack,
} from '@/composables/useScrollXTrack'
import { splitTwoRowsColumnMajor } from '@/utils/splitTwoRowsColumnMajor'

const { cssVars: navCssVars, layout: navLayout } = useNavBarLayout()

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

const {
  isSearchStuck,
  statusBarFillStyle,
  searchStickyStyle,
  searchTriggerStyle,
  tabsStickyStyle,
} = useOverlayStickySearch({
  searchSelector: '#wiki-search-sticky',
  wrapPadYRpx: 24,
  background: '#fff5f5',
  remeasureDeps: [
    () => loading.value,
    () => isSearchMode.value,
    () => navLayout.value.totalHeight,
  ],
})

function isKindTabActive(kindName: string | null) {
  if (kindName == null) return selectedKindName.value == null
  return selectedKindName.value === kindName
}

/** 按列优先拆成两行（全部/玫瑰、百合/康乃馨…） */
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
  min-height: 100vh;
  background: @color-bg-page;
  box-sizing: border-box;
  width: 100%;
  padding-bottom: 48rpx;
}

.wiki-search {
  padding: 12rpx 24rpx;
  background: linear-gradient(180deg, #fff5f5 0%, @color-bg-page 100%);

  &.is-stuck {
    background: #fff5f5;
  }
}

.kind-tabs-wrap {
  background: @color-bg-page;
  width: 100%;
  overflow: hidden;

  &.is-search-stuck {
    background: #fff5f5;
  }
}

/** 视口宽高由 scrollViewportStyle 注入 px；勿仅用 100% */
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
  padding-bottom: 24rpx;
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
