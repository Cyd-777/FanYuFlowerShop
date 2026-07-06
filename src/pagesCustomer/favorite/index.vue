<template>
  <view class="page-favorite" id="favorite-scroll-body">
    <AppNavBar />
    <view v-if="loading" class="loading-tip">{{ loadingTipText }}</view>

    <view v-else-if="list.length" class="goods-grid">
      <view
        v-for="item in list"
        :key="item._id"
        class="goods-card"
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
        <nut-button
          size="small"
          type="primary"
          plain
          :disabled="!canAddToCart(item)"
          @click.stop="addToCart(item)"
        >
          {{ canAddToCart(item) ? '加入购物车' : '暂不可购' }}
        </nut-button>
      </view>
    </view>

    <nut-empty v-else description="还没有收藏的商品" />
    <ScrollListTailSpacer
      content-selector="#favorite-scroll-body"
      :watch-key="`${loading}-${list.length}`"
    />
  </view>
</template>

<script setup lang="ts">
import { showToast } from '@/utils/feedback'
import { ref } from 'vue'
import { useDidShow } from '@tarojs/taro'
import { navigateToGoodsDetail } from '@/utils/router'
import { listFavoriteGoods } from '@/modules/favorite'
import { addGoodsToCart } from '@/services/cart'
import { hasToken } from '@/modules/auth'
import { attachGoodsCoverImages } from '@/utils/goodsImage'
import { isGoodsPurchasable } from '@/utils/goodsAvailability'
import GoodsSoldOutBadge from '@/components/GoodsSoldOutBadge.vue'
import GoodsNewListingBadge from '@/components/GoodsNewListingBadge.vue'
import GoodsImage from '@/components/GoodsImage.vue'
import GoodsPriceLabel from '@/components/GoodsPriceLabel.vue'
import type { Goods } from '@/types/goods'

const loadingTipText = '加载中…'

type FavoriteCard = Goods & { imageUrl: string; previewUrl: string }

const list = ref<FavoriteCard[]>([])
const loading = ref(false)

useDidShow(() => {
  void loadList()
})

async function loadList() {
  if (!hasToken()) {
    list.value = []
    return
  }

  loading.value = true
  try {
    const goods = await listFavoriteGoods()
    list.value = await attachGoodsCoverImages(goods)
  } catch (err) {
    list.value = []
    showToast({
      title: err instanceof Error ? err.message : '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

function canAddToCart(item: FavoriteCard) {
  return isGoodsPurchasable(item)
}

async function addToCart(item: FavoriteCard) {
  try {
    await addGoodsToCart(item._id, 1, item.imageUrl)
    showToast({ title: '已加入购物车', icon: 'success' })
  } catch (err) {
    showToast({
      title: err instanceof Error ? err.message : '加购失败',
      icon: 'none',
    })
  }
}

function goDetail(id: string, coverPreview?: string, coverFileId?: string) {
  void navigateToGoodsDetail(id, coverPreview, coverFileId)
}
</script>

<style lang="less">
.page-favorite {
  background: #f8f8f8;
  min-height: 100vh;
}
.loading-tip {
  padding: 80rpx 0;
  text-align: center;
  font-size: 26rpx;
  color: #999;
}
.goods-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
  padding: 16rpx;
}
.goods-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 16rpx;
  text-align: center;
}
.goods-img-wrap {
  position: relative;
}
.goods-img {
  width: 100%;
  height: 260rpx;
  border-radius: 8rpx;
  background: #f0f0f0;
}
.goods-name {
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.goods-price {
  color: #e53935;
  margin: 8rpx 0;
}
</style>
