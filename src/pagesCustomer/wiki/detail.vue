<template>
  <view class="page-wiki-detail">
    <AppNavBar :title="navTitle" />
    <view v-if="loading" class="wiki-skeleton">
      <view class="ws-hero sk-shimmer" />
      <view class="ws-content">
        <view class="ws-line sk-shimmer" />
        <view class="ws-line ws-line--mid sk-shimmer" />
        <view class="ws-line ws-line--short sk-shimmer" />
        <view class="ws-line sk-shimmer" />
        <view class="ws-line ws-line--mid sk-shimmer" />
      </view>
    </view>

    <view v-else-if="wiki" class="wiki-detail-stage">
      <view
        id="wiki-detail-hero"
        class="wiki-detail-hero-layer"
        @touchstart="onChromeTouchStart"
        @touchmove.stop.prevent="onChromeTouchMove"
        @touchend="onPanelTouchEnd"
        @touchcancel="onPanelTouchEnd"
      >
        <WikiDetailHero :wiki="wiki" />
      </view>

      <view
        id="wiki-floating-panel"
        class="wiki-floating-panel"
        :class="{
          'wiki-floating-panel--expanded': panelExpanded,
          'wiki-floating-panel--dragging': panelDragActive,
        }"
        :style="panelStyle"
      >
        <view
          class="wiki-floating-panel__handle"
          aria-hidden="true"
          @touchstart="onChromeTouchStart"
          @touchmove.stop.prevent="onChromeTouchMove"
          @touchend="onPanelTouchEnd"
          @touchcancel="onPanelTouchEnd"
        >
          <view class="wiki-floating-panel__grab" />
        </view>

        <view
          id="wiki-detail-nav"
          class="wiki-detail-nav"
          @touchstart="onChromeTouchStart"
          @touchmove.stop.prevent="onChromeTouchMove"
          @touchend="onPanelTouchEnd"
          @touchcancel="onPanelTouchEnd"
        >
          <view
            v-for="tab in sectionTabs"
            :key="tab.key"
            class="wiki-detail-tab"
            :class="{ active: activeTab === tab.key }"
            @tap="clickSectionTab(tab.key)"
          >
            <text class="wiki-detail-tab-label">{{ tab.label }}</text>
          </view>
        </view>

        <scroll-view
          id="wiki-panel-scroll"
          class="wiki-floating-panel__body"
          :scroll-y="innerScrollEnabled"
          :scroll-into-view="scrollIntoView"
          scroll-with-animation
          :enhanced="true"
          :bounces="false"
          :show-scrollbar="false"
          :upper-threshold="0"
          :catch-move="panelCatchMove"
          @scroll="onContentScroll"
          @scrolltoupper="onPanelScrollToUpper"
          @touchstart="onBodyTouchStart"
          @touchmove="onBodyTouchMove"
          @touchend="onPanelTouchEnd"
          @touchcancel="onPanelTouchEnd"
        >
          <view id="wiki-panel-scroll-body">
            <view class="wiki-detail-stack">
              <view id="wiki-section-atlas" class="wiki-detail-section-header">
                {{ introTitle }}
              </view>
              <WikiAtlasSection :wiki="wiki" :highlight-anchor="highlightAnchor" />

              <view id="wiki-section-care" class="wiki-detail-section-header">
                {{ careTitle }}
              </view>
              <WikiCareSection
                v-if="hasCare"
                :wiki="wiki"
                :highlight-anchor="highlightAnchor"
              />
              <text v-else class="wiki-detail-section-empty">{{ emptySectionText }}</text>

              <view id="wiki-section-language" class="wiki-detail-section-header">
                {{ languageTitle }}
              </view>
              <view class="wiki-detail-section wiki-detail-section--last">
                <WikiLanguageSection :wiki="wiki" :highlight-anchor="highlightAnchor" />
              </view>
            </view>

            <view class="cloud-footnote">{{ footnotePrefix }}{{ wiki._id }}</view>
          </view>
          <ScrollListTailSpacer
            content-selector="#wiki-panel-scroll-body"
            scroll-container-selector="#wiki-panel-scroll"
            :watch-key="wiki._id"
          />
        </scroll-view>
      </view>
    </view>

    <nut-empty v-else :description="notFoundText" />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePageData } from '@/composables/usePageData'
import { WIKI_DETAIL_SECTIONS } from '@/composables/useWikiDetailScrollLink'
import WikiAtlasSection from '@/components/wiki/WikiAtlasSection.vue'
import WikiCareSection from '@/components/wiki/WikiCareSection.vue'
import WikiDetailHero from '@/components/wiki/WikiDetailHero.vue'
import WikiLanguageSection from '@/components/wiki/WikiLanguageSection.vue'
import {
  hasWikiCareSoilContent,
  hasWikiCareVaseContent,
} from '@/types/wiki'

const footnotePrefix = '智库 ID：'
const introTitle = '介绍'
const careTitle = '养护方式'
const languageTitle = '花语'
const sectionTabs = WIKI_DETAIL_SECTIONS

const {
  notFoundText,
  emptySectionText,
  activeTab,
  loading,
  wiki,
  displayName,
  scrollIntoView,
  highlightAnchor,
  panelExpanded,
  panelStyle,
  innerScrollEnabled,
  panelDragActive,
  panelCatchMove,
  onChromeTouchStart,
  onChromeTouchMove,
  onBodyTouchStart,
  onBodyTouchMove,
  onPanelScrollToUpper,
  onPanelTouchEnd,
  onContentScroll,
  clickSectionTab,
} = usePageData()

const navTitle = computed(() => displayName.value || '花卉百科')

const hasCare = computed(
  () =>
    !!wiki.value &&
    (hasWikiCareVaseContent(wiki.value) || hasWikiCareSoilContent(wiki.value)),
)
</script>

<style lang="less">
.page-wiki-detail {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fff;
  overflow: hidden;
  box-sizing: border-box;
}

@keyframes sk-shimmer-kf {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.sk-shimmer {
  background: linear-gradient(90deg, #f0f0f0 0%, #e6e6e6 20%, #f5f5f5 40%, #f0f0f0 100%);
  background-size: 200% 100%;
  animation: sk-shimmer-kf 1.4s ease-in-out infinite;
}

.wiki-skeleton {
  padding: 16rpx;
}
.ws-hero {
  width: 100%;
  height: 380rpx;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
}
.ws-content {
  padding: 0 16rpx;
}
.ws-line {
  height: 28rpx;
  border-radius: 8rpx;
  margin-bottom: 16rpx;
  width: 92%;
}
.ws-line--mid {
  width: 64%;
}
.ws-line--short {
  width: 36%;
}

.wiki-detail-stage {
  position: relative;
  flex: 1;
  height: 0;
  overflow: hidden;
}

.wiki-detail-hero-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 0;
}

.wiki-floating-panel {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  box-shadow: 0 -8rpx 32rpx rgba(0, 0, 0, 0.06);
  will-change: transform;

  &--dragging {
    transition: none;
  }

  &--expanded {
    border-radius: 0;
    box-shadow: none;
  }
}

.wiki-floating-panel__handle {
  display: flex;
  justify-content: center;
  padding: 16rpx 0 8rpx;
  flex-shrink: 0;
}

.wiki-floating-panel__grab {
  width: 72rpx;
  height: 8rpx;
  border-radius: 4rpx;
  background: #e0e0e0;
}

.wiki-detail-nav {
  display: flex;
  flex-shrink: 0;
  padding: 12rpx 24rpx;
  background: #fff;
  border-bottom: 1rpx solid #f5f5f5;
}

.wiki-floating-panel__body {
  flex: 1;
  height: 0;
  min-height: 0;
}

.wiki-detail-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 8rpx;
  font-size: 26rpx;
  color: #666;
  border-radius: 10rpx;

  &.active {
    color: #e53935;
    font-weight: 600;
    background: #fff5f5;
  }
}

.wiki-detail-tab-label {
  line-height: 1.3;
}

.wiki-detail-stack {
  padding: 8rpx 32rpx 0;
}

.wiki-detail-section--last {
  min-height: 48vh;
  padding-bottom: 32rpx;
}

.wiki-detail-section-header {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  padding: 24rpx 0 12rpx;
  line-height: 1.4;

  &:not(:first-child) {
    margin-top: 16rpx;
    padding-top: 32rpx;
    border-top: 1rpx solid #f0f0f0;
  }
}

.wiki-detail-section-empty {
  display: block;
  font-size: 26rpx;
  color: #999;
  line-height: 1.6;
  padding: 8rpx 0 16rpx;
}

.cloud-footnote {
  padding: 24rpx 32rpx 48rpx;
  text-align: center;
  font-size: 20rpx;
  color: #bbb;
  word-break: break-all;
}
</style>
