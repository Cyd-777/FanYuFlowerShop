<template>
  <view class="page-customize-pick">
    <view class="tip">{{ pickTip }}</view>
    <GoodsCardSkeleton v-if="loading" variant="row" :count="5" />
    <view v-else-if="goodsList.length" class="goods-list">
      <view
        v-for="item in goodsList"
        :key="item._id"
        class="goods-item"
        :class="{ selected: isSelected(item._id), 'is-sold-out': item.stock <= 0 }"
        @click="toggleItem(item)"
      >
        <view class="check">{{ isSelected(item._id) ? '✓' : '' }}</view>
        <GoodsImage :src="item.imageUrl" root-class="thumb" />
        <view class="info">
          <view class="name">{{ item.name }}</view>
          <view class="price">¥{{ formatPrice(item.price) }}/{{ item.unit }}</view>
        </view>
      </view>
    </view>
    <view v-else class="empty">{{ emptyTip }}</view>

    <view class="action-bar">
      <view class="count">已选 {{ selectedIds.length }} 件</view>
      <nut-button type="primary" :disabled="!selectedIds.length" @click="confirmPick">
        确定
      </nut-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLoad } from '@tarojs/taro'
import { navigateBack } from '@/utils/router'
import { usePublicCategories } from '@/composables/usePublicCategories'
import { listPublicGoodsCached } from '@/services/goods'
import { attachGoodsCoverImages } from '@/utils/goodsImage'
import GoodsCardSkeleton from '@/components/GoodsCardSkeleton.vue'
import GoodsImage from '@/components/GoodsImage.vue'
import {
  CUSTOM_BOUQUET_DRAFT_KEY,
  CUSTOM_BOUQUET_ROLE_LABELS,
  createEmptyCustomBouquetDraft,
} from '@/types/customBouquet'
import type { CustomBouquetDraft, CustomBouquetGoodsItem, CustomBouquetPickRole } from '@/types/customBouquet'
import type { Goods } from '@/types/goods'

type GoodsCard = Goods & { imageUrl: string }

const role = ref<CustomBouquetPickRole>('flower')
const loading = ref(false)
const goodsList = ref<GoodsCard[]>([])
const selectedIds = ref<string[]>([])
const { categories, loadCategories } = usePublicCategories()

const roleLabel = computed(() => CUSTOM_BOUQUET_ROLE_LABELS[role.value])
const isMulti = computed(() => role.value === 'flower')
const pickTip = computed(() =>
  role.value === 'flower'
    ? '所有按「支」售卖的商品均可作为花材'
    : `从「${roleLabel.value}」分类商品中选择`,
)
const emptyTip = computed(() =>
  role.value === 'flower'
    ? '暂无按支售卖的商品。请让商家上架论支销售的花材。'
    : `暂无可用商品。请让商家创建「${roleLabel.value}」分类并上架商品。`,
)

useLoad((options) => {
  const rawRole = options?.role as CustomBouquetPickRole
  if (rawRole === 'flower' || rawRole === 'packaging' || rawRole === 'card') {
    role.value = rawRole
  }
  wx.setNavigationBarTitle({ title: `选择${roleLabel.value}` })

  const draft = wx.getStorageSync(CUSTOM_BOUQUET_DRAFT_KEY) as CustomBouquetDraft | ''
  if (draft && typeof draft === 'object') {
    if (role.value === 'flower') {
      selectedIds.value = draft.flowers.map((item) => item.goodsId)
    } else if (role.value === 'packaging' && draft.packaging) {
      selectedIds.value = [draft.packaging.goodsId]
    } else if (role.value === 'card' && draft.card) {
      selectedIds.value = [draft.card.goodsId]
    }
  }

  void loadGoods()
})

function isPickableGoods(item: Goods) {
  return item.onSale && item.stock > 0
}

async function loadGoods() {
  loading.value = true
  try {
    const { data } = await listPublicGoodsCached({})
    const withImages = await attachGoodsCoverImages(data)

    if (role.value === 'flower') {
      goodsList.value = withImages.filter(
        (item) => item.unit === '支' && isPickableGoods(item),
      )
    } else {
      await loadCategories()
      const categoryIds = categories.value
        .filter((item) => item.customRole === role.value)
        .map((item) => item._id)
      goodsList.value = withImages.filter(
        (item) => categoryIds.includes(item.categoryId) && isPickableGoods(item),
      )
    }
  } catch (err) {
    goodsList.value = []
    wx.showToast({
      title: err instanceof Error ? err.message : '加载商品失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

function formatPrice(price: number) {
  return Number(price).toFixed(2).replace(/\.00$/, '')
}

function isSelected(id: string) {
  return selectedIds.value.includes(id)
}

function toGoodsItem(item: GoodsCard): CustomBouquetGoodsItem {
  return {
    goodsId: item._id,
    name: item.name,
    price: item.price,
    unit: item.unit,
    image: item.imageUrl,
  }
}

function toggleItem(item: GoodsCard) {
  if (item.stock <= 0) return

  if (isMulti.value) {
    const idx = selectedIds.value.indexOf(item._id)
    if (idx >= 0) {
      selectedIds.value.splice(idx, 1)
    } else {
      selectedIds.value.push(item._id)
    }
    return
  }

  selectedIds.value = [item._id]
}

function confirmPick() {
  const picked = goodsList.value.filter((item) => selectedIds.value.includes(item._id))
  const draft = wx.getStorageSync(CUSTOM_BOUQUET_DRAFT_KEY) as CustomBouquetDraft | ''
  const next: CustomBouquetDraft = {
    ...createEmptyCustomBouquetDraft(),
    ...(draft && typeof draft === 'object' ? draft : {}),
  }

  if (role.value === 'flower') {
    next.flowers = picked.map(toGoodsItem)
  } else if (role.value === 'packaging') {
    next.packaging = picked[0] ? toGoodsItem(picked[0]) : null
  } else {
    next.card = picked[0] ? toGoodsItem(picked[0]) : null
  }

  wx.setStorageSync(CUSTOM_BOUQUET_DRAFT_KEY, next)
  navigateBack()
}
</script>

<style lang="less">
.page-customize-pick { min-height: 100vh; background: #f8f8f8; padding-bottom: 120rpx; }
.tip { padding: 20rpx 24rpx; font-size: 24rpx; color: #666; }
.goods-list { padding: 0 16rpx; }
.goods-item {
  display: flex; align-items: center; background: #fff; border-radius: 12rpx;
  padding: 16rpx; margin-bottom: 12rpx; border: 2rpx solid transparent;
  &.selected { border-color: #e53935; background: #fff5f5; }
  &.is-sold-out { opacity: 0.5; }
}
.check {
  width: 40rpx; height: 40rpx; border-radius: 50%; border: 2rpx solid #ddd;
  margin-right: 12rpx; display: flex; align-items: center; justify-content: center;
  font-size: 24rpx; color: #e53935;
}
.thumb { width: 120rpx; height: 120rpx; border-radius: 8rpx; background: #f0f0f0; }
.info { flex: 1; margin-left: 16rpx; }
.name { font-size: 26rpx; color: #333; }
.price { margin-top: 8rpx; font-size: 28rpx; color: #e53935; font-weight: 600; }
.empty { padding: 80rpx 32rpx; text-align: center; font-size: 26rpx; color: #999; line-height: 1.6; }
.action-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; align-items: center; padding: 16rpx 24rpx;
  background: #fff; border-top: 2rpx solid #eee;
  .count { flex: 1; font-size: 28rpx; color: #333; }
}
</style>
