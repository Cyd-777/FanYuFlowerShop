<template>
  <view class="page-category-list">
    <AppNavBar />
    <view class="intro">
      <view class="title">商品分类</view>
      <view class="desc">分类会同步到新建商品表单和用户端分类 Tab；按住左侧手柄拖动排序</view>
    </view>

    <view v-if="localList.length" class="list-card">
      <view
        v-for="(item, index) in localList"
        :key="item._id"
        class="category-item"
        :class="{ dragging: dragIndex === index, saving: savingOrder }"
        @click="editCategory(item._id)"
      >
        <view
          class="drag-handle"
          @click.stop
          @touchstart.stop="onHandleTouchStart(index, $event)"
          @touchmove.stop.prevent="onHandleTouchMove"
          @touchend.stop="onHandleTouchEnd"
          @touchcancel.stop="onHandleTouchEnd"
        >
          <text class="drag-grip">⋮⋮</text>
        </view>
        <view class="category-main">
          <view class="category-icon">{{ item.icon }}</view>
          <view class="category-info">
            <view class="category-name">{{ item.name }}</view>
          </view>
        </view>
        <view class="category-status" :class="{ off: !item.enabled }">
          {{ item.enabled ? '已启用' : '已停用' }}
        </view>
      </view>
    </view>

    <nut-empty v-else-if="!loading" description="还没有分类，点击下方按钮创建" />

    <view class="fab-wrap">
      <nut-button type="primary" class="fab-btn" @click="addCategory">+ 新建分类</nut-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { usePageData } from '@/composables/usePageData'
import { useCategoryDragSort } from '@/composables/useCategoryDragSort'
import { reorderMerchantCategories } from '@/services/category'

const { categoryList, loading, addCategory, editCategory, refresh } = usePageData()

const {
  localList,
  dragIndex,
  savingOrder,
  onHandleTouchStart,
  onHandleTouchMove,
  onHandleTouchEnd,
} = useCategoryDragSort(categoryList, async (orderedIds) => {
  await reorderMerchantCategories(orderedIds)
  await refresh(true)
})
</script>

<style lang="less">
.page-category-list {
  min-height: 100vh;
  padding-bottom: 140rpx;
  background: #f8f8f8;
}
.intro {
  padding: 32rpx;
  background: #fff;
  margin-bottom: 16rpx;
  .title {
    font-size: 34rpx;
    font-weight: 600;
    color: #333;
  }
  .desc {
    margin-top: 8rpx;
    font-size: 24rpx;
    color: #999;
    line-height: 1.5;
  }
}
.list-card {
  background: #fff;
}
.category-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx 28rpx 0;
  border-bottom: 2rpx solid #f5f5f5;
  transition: background 0.15s ease;
  &.dragging {
    background: #fafafa;
    z-index: 2;
  }
  &.saving {
    opacity: 0.85;
  }
}
.drag-handle {
  width: 72rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: stretch;
}
.drag-grip {
  font-size: 28rpx;
  color: #bbb;
  letter-spacing: -4rpx;
  line-height: 1;
}
.category-main {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}
.category-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  background: #fce4ec;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
}
.category-info {
  margin-left: 20rpx;
  min-width: 0;
}
.category-name {
  font-size: 30rpx;
  color: #333;
  font-weight: 600;
}
.category-status {
  font-size: 22rpx;
  color: #4caf50;
  flex-shrink: 0;
  margin-left: 16rpx;
  &.off {
    color: #999;
  }
}
.fab-wrap {
  position: fixed;
  left: 32rpx;
  right: 32rpx;
  bottom: 48rpx;
  z-index: 100;
}
.fab-btn {
  width: 100%;
  border-radius: 48rpx;
  height: 96rpx;
  font-size: 30rpx;
}
</style>
