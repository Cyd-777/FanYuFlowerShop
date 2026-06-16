<template>
  <view class="page-preview">
    <view class="preview-area">
      <image class="preview-img" src="" mode="aspectFit" />
      <view class="tip">定制预览效果</view>
    </view>
    <view class="summary">
      <view class="row"><text class="label">花材</text><text>{{ materials }}</text></view>
      <view class="row"><text class="label">包装</text><text>{{ pkgName }}</text></view>
      <view class="row"><text class="label">卡片</text><text>{{ cardMsg || '无' }}</text></view>
      <view class="row total"><text class="label">合计</text><text class="price">¥{{ price }}</text></view>
    </view>
    <nut-button type="primary" block class="submit-btn" @click="submit">确认定制并加入购物车</nut-button>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const materials = ref('红玫瑰 x3, 满天星 x1')
const pkgName = ref('精美礼盒')
const cardMsg = ref('')
const price = ref(65)

function submit() {
  wx.showToast({ title: '已加入购物车', icon: 'success' })
  setTimeout(() => wx.navigateBack(), 1500)
}
</script>

<style lang="less">
.page-preview { background: #f8f8f8; min-height: 100vh; }
.preview-area {
  background: #fff; padding: 48rpx; text-align: center;
  .preview-img { width: 400rpx; height: 400rpx; background: #f0f0f0; border-radius: 16rpx; margin: 0 auto; }
  .tip { margin-top: 16rpx; font-size: 26rpx; color: #999; }
}
.summary { background: #fff; margin-top: 16rpx; padding: 24rpx; }
.row { display: flex; padding: 12rpx 0; font-size: 26rpx; border-bottom: 2rpx solid #f5f5f5; }
.row.total { border: none; }
.label { color: #999; width: 120rpx; }
.price { color: #e53935; font-weight: 600; font-size: 32rpx; }
.submit-btn { margin: 48rpx 32rpx; border-radius: 48rpx; }
</style>
