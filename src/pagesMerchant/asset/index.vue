<template>
  <view class="page-asset" :style="navCssVars">
    <AppNavBar :title="isPicker ? '选择素材' : undefined" />

    <view class="asset-tabs">
      <view
        class="asset-tab"
        :class="{ active: activeTab === 'asset' }"
        @tap="activeTab = 'asset'"
      >{{ uiText_ee03aa }}</view>
      <view
        class="asset-tab"
        :class="{ active: activeTab === 'wiki' }"
        @tap="activeTab = 'wiki'"
      >{{ uiText_86d983 }}</view>
    </view>

    <!-- ====== 商品/Banner 素材 Tab ====== -->
    <template v-if="activeTab === 'asset'">
      <view v-if="loading" class="page-asset-loading">{{ loadingTipText }}</view>
      <view v-else-if="!list.length" class="page-asset-empty">
        {{ isPicker ? '暂无素材' : '暂无素材' }}
      </view>
      <view v-else class="asset-grid">
        <view
          v-for="item in list"
          :key="item._id"
          class="asset-card"
          :class="{
            'is-picker': isPicker,
            'is-selected': selectedIds.has(item._id),
            'is-batch': batchMode && !isPicker,
            'is-used': isPicker && excludeFileIds.has(item.originalFileId),
          }"
          @tap="onCardTap(item)"
          @longpress="isPicker ? undefined : enterBatchMode(item)"
        >
          <image class="asset-img" :src="item.standardUrl || item.previewUrl || ''" mode="aspectFill" />
          <view class="asset-card-labels">
            <text v-if="item.type === 'banner'" class="asset-type-badge asset-type-badge--banner">Banner</text>
            <text v-else class="asset-type-badge asset-type-badge--goods">{{ goodsLabelText }}</text>
            <text class="asset-tier-label asset-tier-label--fmt">{{ extractFormat(item.standardUrl) }}</text>
            <text class="asset-tier-label">{{ standardLabelText }}</text>
            <text v-if="item.type !== 'banner'" class="asset-tier-label asset-tier-label--preview">{{ thumbLabelText }}</text>
          </view>
          <view v-if="batchMode && !isPicker" class="asset-checkmark">{{ selectedIds.has(item._id) ? '✓' : '' }}</view>
          <view v-if="isPicker && excludeFileIds.has(item.originalFileId)" class="asset-used-badge">{{ uiText_b59b00 }}</view>
          <view class="asset-name">{{ item.name }}</view>
        </view>
      </view>

      <view v-if="!isPicker && batchMode" class="asset-batch-bar">
        <view class="asset-batch-info">已选 {{ selectedIds.size }} 项</view>
        <view class="asset-tag asset-tag--delete" @click="batchDelete">{{ uiText_962113 }}</view>
        <view class="asset-tag asset-tag--cancel" @click="exitBatchMode">{{ cancelText }}</view>
      </view>

      <view v-if="!isPicker" class="asset-bottom-bar">
        <view class="asset-tag asset-tag--goods" @click="uploadNew('goods')">{{ uiText_885a7f }}</view>
        <view class="asset-tag asset-tag--banner" @click="uploadNew('banner')">{{ uiText_d66dec }}</view>
      </view>
    </template>

    <!-- ====== 智库配图 Tab ====== -->
    <template v-if="activeTab === 'wiki'">
      <view v-if="wikiLoading" class="page-asset-loading">加载中...</view>
      <view v-else-if="!wikiList.length" class="page-asset-empty">暂无智库词条</view>
      <view v-else class="asset-grid">
        <view
          v-for="entry in wikiList"
          :key="entry._id"
          class="asset-card wiki-card"
          @tap="assignWikiImage(entry)"
        >
          <image
            class="asset-img"
            :src="wikiPreviewUrls[entry._id] || entry.icon || ''"
            mode="aspectFill"
          />
          <view class="wiki-card-name">{{ getWikiFullLabel(entry) }}</view>
          <view v-if="!wikiPreviewUrls[entry._id]" class="wiki-no-img">点击上传配图</view>
          <view v-else class="wiki-has-img">已配图</view>
        </view>
      </view>
    </template>

    <!-- 重命名模态 -->
    <view v-if="renameTarget" class="rename-overlay" @tap="closeRename">
      <view class="rename-modal" @tap.stop>
        <view class="rename-img-wrap">
          <image
            class="rename-img"
            :src="(renameTarget.standardUrl || renameTarget.previewUrl || '')"
            mode="aspectFill"
          />
          <view class="rename-img-tag rename-img-tag--del" @tap="doDeleteFromModal(renameTarget)">删除</view>
        </view>
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
import { onMounted, ref, watch } from 'vue'
import Taro, { useRouter } from '@tarojs/taro'
import { showToast } from '@/utils/feedback'
import { useNavBarLayout } from '@/composables/useNavBarLayout'
import {
  fetchAssetList,
  uploadAndProcessImage,
  renameAsset,
  deleteAsset,
  type AssetItem,
} from '@/modules/asset'
import { writeAssetPick } from '@/types/assetPick'
import { wikiRepository } from '@/data/repository'
import { getCloud, getCloudCallConfig, parseCloudResult } from '@/services/cloud'
import type { FlowerWikiListItem } from '@/types/wiki'
import { filterWikiCatalog, getWikiFullLabel } from '@/types/wiki'
import { filterChooseMediaFiles } from '@/utils/uploadImageLimit'

const cancelText = '取消'
const goodsLabelText = '商品'
const loadingTipText = '加载中...'
const standardLabelText = '标准'
const thumbLabelText = '缩略'
const uiText_86d983 = '智库配图'
const uiText_885a7f = '上传商品图'
const uiText_962113 = '删除所选'
const uiText_b59b00 = '已使用'
const uiText_d66dec = '上传 Banner'
const uiText_ee03aa = '商品素材'

function extractFormat(url: string): string {
  if (!url) return '?'
  const match = url.match(/\.(\w+)(?:[?#]|$)/)
  return match ? match[1].toUpperCase() : '?'
}

const isPicker = ref(false)
const pickerType = ref('')
const excludeFileIds = ref(new Set<string>())
const activeTab = ref('asset')

const router = useRouter()
const params = router.params as Record<string, string> | undefined
if (params?.picker === '1') {
  isPicker.value = true
  pickerType.value = params?.type || ''
  if (params?.exclude) {
    excludeFileIds.value = new Set(params.exclude.split(',').filter(Boolean))
  }
}

// ====== 商品素材 ======
const list = ref<AssetItem[]>([])
const loading = ref(false)
const renameTarget = ref<AssetItem | null>(null)
const renameValue = ref('')
const { cssVars: navCssVars } = useNavBarLayout()
const batchMode = ref(false)
const selectedIds = ref(new Set<string>())

onMounted(() => {
  void loadAssetList()
})

watch(activeTab, (tab) => {
  if (tab === 'wiki') void loadWikiList()
  else void loadAssetList()
})

async function loadAssetList() {
  loading.value = true
  try {
    list.value = await fetchAssetList(pickerType.value || undefined)
  } catch (err) {
    showToast({ title: err instanceof Error ? err.message : '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function onCardTap(item: AssetItem) {
  if (isPicker.value) {
    if (excludeFileIds.value.has(item.originalFileId)) {
      showToast({ title: '该素材已使用', icon: 'none' })
      return
    }
    pickAsset(item)
    return
  }
  if (batchMode.value) {
    toggleSelect(item._id)
    return
  }
  openRename(item)
}

function enterBatchMode(item: AssetItem) {
  batchMode.value = true
  selectedIds.value = new Set([item._id])
}

function toggleSelect(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
  if (!next.size) batchMode.value = false
}

function exitBatchMode() {
  batchMode.value = false
  selectedIds.value = new Set()
}

async function batchDelete() {
  if (!selectedIds.value.size) return
  const { confirm } = await wx.showModal({
    title: '批量删除',
    content: `确定删除 ${selectedIds.value.size} 个素材？删除后不可恢复。`,
    confirmText: '删除', confirmColor: '#e53935',
  })
  if (!confirm) return

  wx.showLoading({ title: '删除中' })
  let ok = 0
  for (const id of selectedIds.value) {
    try {
      await deleteAsset(id)
      ok += 1
    } catch { /* skip */ }
  }
  wx.hideLoading()
  exitBatchMode()
  await loadAssetList()
  showToast({ title: `已删除 ${ok} 个`, icon: 'success' })
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
    const res = await wx.chooseMedia({ count: 9, mediaType: ['image'], sourceType: ['album', 'camera'] })
    const files = filterChooseMediaFiles(res.tempFiles)
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
    await loadAssetList()
  } catch (err) {
    wx.hideLoading()
    if ((err as { errMsg?: string }).errMsg?.includes('cancel')) return
    showToast({ title: err instanceof Error ? err.message : '上传失败', icon: 'none' })
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
  if (!name || name === item.name) { closeRename(); return }
  try {
    await renameAsset(item._id, name)
    item.name = name
    showToast({ title: '已重命名', icon: 'success' })
  } catch (err) {
    showToast({ title: err instanceof Error ? err.message : '重命名失败', icon: 'none' })
  }
  closeRename()
}

function showDeleteConfirm(item: AssetItem) {
  wx.showModal({
    title: '删除素材',
    content: `确定删除「${item.name}」？删除后不可恢复。`,
    confirmText: '删除', confirmColor: '#e53935',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await deleteAsset(item._id)
        list.value = list.value.filter((i) => i._id !== item._id)
        closeRename()
        showToast({ title: '已删除', icon: 'success' })
      } catch (err) {
        showToast({ title: err instanceof Error ? err.message : '删除失败', icon: 'none' })
      }
    },
  })
}

function doDeleteFromModal(item: AssetItem) {
  closeRename()
  showDeleteConfirm(item)
}

// ====== 智库配图 ======
const wikiList = ref<FlowerWikiListItem[]>([])
const wikiLoading = ref(false)
const wikiPreviewUrls = ref<Record<string, string>>({})

async function loadWikiList() {
  wikiLoading.value = true
  try {
    const { data } = await wikiRepository.ensurePublicList({})
    wikiList.value = filterWikiCatalog(data)
    // 尝试加载已有 cover 的预览
    const { readCachedImageUrl } = await import('@/utils/goodsImage')
    const urls: Record<string, string> = {}
    for (const entry of wikiList.value) {
      if (entry.coverImage) {
        const cached = readCachedImageUrl(entry.coverImage)
        if (cached) urls[entry._id] = cached
      }
    }
    wikiPreviewUrls.value = urls
  } catch (err) {
    showToast({ title: err instanceof Error ? err.message : '加载智库失败', icon: 'none' })
  } finally {
    wikiLoading.value = false
  }
}

async function assignWikiImage(entry: FlowerWikiListItem) {
  try {
    const res = await wx.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['album', 'camera'] })
    const file = filterChooseMediaFiles(res.tempFiles)[0]
    if (!file?.tempFilePath) return

    wx.showLoading({ title: '上传中' })
    const { uploadAndProcessImage: upload } = await import('@/modules/asset')
    const result = await upload(file.tempFilePath, `wiki_${entry._id}`, 'goods')

    // 调用云函数更新 wiki 的 coverImage
    const cloud = getCloud()
    const config = getCloudCallConfig()
    await cloud.callFunction({
      name: 'wiki',
      data: { action: 'updateCoverImage', wikiId: entry._id, fileId: result.originalFileId },
      ...(config ? { config } : {}),
    })

    wx.hideLoading()
    // 更新预览
    const { resolveCloudImageUrl } = await import('@/utils/goodsImage')
    const url = await resolveCloudImageUrl(result.originalFileId)
    if (url) wikiPreviewUrls.value = { ...wikiPreviewUrls.value, [entry._id]: url }
    showToast({ title: '配图已更新', icon: 'success' })
  } catch (err) {
    wx.hideLoading()
    if ((err as { errMsg?: string }).errMsg?.includes('cancel')) return
    showToast({ title: err instanceof Error ? err.message : '上传失败', icon: 'none' })
  }
}
</script>

<style lang="less">
.page-asset {
  min-height: 100vh;
  background: #f8f8f8;
  box-sizing: border-box;
  width: 100%;
  padding-bottom: 120rpx;
}

.asset-tabs {
  display: flex;
  background: #fff;
  border-bottom: 2rpx solid #f0f0f0;
  position: sticky;
  top: var(--nav-total-height, 0px);
  z-index: 10;
}

.asset-tab {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  font-size: 28rpx;
  color: #888;
  font-weight: 500;
  border-bottom: 4rpx solid transparent;
}

.asset-tab.active {
  color: #e53935;
  border-bottom-color: #e53935;
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
  box-sizing: border-box;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  position: relative;
}

.asset-card:active { opacity: 0.85; }
.asset-card.is-picker { border: 2rpx solid transparent; }
.asset-card.is-picker:active { border-color: #e53935; opacity: 1; }
.asset-card.is-used {
  opacity: 0.5;
  pointer-events: none;
}
.asset-card.is-used .asset-img { filter: grayscale(0.8); }

.asset-img {
  width: 100%;
  height: 240rpx;
  background: #f0f0f0;
  display: block;
}

.asset-card-labels {
  position: absolute; top: 8rpx; right: 8rpx;
  display: flex; gap: 6rpx; align-items: center;
}

.asset-type-badge {
  font-size: 18rpx; padding: 3rpx 8rpx; border-radius: 6rpx; line-height: 1.3;
}
.asset-type-badge--banner { background: #1565c0; color: #fff; }
.asset-type-badge--goods { background: #e53935; color: #fff; }

.asset-tier-label--fmt { background: #43a047; color: #fff; }
.asset-tier-label {
  font-size: 18rpx; padding: 3rpx 8rpx; border-radius: 6rpx;
  background: rgba(0,0,0,0.55); color: #fff; line-height: 1.3;
}
.asset-tier-label--preview { background: rgba(0,0,0,0.35); }
.asset-name {
  padding: 12rpx 14rpx; font-size: 24rpx; color: #555;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.asset-used-badge {
  position: absolute; bottom: 44rpx; left: 0; right: 0;
  text-align: center; font-size: 20rpx; color: #999;
  background: rgba(255,255,255,0.85);
  padding: 4rpx 0;
}

.asset-bottom-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; gap: 16rpx; padding: 16rpx 24rpx;
  background: #fff; border-top: 2rpx solid #f0f0f0;
  justify-content: center;
}

.asset-tag {
  padding: 16rpx 40rpx; border-radius: 32rpx;
  font-size: 26rpx; font-weight: 500; line-height: 1.3;
}

.asset-tag--goods { background: #fce4ec; color: #e53935; border: 2rpx solid #f8bbd0; }
.asset-tag--banner { background: #e3f2fd; color: #1565c0; border: 2rpx solid #90caf9; }
.asset-tag:active { opacity: 0.7; }

.asset-tag--delete {
  background: #fbe9e7;
  color: #bf360c;
  border: 2rpx solid #ffab91;
}

.asset-tag--cancel {
  background: #f5f5f5;
  color: #666;
  border: 2rpx solid #e0e0e0;
}

.asset-batch-bar {
  position: fixed; bottom: 100rpx; left: 0; right: 0;
  display: flex; gap: 16rpx; padding: 16rpx 24rpx;
  background: #fff; border-top: 2rpx solid #f0f0f0;
  justify-content: center; align-items: center;
  z-index: 10;
}

.asset-batch-info {
  font-size: 26rpx; color: #555; font-weight: 500;
  margin-right: auto;
}

.asset-card.is-selected {
  border: 4rpx solid #e53935;
}

.asset-card.is-batch {
  border: 2rpx solid transparent;
}

.asset-checkmark {
  position: absolute; top: 8rpx; left: 8rpx;
  width: 36rpx; height: 36rpx; line-height: 36rpx;
  text-align: center; border-radius: 50%;
  background: #e53935; color: #fff;
  font-size: 22rpx; font-weight: bold;
  z-index: 2;
}

.rename-img-wrap {
  position: relative;
  width: 100%;
}

.rename-img-tag {
  position: absolute;
  padding: 6rpx 16rpx;
  border-radius: 6rpx;
  font-size: 24rpx;
  line-height: 1.4;
  z-index: 2;
}

.rename-img-tag--del {
  top: 12rpx;
  right: 12rpx;
  background: #e53935;
  color: #fff;
}

/* 智库卡片 */
.wiki-card { cursor: pointer; }
.wiki-card-name {
  padding: 10rpx 14rpx; font-size: 24rpx; color: #333; font-weight: 500;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.wiki-no-img { padding: 0 14rpx 10rpx; font-size: 22rpx; color: #e53935; }
.wiki-has-img { padding: 0 14rpx 10rpx; font-size: 22rpx; color: #43a047; }

/* 重命名模态 */
.rename-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  z-index: 999; display: flex; align-items: center; justify-content: center;
}
.rename-modal { width: 560rpx; background: #fff; border-radius: 20rpx; overflow: hidden; }
.rename-img { width: 100%; height: 320rpx; background: #f0f0f0; display: block; }
.rename-form { padding: 24rpx; }
.rename-input {
  width: 100%; height: 72rpx; font-size: 28rpx;
  border: 2rpx solid #e0e0e0; border-radius: 12rpx; padding: 0 16rpx; box-sizing: border-box;
}
.rename-actions { display: flex; gap: 16rpx; margin-top: 20rpx; }
.rename-btn { flex: 1; height: 72rpx; line-height: 72rpx; text-align: center; border-radius: 36rpx; font-size: 28rpx; }
.rename-btn--cancel { background: #f5f5f5; color: #666; }
.rename-btn--confirm { background: #e53935; color: #fff; }
</style>
