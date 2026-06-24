<template>
  <view class="page-flower-picker">
    <AppNavBar />
    <view class="cloud-banner">
      <text class="cloud-label">{{ cloudSourceLabel }}</text>
      <text v-if="!loading && catalog.length" class="cloud-stats">{{ cloudStatsText }}</text>
    </view>

    <view id="flower-picker-scroll-anchor" class="search-bar">
      <nut-searchbar
        v-model="keyword"
        :placeholder="searchPlaceholder"
        @search="handleSearch"
        @clear="handleSearch"
      />
    </view>

    <view v-if="loading" class="loading-wrap">
      <nut-skeleton rows="6" animated />
    </view>

    <view v-else-if="catalog.length" class="picker-body" :style="pickerBodyStyle">
      <scroll-view
        class="kind-panel"
        :scroll-y="true"
        :enhanced="true"
        :show-scrollbar="false"
        :style="kindScrollStyle"
      >
        <view
          v-for="kind in catalog"
          :key="kind._id"
          class="kind-item"
          :class="{ active: activeKindId === kind._id }"
          @click="selectKind(kind._id)"
        >
          <text class="kind-icon">{{ kind.icon }}</text>
          <text class="kind-name">{{ kind.name }}</text>
        </view>
      </scroll-view>

      <scroll-view
        class="variety-panel"
        :scroll-y="true"
        :enhanced="true"
        :show-scrollbar="false"
        :style="varietyScrollStyle"
      >
        <view v-if="activeKind" class="kind-intro">
          <view class="intro-title">{{ activeKind.name }}</view>
          <view class="intro-desc">{{ activeKind.description }}</view>
        </view>

        <view
          v-for="item in activeVarieties"
          :key="item._id"
          class="variety-item"
          :class="{ active: selectedVarietyId === item._id }"
          @click="selectVariety(item._id)"
        >
          <view class="variety-name">{{ item.name }}</view>
          <view v-if="item.description" class="variety-desc">{{ item.description }}</view>
        </view>

        <view v-if="!activeVarieties.length" class="empty-varieties">
          {{ emptyVarietyText }}
        </view>
      </scroll-view>
    </view>

    <nut-empty v-else :description="emptyCatalogText" />

    <view id="flower-picker-footer" class="footer">
      <view v-if="selectedLabel" class="selected-tip">{{ selectedLabel }}</view>
      <nut-button
        type="primary"
        block
        class="confirm-btn"
        :disabled="!canConfirm"
        @click="confirmPick"
      >
        {{ confirmText }}
      </nut-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import Taro, { useDidShow, useReady } from '@tarojs/taro'
import { usePageData } from '@/composables/usePageData'
import { useScrollAreaBelow } from '@/composables/useScrollAreaBelow'

const KIND_WIDTH_RPX = 220
/** 底栏首帧兜底（实测后会覆盖） */
const FOOTER_FALLBACK_RPX = 140

function rpxToPx(rpx: number) {
  const { windowWidth } = Taro.getWindowInfo()
  return Math.floor((rpx * windowWidth) / 750)
}

const {
  cloudSourceLabel,
  searchPlaceholder,
  emptyVarietyText,
  emptyCatalogText,
  confirmText,
  loading,
  keyword,
  catalog,
  activeKindId,
  selectedVarietyId,
  activeKind,
  activeVarieties,
  cloudStatsText,
  canConfirm,
  selectedLabel,
  selectKind,
  selectVariety,
  handleSearch,
  confirmPick,
} = usePageData()

const { topPx, remeasure: remeasureAnchor } = useScrollAreaBelow('#flower-picker-scroll-anchor')

const footerHeightPx = ref(rpxToPx(FOOTER_FALLBACK_RPX))

function measureFooter() {
  Taro.createSelectorQuery()
    .select('#flower-picker-footer')
    .boundingClientRect()
    .exec((res) => {
      const height = (res?.[0] as { height?: number } | undefined)?.height ?? 0
      if (height > 0) {
        footerHeightPx.value = Math.ceil(height)
      }
    })
}

function remeasureLayout() {
  remeasureAnchor()
  void nextTick(() => {
    measureFooter()
    setTimeout(measureFooter, 80)
  })
}

useReady(remeasureLayout)
useDidShow(remeasureLayout)

const bodyHeightPx = computed(() => {
  const { windowHeight } = Taro.getWindowInfo()
  return Math.max(0, Math.floor(windowHeight - topPx.value - footerHeightPx.value))
})

const kindWidthPx = computed(() => rpxToPx(KIND_WIDTH_RPX))

const pickerBodyStyle = computed(() => ({
  top: `${topPx.value}px`,
  bottom: `${footerHeightPx.value}px`,
}))

const kindScrollStyle = computed(() => ({
  width: `${kindWidthPx.value}px`,
  height: `${bodyHeightPx.value}px`,
}))

const varietyScrollStyle = computed(() => {
  const { windowWidth } = Taro.getWindowInfo()
  return {
    width: `${Math.max(0, windowWidth - kindWidthPx.value)}px`,
    height: `${bodyHeightPx.value}px`,
  }
})

watch(
  () => [catalog.value.length, loading.value, selectedLabel.value] as const,
  () => {
    remeasureLayout()
  },
)
</script>

<style lang="less">
.page-flower-picker {
  height: 100vh;
  overflow: hidden;
  background: #fff;
}
.cloud-banner {
  padding: 16rpx 24rpx;
  background: #fff7e6;
  border-bottom: 1rpx solid #ffe7ba;
}
.cloud-label {
  display: block;
  font-size: 22rpx;
  color: #d48806;
}
.cloud-stats {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #ad6800;
  font-weight: 600;
}
.search-bar {
  background: #fff;
  padding: 16rpx 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}
.loading-wrap {
  padding: 24rpx;
}
.picker-body {
  position: fixed;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: row;
  overflow: hidden;
  background: #fff;
  z-index: 1;
}
.kind-panel {
  flex: none;
  box-sizing: border-box;
  background: #fafafa;
}
.kind-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28rpx 12rpx;
  border-left: 6rpx solid transparent;
  box-sizing: border-box;
  &.active {
    background: #fff;
    border-left-color: #e53935;
    .kind-name {
      color: #e53935;
      font-weight: 600;
    }
  }
}
.kind-icon {
  font-size: 36rpx;
  margin-bottom: 8rpx;
}
.kind-name {
  font-size: 24rpx;
  color: #666;
  text-align: center;
}
.variety-panel {
  flex: none;
  box-sizing: border-box;
}
.kind-intro {
  margin-bottom: 20rpx;
  padding: 24rpx 24rpx 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}
.intro-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}
.intro-desc {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #999;
  line-height: 1.5;
}
.variety-item {
  margin: 0 24rpx 12rpx;
  padding: 20rpx 24rpx;
  border-radius: 12rpx;
  background: #f8f8f8;
  border: 2rpx solid transparent;
  box-sizing: border-box;
  &.active {
    background: #fce4ec;
    border-color: #f8bbd0;
    .variety-name {
      color: #e53935;
      font-weight: 600;
    }
  }
}
.variety-name {
  font-size: 28rpx;
  color: #333;
}
.variety-desc {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #999;
  line-height: 1.4;
}
.empty-varieties {
  padding: 48rpx 24rpx;
  text-align: center;
  font-size: 24rpx;
  color: #bbb;
}
.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  padding: 16rpx 32rpx calc(16rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.selected-tip {
  margin-bottom: 12rpx;
  font-size: 24rpx;
  color: #666;
  text-align: center;
}
.confirm-btn {
  border-radius: 48rpx;
  height: 96rpx;
  font-size: 30rpx;
}
</style>
