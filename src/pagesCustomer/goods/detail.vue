<template>
  <view class="page-goods-detail" id="goods-detail-scroll-body">
    <AppNavBar />

    <view
      v-if="imageFileIds.length || images.length"
      class="swiper-wrap"
      :style="heroBgStyle"
    >
      <nut-swiper :init-page="0" :pagination-visible="imageFileIds.length > 1" pagination-color="@color-primary">
        <nut-swiper-item v-for="(fileId, idx) in imageFileIds" :key="fileId || idx">
          <GoodsImage
            :src="standardImages[idx] || images[idx] || ''"
            :preview-src="images[idx] || ''"
            :cloud-file-id="fileId"
            root-class="swiper-img"
          />
        </nut-swiper-item>
      </nut-swiper>
      <GoodsNewListingBadge v-if="goods._id" :goods="goods" />
    </view>
    <GoodsImage v-else-if="!loading" root-class="swiper-img" show-hint />

    <!-- 加载骨架：图片区域 + 信息行 -->
    <view v-if="loading && !goods.name" class="detail-skeleton">
      <view class="ds-image sk-shimmer" />
      <view class="ds-info">
        <view class="ds-line ds-title sk-shimmer" />
        <view class="ds-line ds-price sk-shimmer" />
        <view class="ds-line ds-desc sk-shimmer" />
        <view class="ds-line ds-desc sk-shimmer ds-desc--short" />
      </view>
    </view>

    <template v-else>
    <view class="info-section">
      <view class="name-row">
        <view class="name">{{ goods.name }}</view>
        <view class="fav-btn" :class="{ active: favorited }" @click="toggleFavorite">
          {{ favorited ? '♥' : '♡' }}
        </view>
      </view>
      <view class="price">{{ formatGoodsPriceWithUnit(goods.price, goods.unit) }}</view>
      <view v-if="flowerTags.length" class="flower-tags">
        <text v-for="tag in flowerTags" :key="tag" class="flower-tag">{{ tag }}</text>
      </view>
      <view class="desc">{{ goods.description || '暂无简介' }}</view>
      <view class="stock">
        <template v-if="isOffSale">商品已下架</template>
        <template v-else-if="isSoldOut">已售罄，暂时无法购买</template>
        <template v-else>
          库存 {{ goods.stock }}{{ getGoodsUnitLabel(goods.unit) }}
          <text v-if="cartCount > 0" class="in-cart-tip">（购物车中 {{ cartCount }}）</text>
        </template>
      </view>
      <view v-if="statusTip" class="status-tip" :class="statusTipType">{{ statusTip }}</view>
    </view>

    <view v-if="purchasable" class="qty-section">
      <text class="qty-label">数量</text>
      <view class="qty-control">
        <view class="qty-btn" :class="{ disabled: quantity <= 1 }" @tap="decreaseQty">−</view>
        <text class="qty-num">{{ quantity }}</text>
        <view class="qty-btn" :class="{ disabled: quantity >= maxQuantity }" @tap="increaseQty">+</view>
      </view>
    </view>

    <WikiEntryPanel
      v-if="wikiEntry"
      :wiki="wikiEntry"
      @open-full="goWikiFull"
    />

    <ScrollListTailSpacer
      content-selector="#goods-detail-scroll-body"
      :bottom-inset-px="actionBarInsetPx"
      :watch-key="`${loading}-${goods._id}-${wikiEntry?._id || ''}`"
    />

    <view class="action-bar">
      <nut-button class="cart-btn" plain :disabled="!purchasable || adding" @click="addToCart">加入购物车</nut-button>
      <nut-button class="buy-btn" type="primary" :disabled="!purchasable || adding" @click="buyNow">立即购买</nut-button>
    </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { showToast } from '@/utils/feedback'
import { computed, ref, watch } from 'vue'
import { useDidShow } from '@tarojs/taro'
import { navigateTo } from '@/utils/router'
import { checkFavorite, toggleFavorite as toggleFavoriteApi } from '@/modules/favorite'
import { hasToken } from '@/modules/auth'
import GoodsImage from '@/components/GoodsImage.vue'
import GoodsNewListingBadge from '@/components/GoodsNewListingBadge.vue'
import WikiEntryPanel from '@/components/wiki/WikiEntryPanel.vue'
import { useAddToCart } from '@/composables/useAddToCart'
import { usePageData } from '@/composables/usePageData'
import { formatGoodsPriceWithUnit } from '@/utils/goodsPrice'
import { getGoodsUnitLabel } from '@/types/goods'
import {
  isGoodsOffSale,
  isGoodsPurchasable,
  isGoodsSoldOut,
} from '@/utils/goodsAvailability'
import { scrollTailActionBarInsetPx } from '@/utils/scrollListTailSpacer'
import { getGoodsFlowerDisplayLabel } from '@/types/wiki'

const actionBarInsetPx = scrollTailActionBarInsetPx()

const {
  goods,
  images,
  standardImages,
  imageFileIds,
  goodsId,
  loading,
  wikiEntry,
  formatPrice,
  goWikiFull,
} = usePageData()

const { adding, cartStore, addToCart: addGoodsToCart, buyNow: buyGoodsNow } = useAddToCart()

/** 首张图作为 swiper-wrap 的 background-image，页面推入时即显示，不等组件挂载 */
const heroBgStyle = computed(() => {
  const first = images.value[0] || ''
  if (!first) return {}
  return {
    backgroundImage: `url(${first})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }
})

const quantity = ref(1)
const favorited = ref(false)
const favoriteLoading = ref(false)

const isOffSale = computed(() => isGoodsOffSale(goods.value))
const isSoldOut = computed(() => isGoodsSoldOut(goods.value))
const purchasable = computed(() =>
  isGoodsPurchasable(goods.value, cartCount.value),
)
const cartCount = computed(() => cartStore.getCountInCart(goodsId.value))
const remainingStock = computed(() =>
  Math.max(0, (goods.value.stock || 0) - cartCount.value),
)
const maxQuantity = computed(() => Math.max(1, remainingStock.value || 1))

const statusTip = computed(() => {
  if (isOffSale.value) return '该商品已下架，暂不可购买'
  if (isSoldOut.value) return '商品仍在上架中，补货后即可购买'
  if (!purchasable.value && cartCount.value > 0) {
    return '购物车中已达该商品库存上限'
  }
  return ''
})
const statusTipType = computed(() => {
  if (isOffSale.value) return 'off-sale'
  if (isSoldOut.value) return 'sold-out'
  return 'muted'
})

watch(maxQuantity, (max) => {
  if (quantity.value > max) quantity.value = max
})

const flowerTags = computed(() => {
  const label = getGoodsFlowerDisplayLabel(goods.value)
  return label ? [label] : []
})

useDidShow(() => {
  if (goodsId.value && hasToken()) {
    void loadFavoriteStatus()
  } else {
    favorited.value = false
  }
})

async function loadFavoriteStatus() {
  if (!goodsId.value || !hasToken()) {
    favorited.value = false
    return
  }
  try {
    favorited.value = await checkFavorite(goodsId.value)
  } catch {
    favorited.value = false
  }
}

async function toggleFavorite() {
  if (!goodsId.value || favoriteLoading.value) return

  if (!hasToken()) {
    showToast({ title: '请先登录', icon: 'none' })
    navigateTo({ url: '/pages/login/index' })
    return
  }

  favoriteLoading.value = true
  try {
    favorited.value = await toggleFavoriteApi(goodsId.value, favorited.value)
    showToast({
      title: favorited.value ? '已收藏' : '已取消收藏',
      icon: 'success',
    })
  } catch (err) {
    showToast({
      title: err instanceof Error ? err.message : '操作失败',
      icon: 'none',
    })
  } finally {
    favoriteLoading.value = false
  }
}

function decreaseQty() {
  if (quantity.value > 1) quantity.value--
}

function increaseQty() {
  if (quantity.value < maxQuantity.value) quantity.value++
}

function displayImage() {
  return images.value[0] || ''
}

async function purchaseAction(mode: 'cart' | 'buy') {
  if (!goodsId.value || adding.value) return

  try {
    if (mode === 'buy') {
      const ok = await buyGoodsNow({
        goodsId: goodsId.value,
        count: quantity.value,
        displayImage: displayImage(),
      })
      if (!ok) return
      return
    }

    await addGoodsToCart({
      goodsId: goodsId.value,
      count: quantity.value,
      displayImage: displayImage(),
    })
    showToast({ title: '已加入购物车', icon: 'success' })
  } catch (err) {
    showToast({
      title: err instanceof Error ? err.message : '加购失败',
      icon: 'none',
    })
  }
}

function addToCart() {
  void purchaseAction('cart')
}

function buyNow() {
  void purchaseAction('buy')
}
</script>

<style lang="less">
@import '@/styles/tokens.less';
.page-goods-detail { padding-bottom: 120rpx; background: @color-bg-page; }

@keyframes sk-shimmer-kf {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.sk-shimmer {
  background: linear-gradient(90deg, @color-bg-placeholder 0%, @color-bg-surface-alt2 20%, @color-bg-muted 40%, @color-bg-placeholder 100%);
  background-size: 200% 100%;
  animation: sk-shimmer-kf 1.4s ease-in-out infinite;
}

.detail-skeleton {
  background: #fff;
}
.ds-image {
  width: 100%;
  height: 600rpx;
  border-radius: 0;
}
.ds-info {
  padding: 24rpx;
}
.ds-line {
  height: 28rpx;
  margin-bottom: 16rpx;
  border-radius: 8rpx;
}
.ds-title {
  width: 56%;
  height: 32rpx;
}
.ds-price {
  width: 36%;
  height: 36rpx;
}
.ds-desc {
  width: 88%;
}
.ds-desc--short {
  width: 48%;
}

.swiper-wrap {
  position: relative;
}
.swiper-img { width: 100%; height: 600rpx; }
.info-section { padding: 24rpx; background: #fff; }
.name-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}
.name {
  flex: 1;
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}
.fav-btn {
  flex-shrink: 0;
  width: 64rpx;
  height: 64rpx;
  line-height: 64rpx;
  text-align: center;
  font-size: 40rpx;
  color: #ccc;
  &.active { color: @color-primary; }
}
.price { font-size: 40rpx; font-weight: 700; color: @color-primary; margin-top: 12rpx; }
.flower-tags { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 12rpx; }
.flower-tag {
  padding: 4rpx 16rpx;
  background: @color-danger-bg-alt;
  color: @color-primary;
  font-size: 22rpx;
  border-radius: 20rpx;
}
.desc { margin-top: 8rpx; font-size: 26rpx; color: #999; line-height: 1.5; }
.stock { margin-top: 12rpx; font-size: 24rpx; color: #666; }
.in-cart-tip { color: @color-primary; }
.status-tip {
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.5;
  &.off-sale { color: #999; }
  &.sold-out { color: @color-primary; }
  &.muted { color: #999; }
}
.qty-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
  padding: 24rpx;
  background: #fff;
}
.qty-label { font-size: 28rpx; color: #333; }
.qty-control { display: flex; align-items: center; gap: 16rpx; }
.qty-btn {
  width: 56rpx;
  height: 56rpx;
  line-height: 52rpx;
  text-align: center;
  border-radius: 8rpx;
  background: @color-bg-muted;
  font-size: 32rpx;
  color: #333;
  &.disabled { opacity: 0.4; }
}
.qty-num { font-size: 28rpx; min-width: 48rpx; text-align: center; }
.action-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; gap: 16rpx; padding: 16rpx 24rpx;
  background: #fff; border-top: 2rpx solid #eee;
}
.cart-btn, .buy-btn { flex: 1; border-radius: 40rpx; }
</style>
