<template>
  <view class="page-home" id="home-page-scroll-body">
    <AppFeedbackHost />
    <view
      v-if="statusBarFillStyle"
      class="overlay-status-bar-fill"
      :style="statusBarFillStyle"
    />

    <view class="header" :style="homeHeaderStyle">
      <view v-if="themePreset.promoTag" class="promo-tag">{{ themePreset.promoTag }}</view>
      <view class="greeting">{{ themePreset.emoji }} 欢迎来到{{ shopStore.shopName }}</view>
      <view class="subtitle">{{ themePreset.homeSubtitle }}</view>
    </view>

    <view
      id="home-search-sticky"
      class="home-search page-sticky-search"
      :class="[searchStuckClass, { 'search-modal-host-open': searchModalHostOpen }]"
      :style="searchStickyStyle"
    >
      <AppSearchInput
        v-model="keyword"
        :placeholder="searchPlaceholder"
        :suggest-title="suggestTitle"
        :suggest="unifiedSuggest"
        history-profile="customer-unified"
        history-dual-channel
        :sticky="false"
        sticky-bleed="24rpx"
        :trigger-style="searchTriggerStyle"
        @search="onSearchKeyword"
        @select-channel="onPickSearchChannel"
        @select="onPickSearchSuggestion"
        @focus-change="onSearchModalOpen"
      />
    </view>

    <view v-if="bannerPending" class="theme-banner theme-banner-ph">
      <view class="theme-banner-shimmer" />
    </view>
    <nut-swiper
      v-else-if="bannerUrls.length"
      class="theme-banner-swiper"
      :init-page="0"
      :pagination-visible="bannerUrls.length > 1"
      pagination-color="#e53935"
      :loop="false"
      :autoplay="false"
    >
      <nut-swiper-item v-for="(url, idx) in bannerUrls" :key="idx">
        <image
          class="theme-banner"
          :src="url"
          mode="aspectFill"
          @error="retryBannerUrl(idx)"
        />
      </nut-swiper-item>
    </nut-swiper>

    <view class="func-entries">
      <view class="func-entry" @click="onSelfSelect">
        <view class="func-icon" style="background: #fce4ec">💐</view>
        <view class="func-label">自选花束</view>
      </view>
      <view class="func-entry" @click="onWikiSearch">
        <view class="func-icon" style="background: #e3f2fd">🔍</view>
        <view class="func-label">智库搜索</view>
      </view>
      <view class="func-entry" @click="onShoppingGuide">
        <view class="func-icon" style="background: #e8f5e9">📖</view>
        <view class="func-label">选购指南</view>
      </view>
      <view class="func-entry" @click="onCareKnowledge">
        <view class="func-icon" style="background: #fff3e0">🌱</view>
        <view class="func-label">养护知识</view>
      </view>
    </view>

    <view class="section-title" :style="{ color: themePreset.primaryColor }">
      ✨ {{ sectionTitle }}
    </view>
    <GoodsCardSkeleton v-if="loading" :count="4" />
    <view
      v-else
      class="goods-grid"
      @touchstart="browseTouchHandlers.onTouchStart"
      @touchmove="browseTouchHandlers.onTouchMove"
      @touchend="browseTouchHandlers.onTouchEnd"
      @touchcancel="browseTouchHandlers.onTouchCancel"
    >
      <view
        v-for="item in goodsList"
        :key="item._id"
        class="goods-card"
        @tap="goDetail(item._id, item.previewUrl, item.coverImage || item.images?.[0])"
      >
        <view class="goods-img-wrap">
          <GoodsImage
            :preview-src="item.previewUrl"
            :cloud-file-id="item.coverImage || item.images?.[0]"
            root-class="goods-img"
          />
          <GoodsSoldOutBadge :stock="item.stock" :on-sale="item.onSale" />
        </view>
        <view class="goods-name">{{ item.name }}</view>
        <GoodsSalesTagRow :goods="item" />
        <view class="goods-price" :style="{ color: themePreset.primaryColor }">
          <GoodsPriceLabel
            v-if="item.discountPrice != null"
            :price="item.discountPrice"
            :unit="item.unit"
            root-class="price-sale"
          />
          <GoodsPriceLabel
            :price="item.price"
            :unit="item.unit"
            :root-class="item.discountPrice != null ? 'price-origin' : undefined"
          />
        </view>
      </view>
    </view>
    <view v-if="!loading && !goodsList.length" class="empty-tip">{{ emptyText }}</view>
    <ScrollListTailSpacer
      content-selector="#home-page-scroll-body"
      tab-bar
      :watch-key="`${loading}-${goodsList.length}`"
    />
  </view>
</template>

<script setup lang="ts">
import AppSearchInput from '@/components/AppSearchInput.vue'
import AppFeedbackHost from '@/components/AppFeedbackHost.vue'
import { useNavBarLayout } from '@/composables/useNavBarLayout'
import { useStickyStack } from '@/composables/useStickyStack'
import { useCartTabBadgeSync } from '@/composables/useCartTabBadgeSync'
import { usePageData } from '@/composables/usePageData'
import { computed } from 'vue'
import GoodsCardSkeleton from '@/components/GoodsCardSkeleton.vue'
import GoodsImage from '@/components/GoodsImage.vue'
import GoodsSalesTagRow from '@/components/GoodsSalesTagRow.vue'
import GoodsSoldOutBadge from '@/components/GoodsSoldOutBadge.vue'
import GoodsPriceLabel from '@/components/GoodsPriceLabel.vue'
import { searchModalHostOpen } from '@/utils/searchModalHost'
import { showToast } from '@/utils/feedback'
import { navigateTo } from '@/utils/router'

const {
  shopStore,
  categories,
  goodsList,
  loading,
  bannerUrls,
  bannerPending,
  themePreset,
  sectionTitle,
  headerStyle,
  emptyText,
  searchPlaceholder,
  suggestTitle,
  keyword,
  unifiedSuggest,
  onSearchKeyword,
  onPickSearchChannel,
  onPickSearchSuggestion,
  onSearchModalOpen,
  formatPrice,
  goCategory,
  goDetail,
  browseTouchHandlers,
  retryBannerUrl,
} = usePageData()

useCartTabBadgeSync()

const { statusBarHeightPx } = useNavBarLayout()

const stickyStack = useStickyStack({
  order: [
    {
      id: 'search',
      selector: '#home-search-sticky',
      reserveCapsule: true,
      pageHorizontalPadRpx: 24,
    },
  ],
  scrollMode: 'page',
  background: '#f8f8f8',
  remeasureDeps: [
    () => loading.value,
    () => bannerUrls.value.length,
    () => themePreset.value.promoTag,
    () => shopStore.shopName,
  ],
})

const statusBarFillStyle = stickyStack.statusBarFillStyle
const searchStickyStyle = stickyStack.stickyStyle('search')
const searchStuckClass = stickyStack.stuckClass('search')
const searchTriggerStyle = stickyStack.triggerStyle('search')

const homeHeaderStyle = computed(() => ({
  ...headerStyle.value,
  paddingTop: `calc(${statusBarHeightPx.value} + 24rpx)`,
}))

const onSelfSelect = () => navigateTo({ url: '/pagesCustomer/customize/index' })
const onWikiSearch = () => showToast({ title: '功能开发中', icon: 'none' })
const onShoppingGuide = () => navigateTo({ url: '/pagesCustomer/guide/index' })
const onCareKnowledge = () => showToast({ title: '功能开发中', icon: 'none' })
</script>

<style lang="less">
@import '@/styles/tokens.less';

.page-home {
  min-height: 100vh;
  background: #f8f8f8;
  box-sizing: border-box;
  width: 100%;
}
.header {
  padding: 24rpx 32rpx;
  .greeting {
    font-size: 36rpx;
    font-weight: 600;
    color: #333;
  }
  .subtitle {
    margin-top: 8rpx;
    font-size: 26rpx;
    color: #666;
  }
}
.promo-tag {
  display: inline-block;
  margin-bottom: 12rpx;
  padding: 4rpx 16rpx;
  font-size: 22rpx;
  color: #fff;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 20rpx;
}
.home-search {
  padding: 12rpx 24rpx;
  background: #f8f8f8;
}
.theme-banner-swiper {
  width: 100%;
  background: #f0f0f0;
}
.theme-banner-ph {
  position: relative;
  overflow: hidden;
}
.theme-banner-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #ececec 0%, #f5f5f5 45%, #ececec 100%);
  background-size: 200% 100%;
  animation: home-banner-shimmer 1.4s ease-in-out infinite;
}
@keyframes home-banner-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
.theme-banner {
  width: 100%;
  height: 320rpx;
  display: block;
  background: #f0f0f0;
}
.func-entries {
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  align-items: flex-start;
  background: #fff;
  padding: 32rpx 16rpx;
  width: 100%;
  box-sizing: border-box;
}
.func-entry {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
}
.func-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
}
.func-label {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #666;
}
.section-title {
  padding: 32rpx 32rpx 16rpx;
  font-size: 32rpx;
  font-weight: 600;
}
.goods-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  padding: 0 16rpx 32rpx;
  box-sizing: border-box;
}
.goods-card {
  min-width: 0;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-sizing: border-box;
  .goods-img-wrap {
    position: relative;
  }
  .goods-img {
    width: 100%;
    height: 340rpx;
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
  }
  .price-sale { margin-right: 8rpx; }
  .price-origin {
    color: #999;
    font-weight: 400;
    text-decoration: line-through;
  }
}
.empty-tip {
  padding: 80rpx 0;
  text-align: center;
  font-size: @font-size-md;
  color: @color-text-tertiary;
}
</style>
