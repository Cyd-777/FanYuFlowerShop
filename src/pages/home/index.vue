<template>
  <view class="page-home">
    <view class="header" :style="headerStyle">
      <view v-if="themePreset.promoTag" class="promo-tag">{{ themePreset.promoTag }}</view>
      <view class="greeting">{{ themePreset.emoji }} 欢迎来到{{ shopStore.shopName }}</view>
      <view class="subtitle">{{ themePreset.homeSubtitle }}</view>
    </view>

    <image
      v-if="bannerUrl"
      class="theme-banner"
      :src="bannerUrl"
      mode="aspectFill"
    />

    <scroll-view
      v-if="categories.length"
      class="categories"
      scroll-x
      :enhanced="true"
      :show-scrollbar="false"
    >
      <view
        v-for="cat in categories"
        :key="cat._id"
        class="category-item"
        @click="goCategory(cat)"
      >
        <view class="cat-icon" :style="{ background: themeChipBg }">{{ cat.icon }}</view>
        <view class="cat-name">{{ cat.name }}</view>
      </view>
    </scroll-view>

    <view class="section-title" :style="{ color: themePreset.primaryColor }">
      ✨ {{ sectionTitle }}
    </view>
    <GoodsCardSkeleton v-if="loading" :count="4" />
    <view v-else class="goods-grid">
      <view
        v-for="item in goodsList"
        :key="item._id"
        class="goods-card"
        @click="goDetail(item._id)"
      >
        <view class="goods-img-wrap">
          <GoodsImage
            :src="item.imageUrl"
            :cloud-file-id="item.coverImage || item.images?.[0]"
            root-class="goods-img"
          />
          <GoodsNewListingBadge :goods="item" />
        </view>
        <view class="goods-name">{{ item.name }}</view>
        <view class="goods-price" :style="{ color: themePreset.primaryColor }">
          <text v-if="item.discountPrice != null" class="price-sale">
            ¥{{ formatPrice(item.discountPrice) }}
          </text>
          <text :class="{ 'price-origin': item.discountPrice != null }">
            ¥{{ formatPrice(item.price) }}
          </text>
        </view>
      </view>
    </view>
    <view v-if="!loading && !goodsList.length" class="empty-tip">{{ emptyText }}</view>
  </view>
</template>

<script setup lang="ts">
import { usePageData } from '@/composables/usePageData'
import GoodsCardSkeleton from '@/components/GoodsCardSkeleton.vue'
import GoodsImage from '@/components/GoodsImage.vue'
import GoodsNewListingBadge from '@/components/GoodsNewListingBadge.vue'

const {
  shopStore,
  categories,
  goodsList,
  loading,
  bannerUrl,
  themePreset,
  sectionTitle,
  headerStyle,
  themeChipBg,
  emptyText,
  formatPrice,
  goCategory,
  goDetail,
} = usePageData()
</script>

<style lang="less">
@import '@/styles/tokens.less';

.page-home {
  min-height: 100vh;
  background: #f8f8f8;
  overflow-x: hidden;
}
.header {
  padding: 48rpx 32rpx 32rpx;
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
.theme-banner {
  width: 100%;
  height: 320rpx;
  display: block;
  background: #f0f0f0;
}
.categories {
  display: flex;
  padding: 24rpx 16rpx;
  white-space: nowrap;
  background: #fff;
}
.category-item {
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
    font-size: 28rpx;
    font-weight: 600;
  }
  .price-sale { margin-right: 8rpx; }
  .price-origin {
    font-size: 22rpx;
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
