<template>
  <view class="page-flower-picker">
    <view class="cloud-banner">
      <text class="cloud-label">{{ cloudSourceLabel }}</text>
      <text v-if="!loading && catalog.length" class="cloud-stats">{{ cloudStatsText }}</text>
    </view>

    <view class="search-bar">
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

    <view v-else-if="catalog.length" class="picker-body">
      <scroll-view class="kind-panel" scroll-y>
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

      <scroll-view class="variety-panel" scroll-y>
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

    <view class="footer">
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
import { usePageData } from '@/composables/usePageData'

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
</script>

<style lang="less">
.page-flower-picker {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8f8f8;
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
}
.loading-wrap {
  padding: 24rpx;
}
.picker-body {
  flex: 1;
  display: flex;
  min-height: 0;
  margin: 16rpx;
  border-radius: 16rpx;
  overflow: hidden;
  background: #fff;
}
.kind-panel {
  width: 220rpx;
  background: #fafafa;
  max-height: calc(100vh - 360rpx);
}
.kind-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28rpx 12rpx;
  border-left: 6rpx solid transparent;
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
  flex: 1;
  padding: 24rpx;
  max-height: calc(100vh - 360rpx);
}
.kind-intro {
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
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
  padding: 20rpx 24rpx;
  margin-bottom: 12rpx;
  border-radius: 12rpx;
  background: #f8f8f8;
  border: 2rpx solid transparent;
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
  padding: 48rpx 0;
  text-align: center;
  font-size: 24rpx;
  color: #bbb;
}
.footer {
  padding: 16rpx 32rpx 32rpx;
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
