<template>
  <view class="page-notify-list" id="notify-list-scroll-body">
    <AppNavBar :title="pageTitle" />
    <AppFeedbackHost />

    <view class="notify-filters">
      <view
        v-for="tab in filterTabs"
        :key="tab.key"
        class="notify-filter"
        :class="{ 'notify-filter--active': activeCategory === tab.key }"
        @tap="setCategory(tab.key)"
      >
        {{ tab.label }}
      </view>
    </view>

    <view v-if="loading" class="notify-empty">{{ loadingText }}</view>
    <view v-else-if="!items.length" class="notify-empty">{{ emptyText }}</view>

    <view v-else class="notify-list">
      <view
        v-for="item in items"
        :key="item._id"
        class="notify-item"
        :class="{ 'notify-item--unread': !item.read }"
        @tap="openItem(item)"
      >
        <view class="notify-item__head">
          <text class="notify-item__type">{{ typeLabel(item) }}</text>
          <text class="notify-item__time">{{ formatTime(item.createdAt) }}</text>
        </view>
        <view class="notify-item__title">{{ item.title }}</view>
        <view class="notify-item__body">{{ item.body }}</view>
        <view v-if="item.fromUserId && item.fromName" class="notify-item__from">
          来自 {{ item.fromName }}
        </view>
      </view>
    </view>

    <view v-if="items.length" class="notify-actions">
      <nut-button size="small" plain @click="markAllRead">全部已读</nut-button>
    </view>

    <ScrollListTailSpacer content-selector="#notify-list-scroll-body" :watch-key="items.length" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useDidShow, useLoad } from '@tarojs/taro'
import AppFeedbackHost from '@/components/AppFeedbackHost.vue'
import { showToast } from '@/utils/feedback'
import { navigateTo } from '@/utils/router'
import {
  formatNotifyTime,
  listBizNotifications,
  markBizNotificationsRead,
  notifyTypeLabel,
  type BizNotification,
  type NotifyListCategory,
} from '@/modules/notify'
import { useNotificationStore } from '@/stores/notification'

const pageTitle = '消息通知'
const loadingText = '加载中…'
const emptyText = '暂无通知'

const filterTabs: { key: NotifyListCategory; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'order', label: '订单' },
  { key: 'stock', label: '库存' },
]

const loading = ref(true)
const items = ref<BizNotification[]>([])
const activeCategory = ref<NotifyListCategory>('all')
const notifyStore = useNotificationStore()

function typeLabel(item: BizNotification) {
  return notifyTypeLabel(item)
}

function formatTime(raw?: string | Date) {
  return formatNotifyTime(raw)
}

function listCategoryParam(): 'order' | 'stock' | undefined {
  if (activeCategory.value === 'order' || activeCategory.value === 'stock') {
    return activeCategory.value
  }
  return undefined
}

async function loadList() {
  loading.value = true
  try {
    const result = await listBizNotifications(50, listCategoryParam())
    items.value = result.list
    notifyStore.setUnread(result.unread)
  } catch (err) {
    showToast({
      title: err instanceof Error ? err.message : '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

function setCategory(key: NotifyListCategory) {
  if (activeCategory.value === key) return
  activeCategory.value = key
  void loadList()
}

async function openItem(item: BizNotification) {
  if (!item.read) {
    try {
      const unread = await markBizNotificationsRead({ ids: [item._id] })
      notifyStore.setUnread(unread)
      item.read = true
    } catch {
      /* ignore */
    }
  }

  const link = item.context?.linkPath
  if (link) {
    navigateTo({ url: link })
  }
}

async function markAllRead() {
  try {
    const unread = await markBizNotificationsRead({ all: true })
    items.value = items.value.map((item) => ({ ...item, read: true }))
    notifyStore.setUnread(unread)
    showToast({ title: '已全部标记已读', icon: 'success' })
  } catch (err) {
    showToast({
      title: err instanceof Error ? err.message : '操作失败',
      icon: 'none',
    })
  }
}

useLoad(() => {
  void loadList()
})

useDidShow(() => {
  void loadList()
})
</script>

<style lang="less">
@import '@/styles/tokens.less';
.page-notify-list {
  min-height: 100vh;
  background: @color-bg-muted;
  padding-bottom: 120rpx;
}

.notify-filters {
  display: flex;
  gap: 16rpx;
  padding: 16rpx 24rpx 0;
}

.notify-filter {
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  background: #fff;
  color: #666;
  font-size: 26rpx;

  &--active {
    background: @color-wiki-green-dark;
    color: #fff;
  }
}

.notify-empty {
  padding: 120rpx 32rpx;
  text-align: center;
  color: #888;
  font-size: 28rpx;
}

.notify-list {
  padding: 16rpx;
}

.notify-item {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;

  &--unread {
    border-left: 6rpx solid @color-wiki-green-dark;
  }

  &__head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12rpx;
  }

  &__type {
    font-size: 22rpx;
    color: @color-wiki-green-dark;
    background: rgba(45, 80, 22, 0.08);
    padding: 4rpx 12rpx;
    border-radius: 8rpx;
  }

  &__time {
    font-size: 22rpx;
    color: #999;
  }

  &__title {
    font-size: 30rpx;
    font-weight: 600;
    color: #222;
    margin-bottom: 8rpx;
  }

  &__body {
    font-size: 28rpx;
    color: #555;
    line-height: 1.5;
  }

  &__from {
    margin-top: 12rpx;
    font-size: 24rpx;
    color: #999;
  }
}

.notify-actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  background: rgba(245, 245, 247, 0.96);
  display: flex;
  justify-content: center;
}
</style>
