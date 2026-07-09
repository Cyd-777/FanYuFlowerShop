<template>
  <view class="page-theme-edit">
    <AppNavBar />
    <view class="section">
      <view class="section-title">{{ themeColorLabelText }}</view>
      <nut-form>
        <nut-form-item label="主色">
          <nut-input v-model="form.primaryColor" placeholder="如 @color-primary" />
        </nut-form-item>
        <nut-form-item label="渐变起">
          <nut-input v-model="form.gradientStart" placeholder="如 @color-primary-light" />
        </nut-form-item>
        <nut-form-item label="渐变止">
          <nut-input v-model="form.gradientEnd" placeholder="如 @color-primary-border" />
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
      <view class="section-head">
        <view class="section-title">{{ uiText_2fe4f0 }}</view>
        <view class="link-group">
          <view
            class="link"
            :class="{ disabled: banners.length >= maxBanners }"
            @click="chooseBanner"
          >
            + 上传
          </view>
          <view
            class="link"
            :class="{ disabled: banners.length >= maxBanners }"
            @click="pickFromAssetBanner"
          >
            素材库
          </view>
        </view>
      </view>
      <view v-if="!banners.length" class="banner-empty">{{ uiText_d72e2c }}</view>
      <view v-else class="banner-grid">
        <view v-for="(item, index) in banners" :key="item.fileId" class="banner-thumb">
          <GoodsImage
            :preview-src="item.preview"
            root-class="banner-thumb-img"
            mode="aspectFill"
          />
          <view class="banner-thumb-remove" @click.stop="removeBanner(index)">×</view>
        </view>
      </view>
      <view v-if="banners.length" class="banner-hint">已上传 {{ banners.length }}/{{ maxBanners }} 张，首页将自动轮播</view>
    </view>

    <view class="section">
      <view class="section-head">
        <view class="section-title">{{ uiText_7cd925 }}</view>
        <view class="link" @click="addDiscount">+ 添加折扣</view>
      </view>
      <view v-if="!discounts.length" class="empty">{{ uiText_21fc06 }}</view>
      <view v-for="rule in discounts" :key="rule.id" class="discount-card">
        <view class="discount-row">
          <text class="label">{{ uiText_4e94fe }}</text>
          <nut-input
            v-model="rule.rateText"
            type="digit"
            placeholder="如 8.5"
          />
        </view>
        <view class="discount-row goods-row">
          <text class="label">{{ uiText_409ea3 }}</text>
          <view class="goods-pick" @click="pickGoods(rule.id)">
            已选 {{ rule.goodsIds.length }} 件 ›
          </view>
        </view>
        <view class="goods-names">{{ goodsNames(rule.goodsIds) }}</view>
        <view class="remove" @click="removeDiscount(rule.id)">{{ uiText_246932 }}</view>
      </view>
    </view>

    <view class="page-actions">
      <nut-button type="primary" block class="action-btn" :loading="saving" @click="save">
        保存策略
      </nut-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { showToast } from '@/utils/feedback'
import { ref, watch } from 'vue'
import { useDidShow } from '@tarojs/taro'
import { navigateTo } from '@/utils/router'
import { usePageData } from '@/composables/usePageData'
import { uploadAndProcessImage } from '@/modules/asset'
import { readAssetPick, markAssetPickConsumed } from '@/types/assetPick'
import { resolveCloudImageUrl } from '@/utils/goodsImage'
import GoodsImage from '@/components/GoodsImage.vue'
import { getShopThemePreset, resolveThemeBannerFileIds } from '@/types/shopTheme'
import {
  readMerchantGoodsPick,
  writeMerchantGoodsPick,
  markMerchantGoodsPickConsumed,
} from '@/types/merchantPick'
import type { ThemeDiscountRule } from '@/types/shop'
import { filterChooseMediaFiles } from '@/utils/uploadImageLimit'

const themeColorLabelText = '主题色'
const uiText_21fc06 = '暂无折扣，可添加多档折扣并分别选商品'
const uiText_246932 = '删除此折扣'
const uiText_2fe4f0 = '轮播 Banner'
const uiText_409ea3 = '适用商品'
const uiText_4e94fe = '折扣（折）'
const uiText_7cd925 = '折扣设置'
const uiText_d72e2c = '暂无轮播图，点击右上角上传'

interface DiscountFormItem {
  id: string
  rateText: string
  goodsIds: string[]
}

interface BannerItem {
  fileId: string
  preview: string
}

const MAX_BANNERS = 5

const { shopStore, themeId, goodsList, ensuring } = usePageData()
const saving = ref(false)
const maxBanners = MAX_BANNERS
const banners = ref<BannerItem[]>([])

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
  applyAssetBannerPick()
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

  void loadBannersFromConfig(saved)

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

async function loadBannersFromConfig(saved: { bannerImage?: string; bannerImages?: string[] }) {
  const fileIds = resolveThemeBannerFileIds(saved)
  if (!fileIds.length) {
    banners.value = []
    return
  }
  const items = await Promise.all(
    fileIds.map(async (fileId) => ({
      fileId,
      preview: (await resolveCloudImageUrl(fileId)) || fileId,
    })),
  )
  banners.value = items
}

function removeBanner(index: number) {
  banners.value = banners.value.filter((_, i) => i !== index)
}

async function chooseBanner() {
  const remaining = MAX_BANNERS - banners.value.length
  if (remaining <= 0) {
    showToast({ title: `最多上传 ${MAX_BANNERS} 张`, icon: 'none' })
    return
  }

  try {
    const res = await wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
    })
    const files = filterChooseMediaFiles(res.tempFiles || [])
    if (!files.length) return

    wx.showLoading({ title: '上传中' })
    for (const file of files) {
      if (!file?.tempFilePath) continue
      const name = `Banner_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      const result = await uploadAndProcessImage(file.tempFilePath, name, 'banner')
      banners.value.push({
        fileId: result.originalFileId,
        preview: file.tempFilePath,
      })
    }
  } catch (err) {
    if ((err as { errMsg?: string }).errMsg?.includes('cancel')) return
    showToast({
      title: err instanceof Error ? err.message : '上传失败',
      icon: 'none',
    })
  } finally {
    wx.hideLoading()
  }
}

function pickFromAssetBanner() {
  navigateTo({ url: '/pagesMerchant/asset/index?picker=1&type=banner' })
}

function applyAssetBannerPick() {
  const pick = readAssetPick()
  if (!pick || pick.consumed) return
  markAssetPickConsumed()
  if (banners.value.length >= MAX_BANNERS) {
    showToast({ title: `最多 ${MAX_BANNERS} 张 Banner`, icon: 'none' })
    return
  }
  banners.value.push({
    fileId: pick.originalFileId,
    preview: pick.originalFileId,
  })
  showToast({ title: '已添加 Banner', icon: 'success' })
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
    const bannerFileIds = banners.value.map((item) => item.fileId).filter(Boolean)
    await shopStore.saveTheme(themeId.value, {
      primaryColor: form.value.primaryColor.trim(),
      headerGradient: [form.value.gradientStart.trim(), form.value.gradientEnd.trim()],
      homeSubtitle: form.value.homeSubtitle.trim(),
      promoTag: form.value.promoTag.trim(),
      bannerImages: bannerFileIds,
      bannerImage: bannerFileIds[0] || '',
      discounts: buildDiscounts(),
    })
    discountsDirty.value = false
    showToast({ title: '已保存', icon: 'success' })
  } catch (err) {
    showToast({
      title: err instanceof Error ? err.message : '保存失败',
      icon: 'none',
    })
  } finally {
    saving.value = false
  }
}
</script>

<style lang="less">
.page-theme-edit {
  min-height: 100vh;
  background: @color-bg-page;
  padding-bottom: 48rpx;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
}
.section { background: #fff; margin-bottom: 16rpx; padding: 24rpx; box-sizing: border-box; }
.section-head { display: flex; justify-content: space-between; align-items: center; }
.link-group { display: flex; gap: 16rpx; }
.section-title { font-size: 28rpx; font-weight: 600; color: #333; margin-bottom: 16rpx; }
.link { font-size: 26rpx; color: @color-primary; }
.link.disabled { color: #ccc; }
.banner-empty {
  padding: 48rpx 0; text-align: center; color: #bbb; font-size: 26rpx;
}
.banner-grid {
  display: flex; flex-wrap: wrap; gap: 16rpx;
}
.banner-thumb {
  position: relative; width: calc((100% - 32rpx) / 3); height: 180rpx;
  border-radius: 12rpx; overflow: hidden; background: @color-bg-input;
}
.banner-thumb-img { width: 100%; height: 100%; }
.banner-thumb-remove {
  position: absolute; top: 8rpx; right: 8rpx; width: 40rpx; height: 40rpx;
  line-height: 36rpx; text-align: center; border-radius: 50%;
  background: rgba(0, 0, 0, 0.45); color: #fff; font-size: 28rpx;
}
.banner-hint { margin-top: 12rpx; font-size: 22rpx; color: #999; }
.empty { font-size: 24rpx; color: #999; }
.discount-card {
  margin-top: 16rpx; padding: 16rpx; background: @color-bg-input; border-radius: 12rpx;
}
.discount-row { display: flex; align-items: center; margin-bottom: 12rpx; }
.label { width: 160rpx; font-size: 24rpx; color: #666; flex-shrink: 0; }
.goods-pick { flex: 1; font-size: 26rpx; color: @color-primary; text-align: right; }
.goods-names { font-size: 22rpx; color: #999; line-height: 1.5; }
.remove { margin-top: 8rpx; font-size: 24rpx; color: @color-primary; text-align: right; }
.page-actions {
  padding: 24rpx 16rpx 0;
  box-sizing: border-box;
}
.action-btn {
  width: 100%;
  max-width: 100%;
  border-radius: 48rpx;
  height: 96rpx;
  box-sizing: border-box;
}
</style>
