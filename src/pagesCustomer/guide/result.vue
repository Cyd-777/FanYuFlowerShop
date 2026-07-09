<template>
  <view class="page-guide-result">
    <AppNavBar />
    <!-- Summary of selections -->
    <view class="summary-card">
      <view class="summary-title">为你推荐</view>
      <view class="summary-tags">
        <view v-if="recipient" class="tag">{{ recipient }}</view>
        <view v-if="occasion" class="tag">{{ occasion }}</view>
        <view v-if="budgetLabel" class="tag">{{ budgetLabel }}</view>
      </view>
    </view>

    <template v-if="loading">
      <view class="section">
        <view class="section-title">推荐生成中...</view>
        <view class="loading-placeholder" />
      </view>
    </template>

    <template v-else-if="noResults">
      <!-- Placeholder for Phase 1 stub -->
      <view class="placeholder-section">
        <view class="placeholder-icon">🔮</view>
        <view class="placeholder-title">推荐功能开发中</view>
        <view class="placeholder-desc">
          智能推荐引擎正在训练中，敬请期待。你可以先逛逛成品花束或自选花材。
        </view>
        <view class="placeholder-actions">
          <nut-button
            type="primary"
            class="action-btn"
            @click="goShopping"
          >
            逛逛商城
          </nut-button>
        </view>
      </view>
    </template>

    <template v-else>
      <!-- Ready-made bouquets -->
      <view v-if="result.bouquets.length" class="section">
        <view class="section-title">成品花束</view>
        <scroll-view class="bouquet-scroll" scroll-x enhanced show-scrollbar>
          <view
            v-for="item in result.bouquets"
            :key="item.id"
            class="bouquet-card"
          >
            <image
              class="bouquet-img"
              :src="item.imageUrl || defaultBouquetImg"
              mode="aspectFill"
            />
            <view class="bouquet-name">{{ item.name }}</view>
            <view class="bouquet-price">¥{{ formatPrice(item.price) }}</view>
          </view>
        </scroll-view>
      </view>

      <!-- Flower suggestions grouped by category -->
      <view v-if="result.flowerSuggestions.length" class="section">
        <view class="section-title">搭配方案</view>
        <view
          v-for="group in flowerGroups"
          :key="group.categoryKey"
          class="flower-group"
        >
          <view class="flower-group-title">{{ group.categoryLabel }}</view>
          <view class="flower-items">
            <view
              v-for="item in group.items"
              :key="item.id"
              class="flower-item"
            >
              <image
                class="flower-img"
                :src="item.imageUrl || defaultFlowerImg"
                mode="aspectFill"
              />
              <view class="flower-name">{{ item.name }}</view>
              <view v-if="item.price" class="flower-price">
                ¥{{ formatPrice(item.price) }}
              </view>
              <view v-if="item.reason" class="flower-reason">{{ item.reason }}</view>
            </view>
          </view>
        </view>
      </view>
    </template>

    <!-- Bottom action: go to self-select -->
    <view class="bottom-bar">
      <nut-button
        type="primary"
        class="action-btn"
        @click="goSelfSelect"
      >
        自选花材
      </nut-button>
    </view>

    <ScrollListTailSpacer
      content-selector=".page-guide-result"
      :watch-key="`${loading}-${noResults}`"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Taro from '@tarojs/taro'
import { navigateTo } from '@/utils/router'
import { recommend } from '@/modules/recommend'
import type { RecommendResult, FlowerItem } from '@/modules/recommend'
import ScrollListTailSpacer from '@/components/ScrollListTailSpacer.vue'
import AppNavBar from '@/components/AppNavBar.vue'

const defaultBouquetImg = ''
const defaultFlowerImg = ''

const CATEGORY_LABELS: Record<string, string> = {
  main: '主花',
  accent: '点缀',
  foliage: '配叶',
  filler: '填充',
}

const CATEGORY_ORDER = ['main', 'accent', 'foliage', 'filler']

const loading = ref(true)
const result = ref<RecommendResult>({ bouquets: [], flowerSuggestions: [] })

const recipient = ref('')
const occasion = ref('')
const budget = ref<number | null>(null)
const preferReadyMade = ref(false)

const budgetLabel = computed(() => {
  if (budget.value == null) return ''
  if (budget.value <= 100) return '100元以内'
  if (budget.value <= 200) return '100-200元'
  if (budget.value <= 500) return '200-500元'
  return '500元以上'
})

const noResults = computed(() => {
  return (
    !loading.value &&
    result.value.bouquets.length === 0 &&
    result.value.flowerSuggestions.length === 0
  )
})

interface FlowerGroup {
  categoryKey: string
  categoryLabel: string
  items: FlowerItem[]
}

const flowerGroups = computed<FlowerGroup[]>(() => {
  const grouped: Record<string, FlowerItem[]> = {}
  for (const item of result.value.flowerSuggestions) {
    const key = item.category || 'other'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(item)
  }
  return CATEGORY_ORDER
    .filter((key) => grouped[key]?.length)
    .map((key) => ({
      categoryKey: key,
      categoryLabel: CATEGORY_LABELS[key] || key,
      items: grouped[key],
    }))
})

onMounted(async () => {
  const params = Taro.getCurrentInstance().router?.params || {}
  recipient.value = (params.recipient as string) || ''
  occasion.value = (params.occasion as string) || ''
  budget.value = params.budget ? Number(params.budget) : null
  preferReadyMade.value = params.preferReadyMade === '1'

  try {
    result.value = await recommend({
      mode: 'guide',
      data: {
        recipient: recipient.value || undefined,
        occasion: occasion.value || undefined,
        budget: budget.value ?? undefined,
        preferReadyMade: preferReadyMade.value,
      },
    })
  } catch (err) {
    console.error('[guide/result] recommend failed:', err)
  } finally {
    loading.value = false
  }
})

function formatPrice(price: number) {
  return Number(price).toFixed(2).replace(/\.00$/, '')
}

function goShopping() {
  Taro.switchTab({ url: '/pages/category/index' })
}

function goSelfSelect() {
  navigateTo({ url: '/pagesCustomer/customize/index' })
}
</script>

<style lang="less">
.page-guide-result {
  min-height: 100vh;
  background: @color-bg-page;
  padding-bottom: 140rpx;
}

.summary-card {
  background: #fff;
  margin: 16rpx;
  padding: 32rpx 24rpx;
  border-radius: 16rpx;
}

.summary-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
}

.summary-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.tag {
  padding: 8rpx 20rpx;
  background: @color-primary-light;
  border-radius: 24rpx;
  font-size: 24rpx;
  color: @color-primary;
}

.section {
  margin: 16rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 16rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
}

.loading-placeholder {
  height: 200rpx;
  background: linear-gradient(90deg, @color-bg-placeholder 25%, @color-bg-page 50%, @color-bg-placeholder 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
  border-radius: 12rpx;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Bouquet horizontal scroll */
.bouquet-scroll {
  white-space: nowrap;
  padding-bottom: 8rpx;
}

.bouquet-card {
  display: inline-block;
  width: 280rpx;
  margin-right: 16rpx;
  background: @color-bg-input;
  border-radius: 12rpx;
  overflow: hidden;
  vertical-align: top;
}

.bouquet-card:last-child {
  margin-right: 0;
}

.bouquet-img {
  width: 280rpx;
  height: 280rpx;
  background: @color-bg-placeholder;
  display: block;
}

.bouquet-name {
  padding: 12rpx 12rpx 4rpx;
  font-size: 26rpx;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bouquet-price {
  padding: 0 12rpx 12rpx;
  font-size: 24rpx;
  color: @color-primary;
  font-weight: 500;
}

/* Flower groups */
.flower-group {
  margin-bottom: 24rpx;
}

.flower-group:last-child {
  margin-bottom: 0;
}

.flower-group-title {
  font-size: 26rpx;
  font-weight: 500;
  color: #666;
  margin-bottom: 12rpx;
}

.flower-items {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.flower-item {
  width: calc(50% - 6rpx);
  background: @color-bg-input;
  border-radius: 12rpx;
  padding: 16rpx;
  box-sizing: border-box;
}

.flower-img {
  width: 100%;
  height: 180rpx;
  background: @color-bg-placeholder;
  border-radius: 8rpx;
  display: block;
}

.flower-name {
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #333;
}

.flower-price {
  font-size: 24rpx;
  color: @color-primary;
  margin-top: 4rpx;
}

.flower-reason {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #999;
  line-height: 1.4;
}

/* Placeholder empty state */
.placeholder-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 32rpx;
  text-align: center;
}

.placeholder-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.placeholder-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
}

.placeholder-desc {
  font-size: 26rpx;
  color: #999;
  line-height: 1.5;
  margin-bottom: 32rpx;
}

.placeholder-actions {
  display: flex;
  gap: 20rpx;
}

.action-btn {
  min-width: 240rpx;
}

/* Bottom bar */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 2rpx solid #eee;
  display: flex;
  justify-content: center;
}
</style>
