<template>
  <view class="page-goods-list" :style="navCssVars" id="goods-list-scroll-body">
    <AppNavBar />
    <view class="search-bar page-sticky-search" :style="navSearchStickyStyle">
      <GoodsNameTypeahead
        v-model="keyword"
        :catalog="searchCatalog"
        placeholder="搜索商品、花材…"
        :sticky="false"
        sticky-bleed="24rpx"
        @search="onSearchKeyword"
        @select="onPickSuggestion"
      />
    </view>
    <view v-if="categoryName" class="filter-tip">分类：{{ categoryName }}</view>
    <GoodsCardSkeleton v-if="loading" :count="6" />
    <view v-else class="goods-grid">
      <view
        v-for="item in goodsList"
        :key="item._id"
        class="goods-card"
        :class="{ 'is-sold-out': item.stock <= 0 }"
        @click="goDetail(item._id, item.previewUrl, item.coverImage || item.images?.[0])"
      >
        <view class="goods-img-wrap">
          <GoodsImage
            :preview-src="item.previewUrl"
            :cloud-file-id="item.coverImage || item.images?.[0]"
            root-class="goods-img"
          />
          <GoodsNewListingBadge :goods="item" />
          <GoodsSoldOutBadge :stock="item.stock" :on-sale="item.onSale" />
        </view>
        <view class="goods-name">{{ item.name }}</view>
        <GoodsPriceLabel :price="item.price" :unit="item.unit" root-class="goods-price" />
      </view>
    </view>
    <nut-empty v-if="!loading && !goodsList.length" description="暂无商品" />
    <ScrollListTailSpacer
      content-selector="#goods-list-scroll-body"
      :watch-key="`${loading}-${goodsList.length}`"
    />
  </view>
</template>

<script setup lang="ts">
import { usePageData } from '@/composables/usePageData'
import { useNavBarLayout } from '@/composables/useNavBarLayout'
import { usePageSticky } from '@/composables/usePageSticky'
import GoodsCardSkeleton from '@/components/GoodsCardSkeleton.vue'
import GoodsImage from '@/components/GoodsImage.vue'
import GoodsNewListingBadge from '@/components/GoodsNewListingBadge.vue'
import GoodsSoldOutBadge from '@/components/GoodsSoldOutBadge.vue'
import GoodsPriceLabel from '@/components/GoodsPriceLabel.vue'
import GoodsNameTypeahead from '@/components/GoodsNameTypeahead.vue'

const { cssVars: navCssVars } = useNavBarLayout()
const { navSearchStickyStyle } = usePageSticky()

const {
  keyword,
  categoryName,
  goodsList,
  loading,
  searchCatalog,
  onSearchKeyword,
  onPickSuggestion,
  formatPrice,
  goDetail,
} = usePageData()
</script>

<style lang="less">
@import '@/styles/tokens.less';
.page-goods-list { background: @color-bg-page; min-height: 100vh; }
.search-bar {
  padding: 16rpx 24rpx;
  background: #fff;
}
.filter-tip {
  padding: 8rpx 24rpx 0;
  font-size: 24rpx;
  color: #999;
}
.goods-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  padding: 16rpx;
  box-sizing: border-box;
}
.goods-card {
  min-width: 0;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-sizing: border-box;
  &.is-sold-out .goods-img {
    opacity: 0.72;
  }
}
.goods-img-wrap {
  position: relative;
}
.goods-img {
  width: 100%;
  height: 340rpx;
}
.goods-name {
  padding: 12rpx 16rpx 4rpx;
  font-size: 26rpx;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.goods-price { padding: 0 16rpx 16rpx; color: @color-primary; }
</style>
