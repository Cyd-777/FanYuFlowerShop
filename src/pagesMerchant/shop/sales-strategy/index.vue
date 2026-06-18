<template>
  <view class="page-sales-strategy">
    <view class="toolbar">
      <view class="toolbar-title">节日主题</view>
      <nut-button
        size="small"
        :type="replaceMode ? 'primary' : 'default'"
        @click="toggleReplaceMode"
      >
        {{ replaceMode ? '取消切换' : '切换主题' }}
      </nut-button>
    </view>
    <view v-if="replaceMode" class="replace-tip">请选择要启用的节日主题</view>

    <view class="theme-grid">
      <view
        v-for="theme in themes"
        :key="theme.id"
        class="theme-card"
        :class="{
          active: activeThemeId === theme.id,
          replacing: replaceMode && pendingThemeId === theme.id,
        }"
        @click="onThemeClick(theme.id)"
      >
        <view
          class="theme-preview"
          :style="previewStyle(theme.id)"
        >
          <text class="theme-emoji">{{ theme.emoji }}</text>
        </view>
        <view class="theme-name">{{ theme.name }}</view>
        <view v-if="activeThemeId === theme.id" class="active-badge">使用中</view>
        <view v-else-if="theme.promoTag" class="theme-tag">{{ theme.promoTag }}</view>
      </view>
    </view>

    <view v-if="replaceMode" class="replace-actions">
      <nut-button
        type="primary"
        block
        :loading="activating"
        :disabled="!pendingThemeId"
        @click="confirmReplace"
      >
        确认切换为「{{ pendingThemeName }}」
      </nut-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDidShow } from '@tarojs/taro'
import { navigateTo } from '@/utils/router'
import { useShopStore } from '@/stores/shop'
import { SHOP_THEME_PRESETS, resolveActiveTheme } from '@/types/shopTheme'
import type { ShopThemeId } from '@/types/shopTheme'

const shopStore = useShopStore()
const themes = SHOP_THEME_PRESETS
const replaceMode = ref(false)
const pendingThemeId = ref<ShopThemeId | ''>('')
const activating = ref(false)

const activeThemeId = computed(() => shopStore.settings.decoration.activeThemeId)
const pendingThemeName = computed(() =>
  themes.find((item) => item.id === pendingThemeId.value)?.name || '',
)

useDidShow(() => {
  void shopStore.hydrate({ force: true })
})

function previewStyle(themeId: ShopThemeId) {
  const resolved = resolveActiveTheme({
    activeThemeId: themeId,
    themeConfigs: shopStore.settings.decoration.themeConfigs,
  })
  return {
    background: `linear-gradient(135deg, ${resolved.headerGradient[0]}, ${resolved.headerGradient[1]})`,
  }
}

function toggleReplaceMode() {
  replaceMode.value = !replaceMode.value
  pendingThemeId.value = ''
}

function onThemeClick(themeId: ShopThemeId) {
  if (replaceMode.value) {
    pendingThemeId.value = themeId
    return
  }
  navigateTo({ url: `/pagesMerchant/shop/sales-strategy/edit?themeId=${themeId}` })
}

async function confirmReplace() {
  if (!pendingThemeId.value || activating.value) return

  activating.value = true
  try {
    await shopStore.activateTheme(pendingThemeId.value)
    wx.showToast({ title: '主题已切换', icon: 'success' })
    replaceMode.value = false
    pendingThemeId.value = ''
  } catch (err) {
    wx.showToast({
      title: err instanceof Error ? err.message : '切换失败',
      icon: 'none',
    })
  } finally {
    activating.value = false
  }
}
</script>

<style lang="less">
.page-sales-strategy {
  min-height: 100vh;
  padding-bottom: 48rpx;
  background: #f8f8f8;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background: #fff;
  margin-bottom: 16rpx;
}
.toolbar-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}
.replace-tip {
  padding: 0 24rpx 16rpx;
  font-size: 24rpx;
  color: #e53935;
}
.theme-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
  padding: 0 16rpx;
}
.theme-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 16rpx;
  border: 2rpx solid transparent;
  position: relative;
  &.active { border-color: #43a047; }
  &.replacing { border-color: #e53935; box-shadow: 0 4rpx 16rpx rgba(229, 57, 53, 0.15); }
}
.theme-preview {
  height: 120rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.theme-emoji { font-size: 48rpx; }
.theme-name {
  margin-top: 12rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  text-align: center;
}
.theme-tag, .active-badge {
  margin-top: 6rpx;
  font-size: 22rpx;
  text-align: center;
}
.theme-tag { color: #e53935; }
.active-badge { color: #43a047; font-weight: 600; }
.replace-actions { margin: 32rpx 16rpx 0; }
</style>
