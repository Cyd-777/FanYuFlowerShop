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
        <GoodsImage :src="item.imageUrl" root-class="goods-img" />
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
import { computed, ref } from 'vue'
import { useDidShow, useLoad, usePullDownRefresh } from '@tarojs/taro'
import { navigateTo } from '@/utils/router'
import { useShopDisplay } from '@/composables/useShopDisplay'
import { usePublicCategories } from '@/composables/usePublicCategories'
import { listPublicRecommendGoodsCached } from '@/services/goods'
import { hasCacheEntry } from '@/utils/cache'
import { attachGoodsCoverImages, resolveCloudImageUrl } from '@/utils/goodsImage'
import { resolveActiveTheme } from '@/types/shopTheme'
import { applyDiscountPrice, getThemeDiscountRate } from '@/utils/themeDiscount'
import GoodsCardSkeleton from '@/components/GoodsCardSkeleton.vue'
import GoodsImage from '@/components/GoodsImage.vue'
import type { Category } from '@/types/category'
import type { Goods } from '@/types/goods'

const emptyText = '暂无推荐花束，去分类逛逛吧'
const shopStore = useShopDisplay()
const { categories, loadCategories } = usePublicCategories()
const goodsList = ref<Array<Goods & { imageUrl: string; discountPrice?: number }>>([])
const loading = ref(false)
const bannerUrl = ref('')

const themePreset = computed(() => resolveActiveTheme(shopStore.settings.decoration))

const sectionTitle = computed(() =>
  themePreset.value.id === 'default' ? '推荐花束' : `${themePreset.value.name}推荐`,
)

const headerStyle = computed(() => ({
  background: `linear-gradient(135deg, ${themePreset.value.headerGradient[0]}, ${themePreset.value.headerGradient[1]})`,
}))

const themeChipBg = computed(() => `${themePreset.value.headerGradient[0]}`)

async function applyThemeUi() {
  const bannerId = themePreset.value.bannerImage
  bannerUrl.value = bannerId ? await resolveCloudImageUrl(bannerId) : ''

  try {
    wx.setTabBarStyle({ selectedColor: themePreset.value.primaryColor })
  } catch (err) {
    console.warn('[home] setTabBarStyle failed:', err)
  }
}

function attachDiscounts(items: Array<Goods & { imageUrl: string }>) {
  const decoration = shopStore.settings.decoration
  return items.map((item) => {
    const rate = getThemeDiscountRate(item._id, decoration)
    if (rate == null) return item
    return {
      ...item,
      discountPrice: applyDiscountPrice(item.price, rate),
    }
  })
}

async function loadRecommend(force = false) {
  loading.value =
    force === true
      ? true
      : !hasCacheEntry('goods:public:recommend') && !goodsList.value.length

  try {
    const { data } = await listPublicRecommendGoodsCached({
      force,
      onUpdate: (list) => {
        void attachGoodsCoverImages(list).then((items) => {
          goodsList.value = attachDiscounts(items)
        })
      },
    })
    goodsList.value = attachDiscounts(await attachGoodsCoverImages(data))
  } catch (err) {
    console.error('[home] recommend load failed:', err)
    if (!goodsList.value.length) goodsList.value = []
    wx.showToast({
      title: err instanceof Error ? err.message : '加载推荐失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

async function refreshPage(force = false) {
  await shopStore.hydrate({ force })
  await applyThemeUi()
  await Promise.all([loadCategories({ force }), loadRecommend(force)])
}

useLoad(() => {
  void refreshPage()
})

useDidShow(() => {
  void refreshPage()
})

usePullDownRefresh(() => {
  void refreshPage(true).finally(() => {
    wx.stopPullDownRefresh()
  })
})

function formatPrice(price: number) {
  return Number(price).toFixed(2).replace(/\.00$/, '')
}

function goCategory(cat: Category) {
  navigateTo({ url: '/pagesCustomer/goods/list?categoryId=' + cat._id })
}

function goDetail(id: string) {
  navigateTo({ url: '/pagesCustomer/goods/detail?id=' + id })
}
</script>

<style lang="less">
@import '@/styles/tokens.less';

.page-home {
  min-height: 100vh;
  background: #f8f8f8;
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
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding: 0 16rpx 32rpx;
}
.goods-card {
  width: calc(50% - 8rpx);
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-sizing: border-box;
  .goods-img {
    width: 100%;
    height: 340rpx;
    background: #f0f0f0;
  }
  .goods-name {
    padding: 12rpx 16rpx 4rpx;
    font-size: 26rpx;
    color: #333;
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
