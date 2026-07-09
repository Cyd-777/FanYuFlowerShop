<template>
  <view class="page-wiki" :style="navCssVars" id="wiki-page-scroll-body">
    <view
      v-if="statusBarFillStyle"
      class="overlay-status-bar-fill"
      :style="statusBarFillStyle"
    />
    <AppNavBar hide-back />

    <view
      id="wiki-scroll-anchor"
      class="wiki-search page-sticky-search"
      :class="[searchStuckClass, { 'search-modal-host-open': searchModalHostOpen }]"
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

    <view class="wiki-body content-pad-x">
      <view v-if="loading" class="wiki-loading-skeleton">
        <view v-for="i in 4" :key="i" class="ws-section">
          <view class="ws-section-head sk-shimmer" />
          <view class="ws-section-cards">
            <view v-for="j in 2" :key="j" class="ws-card">
              <view class="ws-card-icon sk-shimmer" />
              <view class="ws-card-line sk-shimmer" />
              <view class="ws-card-line ws-card-line--short sk-shimmer" />
            </view>
          </view>
        </view>
      </view>

      <template v-else>
        <view v-if="wikiAnswer" class="wiki-answer-wrap">
          <WikiAnswerCard :answer="wikiAnswer" />
        </view>

        <!-- 搜索模式：平铺结果 -->
        <view v-if="isSearchMode" class="card-flow">
          <view
            v-for="item in wikiList"
            :key="item._id"
            class="wiki-kind-card surface-card"
            @tap="goDetail(item._id)"
          >
            <view class="wiki-kind-card-icon">{{ item.icon }}</view>
            <view class="wiki-kind-card-name">{{ displaySearchName(item) }}</view>
            <WikiKindCardTags :item="item" />
            <view class="wiki-kind-card-preview">{{ cardPreview(item) }}</view>
          </view>
          <view v-if="!wikiList.length && !wikiAnswer" class="empty-text">{{ emptyText }}</view>
        </view>

        <!-- 浏览模式：按种类折叠区 -->
        <view v-else class="browse-sections">
          <view
            v-for="group in groupedBrowseFlow"
            :key="group.kindName"
            class="kind-section"
          >
            <view class="kind-section-head" @tap="toggleKindCollapse(group.kindName)">
              <text class="kind-section-icon">{{ group.icon }}</text>
              <text class="kind-section-label">{{ group.kindName }}</text>
              <AppIcon
                class="kind-section-toggle"
                :type="collapsedKinds.has(group.kindName) ? '三角右' : '三角下'"
                :size="20"
              />
            </view>
            <view v-show="!collapsedKinds.has(group.kindName)" class="kind-section-body card-flow">
              <view
                v-for="item in group.items"
                :key="item._id"
                class="wiki-kind-card surface-card"
                :class="{ 'is-kind': isWikiKindEntry(item) }"
                @tap="goDetail(item._id)"
              >
                <view class="wiki-kind-card-icon">{{ item.icon }}</view>
                <view class="wiki-kind-card-name">{{ displayName(item) }}</view>
                <view v-if="displaySubtitle(item)" class="wiki-kind-card-sub">
                  {{ displaySubtitle(item) }}
                </view>
                <WikiKindCardTags :item="item" />
                <view class="wiki-kind-card-preview">{{ cardPreview(item) }}</view>
              </view>
            </view>
          </view>
          <view v-if="!groupedBrowseFlow.length" class="empty-text">{{ filterEmptyText }}</view>
        </view>
      </template>
    </view>
    <ScrollListTailSpacer
      content-selector="#wiki-page-scroll-body"
      tab-bar
      :watch-key="`${loading}-${wikiList.length}-${groupedBrowseFlow.length}-${isSearchMode}`"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppNavBar from '@/components/AppNavBar.vue'
import AppSearchInput from '@/components/AppSearchInput.vue'
import AppIcon from '@/components/AppIcon.vue'
import WikiAnswerCard from '@/components/WikiAnswerCard.vue'
import WikiKindCardTags from '@/components/wiki/WikiKindCardTags.vue'
import { useNavBarLayout } from '@/composables/useNavBarLayout'
import { useStickyStack } from '@/composables/useStickyStack'
import { usePageData } from '@/composables/usePageData'
import { useCartTabBadgeSync } from '@/composables/useCartTabBadgeSync'
import { buildWikiGroupedBrowseFlow } from '@/types/wiki'
import { searchModalHostOpen } from '@/utils/searchModalHost'

const { cssVars: navCssVars } = useNavBarLayout()

useCartTabBadgeSync()

const {
  searchPlaceholder,
  suggestTitle,
  emptyText,
  isSearchMode,
  keyword,
  loading,
  wikiList,
  wikiCatalog,
  wikiAnswer,
  filterEmptyText,
  displayName,
  displaySearchName,
  displaySubtitle,
  cardPreview,
  wikiSuggest,
  onSearchKeyword,
  onPickSuggestion,
  goDetail,
  isWikiKindEntry,
} = usePageData()

const stickyStack = useStickyStack({
  scrollMode: 'page',
  background: '@color-danger-bg-alt',
  order: [
    {
      id: 'search',
      selector: '#wiki-scroll-anchor',
      reserveCapsule: true,
    },
  ],
  remeasureDeps: [isSearchMode],
})

const statusBarFillStyle = stickyStack.statusBarFillStyle
const searchStickyStyle = stickyStack.stickyStyle('search')
const searchStuckClass = stickyStack.stuckClass('search')
const searchTriggerStyle = stickyStack.triggerStyle('search')

/** 按种类名分组浏览流数据 */
const groupedBrowseFlow = computed(() =>
  isSearchMode.value ? [] : buildWikiGroupedBrowseFlow(wikiCatalog.value),
)

/** 折叠状态（默认全部展开） */
const collapsedKinds = ref(new Set<string>())

function toggleKindCollapse(kindName: string) {
  const next = new Set(collapsedKinds.value)
  if (next.has(kindName)) next.delete(kindName)
  else next.add(kindName)
  collapsedKinds.value = next
}
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
  background: linear-gradient(180deg, @color-danger-bg-alt 0%, @color-bg-page 100%);
  box-sizing: border-box;

  &.is-stuck {
    background: @color-bg-page;
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  }
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

/* ─── 加载骨架 ─── */
@keyframes ws-shimmer-kf {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.sk-shimmer {
  background: linear-gradient(90deg, @color-bg-placeholder 0%, @color-bg-surface-alt2 20%, @color-bg-muted 40%, @color-bg-placeholder 100%);
  background-size: 200% 100%;
  animation: ws-shimmer-kf 1.4s ease-in-out infinite;
}

.wiki-loading-skeleton {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 0 24rpx;
}
.ws-section {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.ws-section-head {
  height: 72rpx;
  border-radius: 16rpx;
}
.ws-section-cards {
  display: flex;
  gap: 16rpx;
}
.ws-card {
  width: calc((100% - 16rpx) / 2);
  padding: 20rpx;
  background: #fff;
  border-radius: 16rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.ws-card-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 12rpx;
}
.ws-card-line {
  height: 24rpx;
  margin-top: 12rpx;
  border-radius: 6rpx;
  width: 60%;
}
.ws-card-line--short {
  width: 36%;
}

/* ─── 折叠区 ─── */
.browse-sections {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.kind-section-head {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 22rpx 24rpx;
  margin-bottom: 12rpx;
  background: @color-danger-bg-alt;
  border-radius: 16rpx;
  border: 2rpx solid @color-primary-light;
  cursor: pointer;
  user-select: none;
}

.kind-section-head:active {
  opacity: 0.7;
}

.kind-section-icon {
  font-size: 32rpx;
  flex-shrink: 0;
}

.kind-section-label {
  flex: 1;
  font-size: 28rpx;
  font-weight: 600;
  color: @color-text-primary;
}

.kind-section-toggle {
  flex-shrink: 0;
  opacity: 0.55;
}

.kind-section-body {
  padding: 0 0 8rpx;
}

/* ─── 词条卡片 ─── */
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
  background: @color-danger-bg-alt;
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
