<template>
  <view class="page-asset">
    <AppNavBar :title="isPicker ? '选择素材' : undefined" />
    <view class="page-asset-head">
      <view class="page-asset-title">{{ isPicker ? '选择素材' : '素材管理' }}</view>
    </view>

    <view v-if="!isPicker" class="asset-upload-bar">
      <view class="asset-tag asset-tag--goods" @click="uploadNew('goods')">上传商品图</view>
      <view class="asset-tag asset-tag--banner" @click="uploadNew('banner')">上传 Banner</view>
    </view>

    <view v-if="loading" class="page-asset-loading">加载中...</view>
    <view v-else-if="!list.length" class="page-asset-empty">
      {{ isPicker ? '暂无素材' : '暂无素材，点右上角上传' }}
    </view>

    <view v-else class="asset-grid">
      <view
        v-for="item in list"
        :key="item._id"
        class="asset-card"
        :class="{ 'is-picker': isPicker }"
        @tap="onCardTap(item)"
        @longpress="onCardLongPress(item)"
      >
        <image class="asset-img" :src="item.standardUrl || item.previewUrl || ''" mode="aspectFill" />
        <view class="asset-card-labels">
          <text v-if="item.type === 'banner'" class="asset-type-badge asset-type-badge--banner">Banner</text>
          <text v-else class="asset-type-badge asset-type-badge--goods">商品</text>
          <text class="asset-tier-label asset-tier-label--fmt">{{ extractFormat(item.standardUrl) }}</text>
          <text class="asset-tier-label">标准</text>
          <text v-if="item.type !== 'banner'" class="asset-tier-label asset-tier-label--preview">缩略</text>
        </view>
        <view class="asset-name">{{ item.name }}</view>
        <view v-if="!isPicker" class="asset-del-btn" @tap.stop="showDeleteConfirm(item)">×</view>
      </view>
    </view>

    <view v-if="renameTarget" class="rename-overlay" @tap="closeRename">
      <view class="rename-modal" @tap.stop>
        <image
          class="rename-img"
          :src="(renameTarget.standardUrl || renameTarget.previewUrl || '')"
          mode="aspectFill"
        />
        <view class="rename-form">
          <input
            class="rename-input"
            :value="renameValue"
            placeholder="输入新名称"
            @input="onRenameInput"
            @confirm="confirmRename"
          />
          <view class="rename-actions">
            <view class="rename-btn rename-btn--cancel" @tap="closeRename">取消</view>
            <view class="rename-btn rename-btn--confirm" @tap="confirmRename">确定</view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Taro, { useRouter } from '@tarojs/taro'
import { showToast } from '@/utils/feedback'
import {
  fetchAssetList,
  uploadAndProcessImage,
  renameAsset,
  deleteAsset,
  type AssetItem,
} from '@/services/asset'
import { writeAssetPick } from '@/types/assetPick'

function extractFormat(url: string): string {
  if (!url) return '?'
  const match = url.match(/\.(\w+)(?:[?#]|$)/)
  return match ? match[1].toUpperCase() : '?'
}

const isPicker = ref(false)
const pickerType = ref('')

const router = useRouter()
const params = router.params as Record<string, string> | undefined
if (params?.picker === '1') {
  isPicker.value = true
  pickerType.value = params?.type || ''
}

const list = ref<AssetItem[]>([])
const loading = ref(false)
const renameTarget = ref<AssetItem | null>(null)
const renameValue = ref('')

onMounted(() => {
  void loadList()
})

async function loadList() {
  loading.value = true
  try {
    list.value = await fetchAssetList(pickerType.value || undefined)
  } catch (err) {
    showToast({
      title: err instanceof Error ? err.message : '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
}

function onCardTap(item: AssetItem) {
  if (isPicker.value) {
    pickAsset(item)
    return
  }
  // 非 picker 模式：弹自定义重命名模态（带卡片预览）
  openRename(item)
}

function onCardLongPress(item: AssetItem) {
  if (isPicker.value) return
  // 长按显示删除
  showDeleteConfirm(item)
}

function pickAsset(item: AssetItem) {
  writeAssetPick({
    originalFileId: item.originalFileId,
    previewFileId: item.previewFileId,
    standardFileId: item.standardFileId,
    consumed: false,
  })
  Taro.navigateBack()
}

async function uploadNew(type = 'goods') {
  try {
    const res = await wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
    })
    const files = res.tempFiles.filter((item) => item?.tempFilePath)
    if (!files.length) return

    wx.showLoading({ title: `上传中 0/${files.length}` })
    let done = 0
    for (const file of files) {
      const name = `${type === 'banner' ? 'Banner' : '素材'}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      await uploadAndProcessImage(file.tempFilePath, name, type)
      done += 1
      wx.showLoading({ title: `上传中 ${done}/${files.length}` })
    }
    wx.hideLoading()

    showToast({ title: `已上传 ${files.length} 个素材`, icon: 'success' })
    await loadList()
  } catch (err) {
    wx.hideLoading()
    if ((err as { errMsg?: string }).errMsg?.includes('cancel')) return
    showToast({
      title: err instanceof Error ? err.message : '上传失败',
      icon: 'none',
    })
  }
}

function openRename(item: AssetItem) {
  renameTarget.value = item
  renameValue.value = item.name
}

function closeRename() {
  renameTarget.value = null
  renameValue.value = ''
}

function onRenameInput(e: { detail?: { value?: string } }) {
  renameValue.value = e.detail?.value || ''
}

async function confirmRename() {
  const item = renameTarget.value
  if (!item) return
  const name = renameValue.value.trim()
  if (!name || name === item.name) {
    closeRename()
    return
  }
  try {
    await renameAsset(item._id, name)
    item.name = name
    showToast({ title: '已重命名', icon: 'success' })
  } catch (err) {
    showToast({
      title: err instanceof Error ? err.message : '重命名失败',
      icon: 'none',
    })
  }
  closeRename()
}

function showDeleteConfirm(item: AssetItem) {
  wx.showModal({
    title: '删除素材',
    content: `确定删除「${item.name}」？删除后不可恢复。`,
    confirmText: '删除',
    confirmColor: '#e53935',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await deleteAsset(item._id)
        list.value = list.value.filter((i) => i._id !== item._id)
        showToast({ title: '已删除', icon: 'success' })
      } catch (err) {
        showToast({
          title: err instanceof Error ? err.message : '删除失败',
          icon: 'none',
        })
      }
    },
  })
}
</script>

<style lang="less">
.page-asset {
  min-height: 100vh;
  background: #f8f8f8;
  box-sizing: border-box;
  width: 100%;
  padding-bottom: 48rpx;
}

.page-asset-head {
  padding: 24rpx;
  background: #fff;
  border-bottom: 2rpx solid #f0f0f0;
}

.page-asset-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.asset-upload-bar {
  display: flex;
  gap: 16rpx;
  padding: 16rpx 24rpx;
  background: #fff;
  border-bottom: 2rpx solid #f0f0f0;
}

.asset-tag {
  padding: 12rpx 28rpx;
  border-radius: 32rpx;
  font-size: 26rpx;
  font-weight: 500;
  line-height: 1.3;
}

.asset-tag--goods {
  background: #fce4ec;
  color: #e53935;
  border: 2rpx solid #f8bbd0;
}

.asset-tag--banner {
  background: #e3f2fd;
  color: #1565c0;
  border: 2rpx solid #90caf9;
}

.asset-tag:active {
  opacity: 0.7;
}

.page-asset-loading,
.page-asset-empty {
  padding: 80rpx 32rpx;
  text-align: center;
  font-size: 26rpx;
  color: #999;
}

.asset-grid {
  padding: 12rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.asset-card {
  width: calc((100% - 12rpx) / 2);
  background: #fff;
  border-radius: 12rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  position: relative;
}

.asset-card:active {
  opacity: 0.85;
}

.asset-card.is-picker {
  border: 2rpx solid transparent;
}

.asset-card.is-picker:active {
  border-color: #e53935;
  opacity: 1;
}

.asset-img {
  width: 100%;
  height: 240rpx;
  background: #f0f0f0;
  display: block;
}

.asset-card-labels {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  display: flex;
  gap: 6rpx;
  align-items: center;
}

.asset-type-badge {
  font-size: 18rpx;
  padding: 3rpx 8rpx;
  border-radius: 6rpx;
  line-height: 1.3;
}

.asset-type-badge--banner {
  background: #1565c0;
  color: #fff;
}

.asset-type-badge--goods {
  background: #e53935;
  color: #fff;
}

.asset-tier-label--fmt {
  background: #43a047;
  color: #fff;
}

.asset-tier-label {
  font-size: 18rpx;
  padding: 3rpx 8rpx;
  border-radius: 6rpx;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  line-height: 1.3;
}

.asset-tier-label--preview {
  background: rgba(0, 0, 0, 0.35);
}

.asset-tier-label--fmt {
  background: #43a047;
  color: #fff;
}

.asset-name {
  padding: 12rpx 14rpx;
  font-size: 24rpx;
  color: #555;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-right: 60rpx;
}

.asset-del-btn {
  position: absolute;
  bottom: 12rpx;
  right: 14rpx;
  width: 40rpx;
  height: 40rpx;
  line-height: 36rpx;
  text-align: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 28rpx;
}

.rename-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rename-modal {
  width: 560rpx;
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
}

.rename-img {
  width: 100%;
  height: 320rpx;
  background: #f0f0f0;
  display: block;
}

.rename-form {
  padding: 24rpx;
}

.rename-input {
  width: 100%;
  height: 72rpx;
  font-size: 28rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  padding: 0 16rpx;
  box-sizing: border-box;
}

.rename-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;
}

.rename-btn {
  flex: 1;
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  border-radius: 36rpx;
  font-size: 28rpx;
}

.rename-btn--cancel {
  background: #f5f5f5;
  color: #666;
}

.rename-btn--confirm {
  background: #e53935;
  color: #fff;
}
</style>
