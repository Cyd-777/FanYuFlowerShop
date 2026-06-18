<template>
  <view class="page-wiki">
    <view class="header">
      <view class="title">{{ pageTitle }}</view>
      <view class="subtitle">{{ pageSubtitle }}</view>
    </view>

    <view class="search-wrap">
      <input
        class="search-input"
        :value="keyword"
        :placeholder="searchPlaceholder"
        confirm-type="search"
        @input="onKeywordInput"
        @confirm="loadWikiList"
      />
    </view>

    <view class="type-tabs">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="type-tab"
        :class="{ active: activeTab === tab.key }"
        @tap="switchTab(tab.key)"
      >
        <text class="tab-icon">{{ tab.icon }}</text>
        <text class="tab-label">{{ tab.label }}</text>
      </view>
    </view>

    <view v-if="loading" class="loading-text">{{ loadingText }}</view>

    <scroll-view v-else class="wiki-list" scroll-y>
      <view
        v-for="item in wikiList"
        :key="item._id"
        class="wiki-card"
        @tap="goDetail(item._id)"
      >
        <view class="wiki-icon">{{ item.icon }}</view>
        <view class="wiki-main">
          <view class="wiki-name">{{ displayName(item) }}</view>
          <view class="wiki-kind">{{ displaySubtitle(item) }}</view>
          <view class="wiki-preview">{{ tabPreview(item) }}</view>
        </view>
        <text class="wiki-arrow">{{ arrowText }}</text>
      </view>

      <view v-if="!wikiList.length" class="empty-text">{{ emptyText }}</view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useDidShow, useLoad, usePullDownRefresh } from '@tarojs/taro'
import { navigateTo } from '@/utils/router'
import { hasCacheEntry } from '@/utils/cache'
import { listPublicWiki, listPublicWikiCached } from '@/services/wiki'
import type { FlowerWikiListItem, WikiTab } from '@/types/wiki'
import {
  getWikiDisplayName,
  getWikiSubtitle,
  getWikiTabPreview,
} from '@/types/wiki'

const pageTitle = '花卉百科'
const pageSubtitle = '图鉴 · 养殖 · 花语，花店智库'
const searchPlaceholder = '搜索花卉名称或花语'
const loadingText = '正在加载云端智库...'
const emptyText = '暂无百科内容，请先在云数据库维护 flower_wiki'
const arrowText = '›'

const tabs: { key: WikiTab; label: string; icon: string }[] = [
  { key: 'atlas', label: '花卉图鉴', icon: '📖' },
  { key: 'care', label: '养殖指南', icon: '🌱' },
  { key: 'language', label: '花语百科', icon: '💬' },
]

const WIKI_CACHE_KEY = 'wiki:public:list'

const activeTab = ref<WikiTab>('atlas')
const keyword = ref('')
const loading = ref(false)
const wikiList = ref<FlowerWikiListItem[]>([])

useLoad((options) => {
  if (options?.tab === 'care' || options?.tab === 'language' || options?.tab === 'atlas') {
    activeTab.value = options.tab
  }
  void loadWikiList()
})

useDidShow(() => {
  void loadWikiList()
})

usePullDownRefresh(() => {
  void loadWikiList({ force: true }).finally(() => wx.stopPullDownRefresh())
})

function displayName(item: FlowerWikiListItem) {
  return getWikiDisplayName(item)
}

function displaySubtitle(item: FlowerWikiListItem) {
  return getWikiSubtitle(item)
}

function tabPreview(item: FlowerWikiListItem) {
  return getWikiTabPreview(item, activeTab.value) || '暂无内容'
}

function onKeywordInput(e: { detail: { value: string } }) {
  keyword.value = e.detail.value
}

function switchTab(tab: WikiTab) {
  activeTab.value = tab
}

async function loadWikiList(options?: { force?: boolean }) {
  const trimmed = keyword.value.trim()

  if (trimmed) {
    loading.value = true
    try {
      wikiList.value = await listPublicWiki(trimmed)
    } catch (err) {
      wx.showToast({
        title: err instanceof Error ? err.message : '加载失败',
        icon: 'none',
        duration: 3000,
      })
    } finally {
      loading.value = false
    }
    return
  }

  loading.value = options?.force ? true : !hasCacheEntry(WIKI_CACHE_KEY)
  try {
    const { data } = await listPublicWikiCached({
      force: options?.force,
      onUpdate: (list) => {
        wikiList.value = list
      },
    })
    wikiList.value = data
  } catch (err) {
    wx.showToast({
      title: err instanceof Error ? err.message : '加载失败',
      icon: 'none',
      duration: 3000,
    })
  } finally {
    loading.value = false
  }
}

function goDetail(id: string) {
  navigateTo({
    url: `/pagesCustomer/wiki/detail?id=${id}&tab=${activeTab.value}`,
  })
}
</script>

<style lang="less">
.page-wiki {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8f8f8;
  padding-bottom: 24rpx;
}
.type-tabs {
  display: flex;
  margin: 0 24rpx 16rpx;
  padding: 8rpx;
  background: #fff;
  border-radius: 16rpx;
}
.type-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 8rpx;
  border-radius: 12rpx;
  color: #999;
  &.active {
    background: #fff5f5;
    color: #e53935;
    .tab-label {
      font-weight: 600;
    }
  }
}
.header {
  padding: 32rpx 32rpx 16rpx;
  background: linear-gradient(180deg, #fff5f5 0%, #f8f8f8 100%);
}
.title {
  font-size: 40rpx;
  font-weight: 700;
  color: #333;
}
.subtitle {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #999;
}
.search-wrap {
  padding: 0 24rpx 16rpx;
}
.search-input {
  height: 72rpx;
  padding: 0 24rpx;
  background: #fff;
  border-radius: 36rpx;
  font-size: 26rpx;
}
.loading-text,
.empty-text {
  padding: 80rpx 32rpx;
  text-align: center;
  font-size: 26rpx;
  color: #999;
}
.wiki-list {
  flex: 1;
  min-height: 60vh;
  padding: 0 24rpx;
}
.wiki-card {
  display: flex;
  align-items: center;
  padding: 24rpx;
  margin-bottom: 16rpx;
  background: #fff;
  border-radius: 16rpx;
}
.wiki-icon {
  width: 88rpx;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  font-size: 44rpx;
  background: #fff5f5;
  border-radius: 16rpx;
  flex-shrink: 0;
}
.wiki-main {
  flex: 1;
  margin: 0 16rpx;
  min-width: 0;
}
.wiki-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}
.wiki-kind {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #e53935;
}
.wiki-preview {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #999;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.wiki-arrow {
  font-size: 36rpx;
  color: #ccc;
}
.tab-icon {
  font-size: 28rpx;
  line-height: 1.2;
}
.tab-label {
  margin-top: 4rpx;
  font-size: 22rpx;
}
</style>
