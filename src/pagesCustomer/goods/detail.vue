<template>
  <view class="page-goods-detail">
    <view v-if="loading" class="loading-wrap">
      <nut-skeleton rows="10" animated />
    </view>

    <template v-else>
    <nut-swiper v-if="images.length" :init-page="0" :pagination-visible="true" pagination-color="#e53935">
      <nut-swiper-item v-for="(img, idx) in images" :key="idx">
        <GoodsImage :src="img" root-class="swiper-img" />
      </nut-swiper-item>
    </nut-swiper>
    <GoodsImage v-else root-class="swiper-img" show-hint />

    <view class="info-section">
      <view class="name-row">
        <view class="name">{{ goods.name }}</view>
        <view class="fav-btn" :class="{ active: favorited }" @click="toggleFavorite">
          {{ favorited ? '♥' : '♡' }}
        </view>
      </view>
      <view class="price">¥{{ formatPrice(goods.price) }}/{{ goods.unit || '束' }}</view>
      <view v-if="flowerTags.length" class="flower-tags">
        <text v-for="tag in flowerTags" :key="tag" class="flower-tag">{{ tag }}</text>
      </view>
      <view class="desc">{{ goods.description || '暂无简介' }}</view>
      <view class="stock">
        <template v-if="isOffSale">商品已下架</template>
        <template v-else-if="isSoldOut">已售罄，暂时无法购买</template>
        <template v-else>
          库存 {{ goods.stock }}{{ goods.unit || '束' }}
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

    <view v-if="wikiEntry" class="wiki-card" @click="goWiki">
      <view class="wiki-card-icon">{{ wikiEntry.icon }}</view>
      <view class="wiki-card-main">
        <view class="wiki-card-title">{{ wikiCardTitle }}</view>
        <view class="wiki-card-desc">{{ wikiCardDesc }}</view>
      </view>
      <text class="wiki-card-arrow">›</text>
    </view>

    <view class="action-bar">
      <nut-button class="cart-btn" plain :disabled="!purchasable || adding" @click="addToCart">加入购物车</nut-button>
      <nut-button class="buy-btn" type="primary" :disabled="!purchasable || adding" @click="buyNow">立即购买</nut-button>
    </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDidShow, useLoad } from '@tarojs/taro'
import { navigateTo } from '@/utils/router'
import { getPublicGoodsCached } from '@/services/goods'
import { checkFavorite, toggleFavorite as toggleFavoriteApi } from '@/services/favorite'
import { hasToken } from '@/services/auth'
import { matchPublicWikiCached } from '@/services/wiki'
import { hasCacheEntry } from '@/utils/cache'
import { resolveCloudImageMap } from '@/utils/goodsImage'
import GoodsImage from '@/components/GoodsImage.vue'
import { useAddToCart } from '@/composables/useAddToCart'
import {
  isGoodsOffSale,
  isGoodsPurchasable,
  isGoodsSoldOut,
} from '@/utils/goodsAvailability'
import type { Goods } from '@/types/goods'
import type { FlowerWiki } from '@/types/wiki'
import { getWikiDisplayName } from '@/types/wiki'

const wikiCardTitle = '查看花卉百科'
const wikiCardDesc = '图鉴 · 养殖指南 · 花语百科'

const { adding, cartStore, addToCart: addGoodsToCart, buyNow: buyGoodsNow } = useAddToCart()

const goods = ref<Goods>({
  _id: '',
  name: '',
  price: 0,
  unit: '束',
  stock: 0,
  description: '',
  categoryId: '',
  categoryName: '',
  coverImage: '',
  images: [],
  onSale: true,
  recommend: false,
  sort: 0,
})

const images = ref<string[]>([])
const goodsId = ref('')
const loading = ref(false)
const quantity = ref(1)
const wikiEntry = ref<FlowerWiki | null>(null)
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
  const tags: string[] = []
  if (goods.value.flowerKindName) tags.push(goods.value.flowerKindName)
  if (goods.value.flowerVarietyName) tags.push(goods.value.flowerVarietyName)
  return tags
})

useLoad((options) => {
  goodsId.value = options?.id || ''
  if (goodsId.value) {
    void loadGoods()
  }
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
    wx.showToast({ title: '请先登录', icon: 'none' })
    navigateTo({ url: '/pages/login/index' })
    return
  }

  favoriteLoading.value = true
  try {
    favorited.value = await toggleFavoriteApi(goodsId.value, favorited.value)
    wx.showToast({
      title: favorited.value ? '已收藏' : '已取消收藏',
      icon: 'success',
    })
  } catch (err) {
    wx.showToast({
      title: err instanceof Error ? err.message : '操作失败',
      icon: 'none',
    })
  } finally {
    favoriteLoading.value = false
  }
}

function formatPrice(price: number) {
  return Number(price).toFixed(2).replace(/\.00$/, '')
}

async function applyGoodsImages(data: Goods) {
  const fileIds = data.images.length
    ? data.images
    : data.coverImage
      ? [data.coverImage]
      : []

  const imageMap = await resolveCloudImageMap(fileIds)
  images.value = fileIds.length
    ? fileIds.map((fileId) => imageMap.get(fileId) || (/^https?:\/\//.test(fileId) ? fileId : ''))
    : []
}

async function loadGoods() {
  const cacheKey = `goods:public:detail:${goodsId.value}`
  loading.value = !hasCacheEntry(cacheKey)
  try {
    const { data } = await getPublicGoodsCached(goodsId.value, {
      onUpdate: async (updated) => {
        goods.value = updated
        await applyGoodsImages(updated)
        await loadMatchedWiki()
      },
    })
    goods.value = data
    await applyGoodsImages(data)
    await loadMatchedWiki()
  } catch (err) {
    wx.showToast({
      title: err instanceof Error ? err.message : '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

async function loadMatchedWiki() {
  if (!goods.value.flowerKindId && !goods.value.flowerVarietyId) {
    wikiEntry.value = null
    return
  }

  try {
    const { data } = await matchPublicWikiCached(
      goods.value.flowerKindId || '',
      goods.value.flowerVarietyId || '',
      { onUpdate: (wiki) => { wikiEntry.value = wiki } },
    )
    wikiEntry.value = data
  } catch {
    wikiEntry.value = null
  }
}

function goWiki() {
  if (!wikiEntry.value) return
  const name = getWikiDisplayName(wikiEntry.value)
  navigateTo({
    url: `/pagesCustomer/wiki/detail?id=${wikiEntry.value._id}&tab=atlas&from=goods&name=${encodeURIComponent(name)}`,
  })
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
    wx.showToast({ title: '已加入购物车', icon: 'success' })
  } catch (err) {
    wx.showToast({
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
.page-goods-detail { padding-bottom: 120rpx; background: #f8f8f8; }
.loading-wrap { padding: 24rpx; }
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
  &.active { color: #e53935; }
}
.price { font-size: 40rpx; font-weight: 700; color: #e53935; margin-top: 12rpx; }
.flower-tags { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 12rpx; }
.flower-tag {
  padding: 4rpx 16rpx;
  background: #fff5f5;
  color: #e53935;
  font-size: 22rpx;
  border-radius: 20rpx;
}
.desc { margin-top: 8rpx; font-size: 26rpx; color: #999; line-height: 1.5; }
.stock { margin-top: 12rpx; font-size: 24rpx; color: #666; }
.in-cart-tip { color: #e53935; }
.status-tip {
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.5;
  &.off-sale { color: #999; }
  &.sold-out { color: #e53935; }
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
  background: #f5f5f5;
  font-size: 32rpx;
  color: #333;
  &.disabled { opacity: 0.4; }
}
.qty-num { font-size: 28rpx; min-width: 48rpx; text-align: center; }
.wiki-card {
  display: flex;
  align-items: center;
  margin: 16rpx 24rpx 0;
  padding: 24rpx;
  background: #fff;
  border-radius: 16rpx;
  border: 2rpx solid #fce4ec;
}
.wiki-card-icon {
  width: 72rpx;
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  font-size: 36rpx;
  background: #fff5f5;
  border-radius: 12rpx;
}
.wiki-card-main { flex: 1; margin: 0 16rpx; }
.wiki-card-title { font-size: 28rpx; font-weight: 600; color: #333; }
.wiki-card-desc { margin-top: 4rpx; font-size: 22rpx; color: #999; }
.wiki-card-arrow { font-size: 32rpx; color: #ccc; }
.action-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; gap: 16rpx; padding: 16rpx 24rpx;
  background: #fff; border-top: 2rpx solid #eee;
}
.cart-btn, .buy-btn { flex: 1; border-radius: 40rpx; }
</style>
