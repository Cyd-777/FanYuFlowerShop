<template>
  <view class="page-customer-search" :style="navCssVars">
    <AppNavBar />
    <view class="search-bar page-sticky-search" :style="navSearchStickyStyle">
      <AppSearchInput
        v-model="keyword"
        :placeholder="searchPlaceholder"
        :suggest-title="suggestTitle"
        :suggest="unifiedSuggest"
        history-profile="customer-unified"
        history-dual-channel
        :sticky="false"
        sticky-bleed="24rpx"
        @search="onSearchKeyword"
        @select-channel="onPickSearchChannel"
        @select="onPickSuggestion"
        @focus-change="onSearchModalOpen"
      />
    </view>

    <view v-if="loading" class="status-text">{{ loadingText }}</view>

    <view v-else class="results content-pad-x">
      <view v-if="goodsResults.length && showGoodsSection" class="section">
        <view class="section-title">{{ goodsSectionTitle }}</view>
        <view class="goods-grid">
          <view
            v-for="item in goodsResults"
            :key="item._id"
            class="goods-card surface-card"
            @tap="goGoodsDetail(item._id)"
          >
            <GoodsImage
              :src="item.imageUrl"
              :cloud-file-id="item.coverImage || item.images?.[0]"
              root-class="goods-img"
            />
            <view class="goods-name">{{ item.name }}</view>
            <view class="goods-price">¥{{ formatPrice(item.price) }}</view>
          </view>
        </view>
      </view>

      <view v-if="(wikiAnswer && showWikiSection) || wikiResults.length" class="section">
        <view class="section-title">{{ wikiSectionTitle }}</view>
        <view class="wiki-section-body content-pad-x">
          <WikiAnswerCard v-if="wikiAnswer && showWikiSection" :answer="wikiAnswer" />
          <view
            v-for="item in wikiResults"
            :key="item._id"
            class="wiki-card surface-card"
            @tap="goWikiDetail(item._id)"
          >
            <view class="wiki-icon">{{ item.icon }}</view>
            <view class="wiki-main">
              <view class="wiki-name">{{ wikiName(item) }}</view>
              <view class="wiki-kind">{{ wikiSubtitle(item) }}</view>
              <view class="wiki-preview">{{ wikiPreview(item) }}</view>
            </view>
            <text class="wiki-arrow">›</text>
          </view>
        </view>
      </view>

      <view v-if="keyword.trim() && !hasResults" class="status-text">
        {{ emptyText }}
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import AppSearchInput from '@/components/AppSearchInput.vue'
import WikiAnswerCard from '@/components/WikiAnswerCard.vue'
import GoodsImage from '@/components/GoodsImage.vue'
import { usePageSticky } from '@/composables/usePageSticky'
import { useNavBarLayout } from '@/composables/useNavBarLayout'
import { usePageData } from '@/composables/usePageData'

const { cssVars: navCssVars } = useNavBarLayout()
const { navSearchStickyStyle } = usePageSticky()

const {
  searchPlaceholder,
  suggestTitle,
  goodsSectionTitle,
  wikiSectionTitle,
  emptyText,
  loadingText,
  keyword,
  loading,
  goodsResults,
  wikiResults,
  wikiAnswer,
  hasResults,
  showGoodsSection,
  showWikiSection,
  unifiedSuggest,
  onSearchKeyword,
  onPickSearchChannel,
  onPickSuggestion,
  onSearchModalOpen,
  formatPrice,
  wikiName,
  wikiSubtitle,
  wikiPreview,
  goGoodsDetail,
  goWikiDetail,
} = usePageData()
</script>

<style lang="less">
.page-customer-search {
  min-height: 100vh;
  background: #f8f8f8;
  box-sizing: border-box;
  width: 100%;
}
.search-bar {
  padding: 16rpx 24rpx;
  background: #fff;
}
.status-text {
  padding: 80rpx 32rpx;
  text-align: center;
  font-size: 26rpx;
  color: #999;
}
.results {
  padding-bottom: 32rpx;
}
.section {
  margin-top: 16rpx;
}
.section-title {
  padding: 16rpx 32rpx 8rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}
.goods-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  padding: 0 16rpx;
  box-sizing: border-box;
}
.goods-card {
  min-width: 0;
  overflow: hidden;
  .goods-img {
    width: 100%;
    height: 280rpx;
    background: #f0f0f0;
  }
  .goods-name {
    padding: 12rpx 16rpx 4rpx;
    font-size: 26rpx;
    color: #333;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .goods-price {
    padding: 0 16rpx 16rpx;
    font-size: 28rpx;
    font-weight: 600;
    color: #e53935;
  }
}
.wiki-section-body {
  padding-bottom: 8rpx;
}
.wiki-card {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
  padding: 24rpx;
}
.wiki-icon {
  width: 88rpx;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  font-size: 44rpx;
  background: #fff5f5;
  border-radius: 16rpx;
  flex-shrink: 0;
}
.wiki-main {
  flex: 1;
  margin: 0 16rpx;
  min-width: 0;
}
.wiki-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}
.wiki-kind {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #e53935;
}
.wiki-preview {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wiki-arrow {
  font-size: 36rpx;
  color: #ccc;
}
</style>
