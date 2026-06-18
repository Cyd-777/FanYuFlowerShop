<template>
  <view class="page-category-list">
    <view class="intro">
      <view class="title">商品分类</view>
      <view class="desc">分类会同步到新建商品表单和用户端分类 Tab</view>
    </view>

    <view v-if="categoryList.length" class="list-card">
      <view
        v-for="item in categoryList"
        :key="item._id"
        class="category-item"
        @click="editCategory(item._id)"
      >
        <view class="category-main">
          <view class="category-icon">{{ item.icon }}</view>
          <view class="category-info">
            <view class="category-name">{{ item.name }}</view>
            <view class="category-meta">排序 {{ item.sort }}</view>
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
import { useDidShow } from '@tarojs/taro'
import { navigateTo } from '@/utils/router'
import { useMerchantCategories } from '@/composables/useMerchantCategories'

const { categories: categoryList, loading, loadCategories } = useMerchantCategories()

useDidShow(() => {
  void loadCategories()
})

function addCategory() {
  navigateTo({ url: '/pagesMerchant/category/edit' })
}

function editCategory(id: string) {
  navigateTo({ url: '/pagesMerchant/category/edit?id=' + id })
}
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
  padding: 28rpx 32rpx;
  border-bottom: 2rpx solid #f5f5f5;
}
.category-main {
  display: flex;
  align-items: center;
  flex: 1;
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
}
.category-name {
  font-size: 30rpx;
  color: #333;
  font-weight: 600;
}
.category-meta {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #999;
}
.category-status {
  font-size: 22rpx;
  color: #4caf50;
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
