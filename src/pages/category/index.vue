<template>
  <view class="page-category page-nav-overlay-safe" :style="navCssVars">
    <AppFeedbackHost />
    <AppNavBar />
    <view id="category-scroll-anchor" class="search-bar page-sticky-search" :style="navSearchStickyStyle">
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

    <view class="panels" :style="panelsStyle">
      <view class="left-wrap" :style="leftWrapStyle">
        <scroll-view
          class="left"
          :scroll-y="true"
          :enhanced="true"
          :show-scrollbar="false"
          :scroll-with-animation="true"
          :scroll-into-view="leftScrollIntoView"
          :style="leftInnerScrollStyle"
        >
          <view
            id="left-tab-customize"
            class="left-item customize-entry"
            :class="{ active: activeIdx === -1 }"
            @tap="showCustomizePanel"
          >
            ✨ 定制花束
          </view>
          <view
            v-for="(tab, idx) in tabs"
            :id="'left-tab-' + idx"
            :key="tab.key"
            :class="['left-item', { active: idx === activeIdx }]"
            @tap="switchCategory(idx)"
          >
            {{ tab.name }}
          </view>
        </scroll-view>
      </view>

      <scroll-view
        class="right"
        :scroll-y="true"
        :show-scrollbar="false"
        :style="rightScrollStyle"
        :refresher-enabled="true"
        :refresher-triggered="contentPullRefresh?.refresherTriggered ?? false"
        refresher-default-style="none"
        @refresherrefresh="contentPullRefresh?.onRefresherRefresh()"
        @touchstart="browseTouchHandlers.onTouchStart"
        @touchmove="browseTouchHandlers.onTouchMove"
        @touchend="browseTouchHandlers.onTouchEnd"
        @touchcancel="browseTouchHandlers.onTouchCancel"
      >
        <view class="right-inner">
          <view v-if="activeIdx === -1" class="customize-panel">
            <view class="customize-title">定制花束</view>
            <view class="customize-desc">
              花材为所有按支售卖的商品；包装与贺卡从对应分类中选择，填写留言后提交订单。
            </view>
            <nut-button type="primary" @tap="goCustomize">开始定制</nut-button>
          </view>
          <template v-else>
            <view class="right-title">{{ tabs[activeIdx]?.name }}</view>
            <GoodsCardSkeleton v-if="loading" variant="row" :count="5" />
            <template v-else>
              <view
                v-for="item in goodsList"
                :key="item._id"
                class="goods-item"
                :class="{ 'is-sold-out': item.stock <= 0 }"
                @tap="goDetail(item._id)"
              >
                <view class="thumb-wrap">
                  <GoodsImage
                    :src="item.imageUrl"
                    :cloud-file-id="item.coverImage || item.images?.[0]"
                    root-class="thumb"
                  />
                  <GoodsSoldOutBadge :stock="item.stock" :on-sale="item.onSale" />
                </view>
                <view class="info">
                  <view class="name">{{ item.name }}</view>
                  <GoodsSalesTagRow :goods="item" compact />
                  <view class="price">¥{{ formatPrice(item.price) }}</view>
                </view>
              </view>
              <view v-if="!goodsList.length" class="empty-tip">{{ emptyText }}</view>
            </template>
          </template>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import Taro from '@tarojs/taro'
import { usePageData } from '@/composables/usePageData'
import { useScrollAreaBelow } from '@/composables/useScrollAreaBelow'
import GoodsCardSkeleton from '@/components/GoodsCardSkeleton.vue'
import AppFeedbackHost from '@/components/AppFeedbackHost.vue'
import GoodsImage from '@/components/GoodsImage.vue'
import GoodsSalesTagRow from '@/components/GoodsSalesTagRow.vue'
import GoodsSoldOutBadge from '@/components/GoodsSoldOutBadge.vue'
import AppSearchInput from '@/components/AppSearchInput.vue'
import { useNavBarLayout } from '@/composables/useNavBarLayout'
import { usePageSticky } from '@/composables/usePageSticky'

const { cssVars: navCssVars } = useNavBarLayout()
const { navSearchStickyStyle } = usePageSticky()

const LEFT_WIDTH_RPX = 180

const { topPx, heightPx, remeasure } = useScrollAreaBelow('#category-scroll-anchor')

const leftWidthPx = computed(() => {
  const { windowWidth } = Taro.getWindowInfo()
  return Math.floor((LEFT_WIDTH_RPX * windowWidth) / 750)
})

const rightWidthPx = computed(() => {
  const { windowWidth } = Taro.getWindowInfo()
  return Math.max(0, windowWidth - leftWidthPx.value)
})

const panelsStyle = computed(() => ({
  top: `${topPx.value}px`,
  height: `${heightPx.value}px`,
}))

const leftWrapStyle = computed(() => ({
  width: `${leftWidthPx.value}px`,
  height: `${heightPx.value}px`,
  maxHeight: `${heightPx.value}px`,
}))

const leftInnerScrollStyle = computed(() => ({
  width: '100%',
  height: `${heightPx.value}px`,
  maxHeight: `${heightPx.value}px`,
}))

const rightScrollStyle = computed(() => ({
  width: `${rightWidthPx.value}px`,
  height: `${heightPx.value}px`,
}))

const {
  keyword,
  searchPlaceholder,
  emptyText,
  activeIdx,
  goodsList,
  loading,
  tabs,
  unifiedSuggest,
  suggestTitle,
  formatPrice,
  switchCategory,
  showCustomizePanel,
  goCustomize,
  onSearchKeyword,
  onPickSearchChannel,
  onPickSuggestion,
  onSearchModalOpen,
  goDetail,
  browseTouchHandlers,
  contentPullRefresh,
} = usePageData()

const leftScrollIntoView = computed(() => {
  if (activeIdx.value === -1) return 'left-tab-customize'
  return `left-tab-${activeIdx.value}`
})

watch(
  () => tabs.value.length,
  () => {
    remeasure()
  },
)
</script>

<style lang="less">
@import '@/styles/tokens.less';

.page-category {
  min-height: 100%;
  background: @color-bg-page;
}

.search-bar {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 95;
  padding: 16rpx 24rpx;
  background: @color-bg-card;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.panels {
  position: fixed;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: row;
  overflow: hidden;
  z-index: 1;
}

.left-wrap {
  flex: none;
  overflow: hidden;
  background: #fff;
}

.left {
  background: #fff;
}

.left-item {
  padding: 28rpx 24rpx;
  font-size: 26rpx;
  color: #666;
  text-align: center;
  border-left: 4rpx solid transparent;
  &.active {
    color: @color-primary;
    border-left-color: @color-primary;
    background: @color-primary-light;
    font-weight: 600;
  }
}

.customize-entry {
  font-size: 24rpx;
}

.right {
  flex: none;
  background: @color-bg-page;
}

.right-inner {
  padding: 24rpx;
  box-sizing: border-box;
}

.customize-panel {
  padding: 48rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
}

.customize-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.customize-desc {
  margin: 16rpx 0 32rpx;
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
}

.right-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
}

.goods-item {
  display: flex;
  box-sizing: border-box;
  max-width: 100%;
  background: #fff;
  border-radius: 12rpx;
  padding: 16rpx;
  margin-bottom: 16rpx;
  &.is-sold-out .thumb {
    opacity: 0.72;
  }
  .thumb-wrap {
    position: relative;
    flex-shrink: 0;
  }
  .thumb {
    width: 160rpx;
    height: 160rpx;
    border-radius: 8rpx;
    background: #f0f0f0;
    flex-shrink: 0;
  }
  .info {
    margin-left: 16rpx;
    flex: 1;
    min-width: 0;
  }
  .name {
    font-size: 26rpx;
    color: #333;
  }
  .price {
    margin-top: 8rpx;
    font-size: 28rpx;
    font-weight: 600;
    color: @color-primary;
  }
}

.empty-tip {
  padding: 48rpx 0;
  text-align: center;
  font-size: @font-size-md;
  color: @color-text-tertiary;
}
</style>
