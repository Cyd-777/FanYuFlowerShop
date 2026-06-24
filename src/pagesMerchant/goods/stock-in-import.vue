<template>
  <view class="page-stock-in-import">
    <AppNavBar />
    <view class="intro">
      <view class="title">粘贴进货单</view>
      <view class="desc">
        每行一种商品，支持：名称,数量 / 名称,花色,数量 / 名称 x 数量
      </view>
    </view>

    <textarea
      v-model="orderText"
      class="order-textarea"
      placeholder="示例：&#10;红玫瑰,20&#10;黄天霸,红色,10&#10;粉康乃馨 x 15"
      :maxlength="8000"
    />

    <view v-if="previewRows.length" class="preview">
      <view class="preview-title">识别预览（{{ previewRows.length }} 行）</view>
      <view v-for="(row, index) in previewRows" :key="index" class="preview-row">
        <text>{{ row.name }}</text>
        <text v-if="row.colorHint" class="hint">{{ row.colorHint }}</text>
        <text class="qty">× {{ row.quantity }}</text>
      </view>
    </view>

    <view class="footer">
      <nut-button type="primary" block class="submit-btn" :loading="parsing" @click="goStockInList">
        生成入库列表
      </nut-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePageData } from '@/composables/usePageData'

const { orderText, parsing, parsePreview, goStockInList } = usePageData()

const previewRows = computed(() => parsePreview())
</script>

<style lang="less">
.page-stock-in-import {
  min-height: 100vh;
  background: #f8f8f8;
  padding: 24rpx 24rpx 160rpx;
  box-sizing: border-box;
}
.intro {
  margin-bottom: 16rpx;
}
.title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}
.desc {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #999;
  line-height: 1.5;
}
.order-textarea {
  width: 100%;
  min-height: 320rpx;
  padding: 24rpx;
  box-sizing: border-box;
  background: #fff;
  border-radius: 16rpx;
  font-size: 26rpx;
  color: #333;
  line-height: 1.6;
}
.preview {
  margin-top: 24rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 16rpx;
}
.preview-title {
  font-size: 26rpx;
  font-weight: 600;
  margin-bottom: 12rpx;
}
.preview-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 0;
  border-top: 1rpx solid #f5f5f5;
  font-size: 26rpx;
  color: #333;
}
.preview-row .hint {
  font-size: 22rpx;
  color: #999;
}
.preview-row .qty {
  margin-left: auto;
  color: #e53935;
  font-weight: 600;
}
.footer {
  position: fixed;
  left: 32rpx;
  right: 32rpx;
  bottom: calc(32rpx + env(safe-area-inset-bottom));
}
.submit-btn {
  border-radius: 48rpx;
  height: 96rpx;
}
</style>
