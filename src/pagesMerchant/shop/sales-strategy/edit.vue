<template>
  <view class="page-theme-edit">
    <view class="section">
      <view class="section-title">主题色</view>
      <nut-form>
        <nut-form-item label="主色">
          <nut-input v-model="form.primaryColor" placeholder="如 #e53935" />
        </nut-form-item>
        <nut-form-item label="渐变起">
          <nut-input v-model="form.gradientStart" placeholder="如 #fce4ec" />
        </nut-form-item>
        <nut-form-item label="渐变止">
          <nut-input v-model="form.gradientEnd" placeholder="如 #f8bbd0" />
        </nut-form-item>
        <nut-form-item label="副标题">
          <nut-input v-model="form.homeSubtitle" placeholder="首页副标题" />
        </nut-form-item>
        <nut-form-item label="促销标签">
          <nut-input v-model="form.promoTag" placeholder="如 情人节特惠" />
        </nut-form-item>
      </nut-form>
    </view>

    <view class="section">
      <view class="section-title">主视觉 Banner</view>
      <view class="banner-box" @click="chooseBanner">
        <image v-if="bannerPreview" class="banner-img" :src="bannerPreview" mode="aspectFill" />
        <view v-else class="banner-placeholder">+ 上传 Banner</view>
      </view>
      <view v-if="bannerPreview" class="clear-banner" @click="clearBanner">清除 Banner</view>
    </view>

    <view class="section">
      <view class="section-head">
        <view class="section-title">折扣设置</view>
        <view class="link" @click="addDiscount">+ 添加折扣</view>
      </view>
      <view v-if="!discounts.length" class="empty">暂无折扣，可添加多档折扣并分别选商品</view>
      <view v-for="rule in discounts" :key="rule.id" class="discount-card">
        <view class="discount-row">
          <text class="label">折扣（折）</text>
          <nut-input
            v-model="rule.rateText"
            type="digit"
            placeholder="如 8.5"
          />
        </view>
        <view class="discount-row goods-row">
          <text class="label">适用商品</text>
          <view class="goods-pick" @click="pickGoods(rule.id)">
            已选 {{ rule.goodsIds.length }} 件 ›
          </view>
        </view>
        <view class="goods-names">{{ goodsNames(rule.goodsIds) }}</view>
        <view class="remove" @click="removeDiscount(rule.id)">删除此折扣</view>
      </view>
    </view>

    <nut-button type="primary" block class="save-btn" :loading="saving" @click="save">
      保存策略
    </nut-button>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useDidShow } from '@tarojs/taro'
import { navigateTo } from '@/utils/router'
import { usePageData } from '@/composables/usePageData'
import { uploadGoodsImage } from '@/services/goods'
import { resolveCloudImageUrl } from '@/utils/goodsImage'
import { getShopThemePreset } from '@/types/shopTheme'
import {
  readMerchantGoodsPick,
  writeMerchantGoodsPick,
  markMerchantGoodsPickConsumed,
} from '@/types/merchantPick'
import type { ThemeDiscountRule } from '@/types/shop'

interface DiscountFormItem {
  id: string
  rateText: string
  goodsIds: string[]
}

const { shopStore, themeId, goodsList, ensuring } = usePageData()
const saving = ref(false)
const bannerFileId = ref('')
const bannerPreview = ref('')

const form = ref({
  primaryColor: '',
  gradientStart: '',
  gradientEnd: '',
  homeSubtitle: '',
  promoTag: '',
})

const discounts = ref<DiscountFormItem[]>([])
const discountsDirty = ref(false)
let formHydrated = false

watch(
  () => ensuring.value,
  (loading) => {
    if (!loading && !formHydrated) {
      hydrateForm()
      applyPickResult()
      formHydrated = true
    }
  },
)

useDidShow(() => {
  applyPickResult()
})

function applyPickResult() {
  const pickCtx = readMerchantGoodsPick()
  if (!pickCtx || pickCtx.consumed) return

  const idx = discounts.value.findIndex((item) => item.id === pickCtx.ruleId)
  if (idx < 0) {
    discounts.value = [
      ...discounts.value,
      {
        id: pickCtx.ruleId,
        rateText: '9',
        goodsIds: [...pickCtx.selectedIds],
      },
    ]
  } else {
    discounts.value = discounts.value.map((item, i) =>
      i === idx ? { ...item, goodsIds: [...pickCtx.selectedIds] } : item,
    )
  }
  discountsDirty.value = true
  markMerchantGoodsPickConsumed()
}

function hydrateForm() {
  const preset = getShopThemePreset(themeId.value)
  const saved = shopStore.settings.decoration.themeConfigs[themeId.value] || {}

  form.value = {
    primaryColor: saved.primaryColor || preset.primaryColor,
    gradientStart: saved.headerGradient?.[0] || preset.headerGradient[0],
    gradientEnd: saved.headerGradient?.[1] || preset.headerGradient[1],
    homeSubtitle: saved.homeSubtitle ?? preset.homeSubtitle,
    promoTag: saved.promoTag ?? preset.promoTag,
  }

  bannerFileId.value = saved.bannerImage || ''
  void resolveCloudImageUrl(bannerFileId.value).then((url) => {
    bannerPreview.value = url
  })

  if (discountsDirty.value) return

  discounts.value = (saved.discounts || []).map((rule) => ({
    id: rule.id,
    rateText: String(Math.round(rule.rate * 100) / 10),
    goodsIds: [...rule.goodsIds],
  }))
}

function goodsNames(ids: string[]) {
  if (!ids.length) return '尚未选择商品'
  return goodsList.value
    .filter((item) => ids.includes(item._id))
    .map((item) => item.name)
    .join('、')
}

function addDiscount() {
  discountsDirty.value = true
  discounts.value.push({
    id: `discount_${Date.now()}`,
    rateText: '9',
    goodsIds: [],
  })
}

function removeDiscount(id: string) {
  discountsDirty.value = true
  discounts.value = discounts.value.filter((item) => item.id !== id)
}

function pickGoods(ruleId: string) {
  const rule = discounts.value.find((item) => item.id === ruleId)
  writeMerchantGoodsPick({
    ruleId,
    selectedIds: rule?.goodsIds || [],
    consumed: false,
  })
  navigateTo({ url: '/pagesMerchant/shop/goods-picker' })
}

async function chooseBanner() {
  try {
    const res = await wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
    })
    const file = res.tempFiles[0]
    if (!file?.tempFilePath) return

    wx.showLoading({ title: '上传中' })
    const fileID = await uploadGoodsImage(file.tempFilePath)
    bannerFileId.value = fileID
    bannerPreview.value = file.tempFilePath
  } catch (err) {
    if ((err as { errMsg?: string }).errMsg?.includes('cancel')) return
    wx.showToast({
      title: err instanceof Error ? err.message : '上传失败',
      icon: 'none',
    })
  } finally {
    wx.hideLoading()
  }
}

function clearBanner() {
  bannerFileId.value = ''
  bannerPreview.value = ''
}

function parseRateText(text: string): number | null {
  const value = Number(text)
  if (!value || value <= 0) return null
  const rate = value > 1 ? value / 10 : value
  if (rate <= 0 || rate > 1) return null
  return Math.round(rate * 1000) / 1000
}

function buildDiscounts(): ThemeDiscountRule[] {
  return discounts.value
    .map((item) => {
      const rate = parseRateText(item.rateText)
      if (!rate || !item.goodsIds.length) return null
      return {
        id: item.id,
        rate,
        goodsIds: [...item.goodsIds],
      }
    })
    .filter(Boolean) as ThemeDiscountRule[]
}

async function save() {
  if (saving.value) return

  saving.value = true
  try {
    await shopStore.saveTheme(themeId.value, {
      primaryColor: form.value.primaryColor.trim(),
      headerGradient: [form.value.gradientStart.trim(), form.value.gradientEnd.trim()],
      homeSubtitle: form.value.homeSubtitle.trim(),
      promoTag: form.value.promoTag.trim(),
      bannerImage: bannerFileId.value,
      discounts: buildDiscounts(),
    })
    discountsDirty.value = false
    wx.showToast({ title: '已保存', icon: 'success' })
  } catch (err) {
    wx.showToast({
      title: err instanceof Error ? err.message : '保存失败',
      icon: 'none',
    })
  } finally {
    saving.value = false
  }
}
</script>

<style lang="less">
.page-theme-edit { min-height: 100vh; background: #f8f8f8; padding-bottom: 48rpx; }
.section { background: #fff; margin-bottom: 16rpx; padding: 24rpx; }
.section-head { display: flex; justify-content: space-between; align-items: center; }
.section-title { font-size: 28rpx; font-weight: 600; color: #333; margin-bottom: 16rpx; }
.link { font-size: 26rpx; color: #e53935; }
.banner-box {
  height: 280rpx; border-radius: 12rpx; overflow: hidden;
  background: #fafafa; border: 2rpx dashed #e0e0e0;
}
.banner-img { width: 100%; height: 100%; }
.banner-placeholder {
  height: 100%; display: flex; align-items: center; justify-content: center;
  color: #bbb; font-size: 28rpx;
}
.clear-banner { margin-top: 12rpx; font-size: 24rpx; color: #e53935; text-align: right; }
.empty { font-size: 24rpx; color: #999; }
.discount-card {
  margin-top: 16rpx; padding: 16rpx; background: #fafafa; border-radius: 12rpx;
}
.discount-row { display: flex; align-items: center; margin-bottom: 12rpx; }
.label { width: 160rpx; font-size: 24rpx; color: #666; flex-shrink: 0; }
.goods-pick { flex: 1; font-size: 26rpx; color: #e53935; text-align: right; }
.goods-names { font-size: 22rpx; color: #999; line-height: 1.5; }
.remove { margin-top: 8rpx; font-size: 24rpx; color: #e53935; text-align: right; }
.save-btn { margin: 24rpx 16rpx 0; border-radius: 48rpx; height: 96rpx; }
</style>
