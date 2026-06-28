<template>
  <view class="page-home">
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
      :class="searchStuckClass"
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
        />
      </nut-swiper-item>
    </nut-swiper>

    <view
      v-if="categories.length"
      id="home-categories-wrap"
      class="categories-wrap page-sticky-tabs"
      :class="tabsStuckClass"
      :style="tabsStickyStyle"
    >
      <scroll-view
        id="home-categories-scroll"
        class="categories-scroll"
        :scroll-x="true"
        :style="categoriesScroll.scrollViewportStyle"
        :show-scrollbar="false"
      >
        <view id="home-categories-track" class="categories-track" :style="categoriesScroll.trackStyle">
          <view
            v-for="cat in categories"
            :key="cat._id"
            class="category-item"
            @click="goCategory(cat)"
          >
            <view class="cat-icon" :style="{ background: themeChipBg }">{{ cat.icon }}</view>
            <view class="cat-name">{{ cat.name }}</view>
          </view>
        </view>
      </scroll-view>
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
  </view>
</template>

<script setup lang="ts">
import AppSearchInput from '@/components/AppSearchInput.vue'
import AppFeedbackHost from '@/components/AppFeedbackHost.vue'
import { useNavBarLayout } from '@/composables/useNavBarLayout'
import { useStickyStack } from '@/composables/useStickyStack'
import { useCartTabBadgeSync } from '@/composables/useCartTabBadgeSync'
import { rpxToPx } from '@/composables/usePageSticky'
import { useScrollXTrack } from '@/composables/useScrollXTrack'
import { usePageData } from '@/composables/usePageData'
import { computed } from 'vue'
import GoodsCardSkeleton from '@/components/GoodsCardSkeleton.vue'
import GoodsImage from '@/components/GoodsImage.vue'
import GoodsSalesTagRow from '@/components/GoodsSalesTagRow.vue'
import GoodsSoldOutBadge from '@/components/GoodsSoldOutBadge.vue'
import GoodsPriceLabel from '@/components/GoodsPriceLabel.vue'

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
  themeChipBg,
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
  bannerFileIdsList,
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
    {
      id: 'tabs',
      selector: '#home-categories-wrap',
    },
  ],
  scrollMode: 'page',
  background: '#f8f8f8',
  remeasureDeps: [
    () => loading.value,
    () => bannerUrls.value.length,
    () => categories.value.length,
    () => themePreset.value.promoTag,
    () => shopStore.shopName,
  ],
})

const statusBarFillStyle = stickyStack.statusBarFillStyle
const searchStickyStyle = stickyStack.stickyStyle('search')
const tabsStickyStyle = stickyStack.stickyStyle('tabs')
const searchStuckClass = stickyStack.stuckClass('search')
const tabsStuckClass = stickyStack.stuckClass('tabs')
const searchTriggerStyle = stickyStack.triggerStyle('search')

const homeHeaderStyle = computed(() => ({
  ...headerStyle.value,
  paddingTop: `calc(${statusBarHeightPx.value} + 24rpx)`,
}))

const categoriesScroll = useScrollXTrack({
  heightRpx: 168,
  measure: {
    rowSelectors: ['#home-categories-track'],
    horizontalPaddingRpx: 32,
  },
  estimateTrackWidthPx: () => {
    const count = categories.value.length
    const itemRpx = 128
    const totalRpx = count * itemRpx + 32
    const viewport = rpxToPx(750)
    return Math.max(rpxToPx(totalRpx), viewport + 1)
  },
  watchSources: [categories],
})
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
.categories-wrap {
  background: #fff;
  width: 100%;
  overflow: hidden;
}
.categories-scroll {
  box-sizing: border-box;
}
.categories-track {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: flex-start;
  padding: 24rpx 16rpx;
  box-sizing: border-box;
}
.category-item {
  flex: none;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  margin: 0 16rpx;
  .cat-icon {
    width: 96rpx;
    height: 96rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40rpx;
  }
  .cat-name {
    margin-top: 8rpx;
    font-size: 24rpx;
    color: #666;
  }
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
