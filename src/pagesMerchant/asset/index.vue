<template>
  <view class="page-asset">
    <AppNavBar :title="isPicker ? '选择素材' : undefined" />
    <view class="page-asset-head">
      <view class="page-asset-title">{{ isPicker ? '选择素材' : '素材管理' }}</view>
      <view v-if="!isPicker" class="page-asset-action" @click="uploadNew">+ 上传素材</view>
    </view>

    <view v-if="loading" class="page-asset-loading">加载中...</view>
    <view v-else-if="!list.length" class="page-asset-empty">
      {{ isPicker ? '暂无素材' : '暂无素材，点击右上角上传' }}
    </view>

    <view v-else class="asset-grid">
      <view
        v-for="item in list"
        :key="item._id"
        class="asset-card"
        :class="{ 'is-picker': isPicker }"
        @tap="isPicker ? pickAsset(item) : undefined"
      >
        <image class="asset-img" :src="item.standardUrl || item.previewUrl || ''" mode="aspectFill" />
        <view class="asset-card-labels">
          <text class="asset-tier-label">标准</text>
          <text class="asset-tier-label asset-tier-label--preview">缩略</text>
        </view>
        <view class="asset-info">
          <input
            class="asset-name-input"
            :value="renamingId === item._id ? renameValue : item.name"
            :focus="renamingId === item._id"
            :disabled="renamingId !== item._id || isPicker"
            @blur="finishRename(item._id, item.name)"
            @confirm="finishRename(item._id, item.name)"
            @input="onRenameInput"
          />
          <view v-if="!isPicker" class="asset-actions">
            <text class="asset-action asset-action--rename" @click="startRename(item._id, item.name)">重命名</text>
            <text class="asset-action asset-action--delete" @click="doDelete(item._id, item.name)">删除</text>
          </view>
          <view v-else class="asset-pick-hint">点击选择此素材</view>
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

const isPicker = ref(false)

const router = useRouter()
const params = router.params as Record<string, string> | undefined
if (params?.picker === '1') {
  isPicker.value = true
}

const list = ref<AssetItem[]>([])
const loading = ref(false)
const renamingId = ref('')
const renameValue = ref('')

onMounted(() => {
  void loadList()
})

async function loadList() {
  loading.value = true
  try {
    list.value = await fetchAssetList()
  } catch (err) {
    showToast({
      title: err instanceof Error ? err.message : '加载失败',
      icon: 'none',
    })
  } finally {
    loading.value = false
  }
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

async function uploadNew() {
  // ... same as before, unchanged
  try {
    const res = await wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
    })
    const file = res.tempFiles[0]
    if (!file?.tempFilePath) return

    const { confirm, content } = await new Promise<{ confirm: boolean; content: string }>((resolve) => {
      wx.showModal({
        title: '素材命名',
        content: '',
        placeholderText: '输入素材名称，如红玫瑰',
        editable: true,
        success: (r) => resolve({ confirm: r.confirm, content: r.content || '' }),
        fail: () => resolve({ confirm: false, content: '' }),
      })
    })
    if (!confirm || !content.trim()) return
    const name = content.trim()

    wx.showLoading({ title: '上传处理中' })
    await uploadAndProcessImage(file.tempFilePath, name)
    wx.hideLoading()

    showToast({ title: '上传成功', icon: 'success' })
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

function startRename(id: string, currentName: string) {
  renamingId.value = id
  renameValue.value = currentName
}

function onRenameInput(e: { detail?: { value?: string } }) {
  renameValue.value = e.detail?.value || ''
}

async function finishRename(id: string, fallback: string) {
  if (!renamingId.value) return
  const name = renameValue.value.trim() || fallback
  renamingId.value = ''
  renameValue.value = ''

  if (name === fallback) return

  try {
    await renameAsset(id, name)
    const item = list.value.find((i) => i._id === id)
    if (item) item.name = name
    showToast({ title: '已重命名', icon: 'success' })
  } catch (err) {
    showToast({
      title: err instanceof Error ? err.message : '重命名失败',
      icon: 'none',
    })
  }
}

async function doDelete(id: string, name: string) {
  const { confirm } = await wx.showModal({
    title: '删除素材',
    content: `确定删除「${name}」？删除后不可恢复。`,
    confirmText: '删除',
    confirmColor: '#e53935',
  })
  if (!confirm) return

  try {
    await deleteAsset(id)
    list.value = list.value.filter((i) => i._id !== id)
    showToast({ title: '已删除', icon: 'success' })
  } catch (err) {
    showToast({
      title: err instanceof Error ? err.message : '删除失败',
      icon: 'none',
    })
  }
}
</script>

<style lang="less">
.page-asset {
  min-height: 100vh;
  background: #f8f8f8;
  padding-bottom: 48rpx;
  box-sizing: border-box;
  width: 100%;
}

.page-asset-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  background: #fff;
  border-bottom: 2rpx solid #f0f0f0;
}

.page-asset-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.page-asset-action {
  font-size: 26rpx;
  color: #e53935;
  font-weight: 500;
}

.page-asset-loading,
.page-asset-empty {
  padding: 80rpx 32rpx;
  text-align: center;
  font-size: 26rpx;
  color: #999;
}

.asset-grid {
  padding: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.asset-card {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  position: relative;
}

.asset-card.is-picker {
  border: 2rpx solid transparent;
}

.asset-card.is-picker:active {
  border-color: #e53935;
}

.asset-img {
  width: 100%;
  height: 320rpx;
  background: #f0f0f0;
  display: block;
}

.asset-card-labels {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  display: flex;
  gap: 8rpx;
}

.asset-tier-label {
  font-size: 20rpx;
  padding: 4rpx 10rpx;
  border-radius: 8rpx;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  line-height: 1.4;
}

.asset-tier-label--preview {
  background: rgba(0, 0, 0, 0.35);
}

.asset-info {
  padding: 16rpx 20rpx;
}

.asset-name-input {
  width: 100%;
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
  border: none;
  outline: none;
  padding: 4rpx 0;
  box-sizing: border-box;
}

.asset-actions {
  display: flex;
  gap: 24rpx;
  margin-top: 12rpx;
}

.asset-action {
  font-size: 24rpx;
  line-height: 1;
}

.asset-action--rename {
  color: #666;
}

.asset-action--delete {
  color: #e53935;
}

.asset-pick-hint {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #e53935;
}
</style>
