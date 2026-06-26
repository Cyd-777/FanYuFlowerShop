<template>
  <view class="page-asset">
    <AppNavBar />
    <view class="page-asset-head">
      <view class="page-asset-title">素材管理</view>
      <view class="page-asset-action" @click="uploadNew">+ 上传素材</view>
    </view>

    <view v-if="loading" class="page-asset-loading">加载中...</view>
    <view v-else-if="!list.length" class="page-asset-empty">暂无素材，点击右上角上传</view>

    <view v-else class="asset-grid">
      <view v-for="item in list" :key="item._id" class="asset-card">
        <view class="asset-previews">
          <image class="asset-img asset-img--preview" :src="item.previewUrl || ''" mode="aspectFill" />
          <image class="asset-img asset-img--standard" :src="item.standardUrl || ''" mode="aspectFill" />
        </view>
        <view class="asset-info">
          <input
            class="asset-name-input"
            :value="renamingId === item._id ? renameValue : item.name"
            :focus="renamingId === item._id"
            :disabled="renamingId !== item._id"
            @blur="finishRename(item._id, item.name)"
            @confirm="finishRename(item._id, item.name)"
            @input="onRenameInput"
          />
          <view class="asset-actions">
            <text class="asset-action asset-action--rename" @click="startRename(item._id, item.name)">重命名</text>
            <text class="asset-action asset-action--delete" @click="doDelete(item._id, item.name)">删除</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { showToast } from '@/utils/feedback'
import {
  fetchAssetList,
  uploadAndProcessImage,
  renameAsset,
  deleteAsset,
  type AssetItem,
} from '@/services/asset'

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

async function uploadNew() {
  try {
    const res = await wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
    })
    const file = res.tempFiles[0]
    if (!file?.tempFilePath) return

    // 输入名称
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
}

.asset-previews {
  display: flex;
  gap: 4rpx;
  height: 240rpx;
  background: #fafafa;
}

.asset-img {
  flex: 1;
  height: 100%;
  background: #f0f0f0;
}

.asset-img--preview {
  opacity: 0.85;
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
</style>
