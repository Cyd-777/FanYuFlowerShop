<template>
  <view class="page-merchant-wiki-edit">
    <AppNavBar :title="pageTitle" />
    <view v-if="pageLoading" class="loading-tip">{{ loadingTipText }}</view>

    <template v-else>
      <view class="form-card">
        <view class="form-row">
          <text class="form-label">{{ uiText_e45ebd }}</text>
          <input
            class="form-input"
            v-model="form.kindName"
            placeholder="如：玫瑰、百合"
            :disabled="!!isEdit"
          />
        </view>
        <view class="form-row">
          <text class="form-label">{{ uiText_c1cd21 }}</text>
          <input
            class="form-input"
            v-model="form.varietyName"
            placeholder="留空表示种类级词条"
          />
        </view>
        <view class="form-row">
          <text class="form-label">{{ iconLabelText }}</text>
          <input class="form-input" v-model="form.icon" placeholder="🌷" maxlength="2" />
        </view>
        <view class="form-row">
          <text class="form-label">{{ enabledLabelText }}</text>
          <view class="switch-wrap">
            <nut-switch v-model="form.enabled" />
          </view>
        </view>
      </view>

      <view v-if="isEdit" class="form-card danger-card">
        <view class="delete-row" @tap="confirmDelete">{{ uiText_28d05c }}</view>
      </view>

      <view class="submit-bar">
        <nut-button
          type="primary"
          class="submit-btn"
          :loading="saving"
          :disabled="!canSave"
          @tap="handleSave"
        >
          {{ isEdit ? '保存修改' : '创建词条' }}
        </nut-button>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { showToast } from '@/utils/feedback'
import { computed, ref } from 'vue'
import { useRouter } from '@tarojs/taro'
import { getMerchantWiki, createWiki, updateWiki, removeWiki } from '@/services/wiki'
import { getWikiFullLabel } from '@/types/wiki'
import { navigateBack } from '@/utils/router'

const enabledLabelText = '启用'
const iconLabelText = '图标'
const loadingTipText = '加载中…'
const uiText_28d05c = '删除此词条'
const uiText_c1cd21 = '品种名称'
const uiText_e45ebd = '种类名称 *'

interface WikiForm {
  kindName: string
  varietyName: string
  icon: string
  enabled: boolean
}

const router = useRouter()
const params = router.params as Record<string, string> | undefined
const wikiId = ref(params?.id || '')
const isEdit = computed(() => !!wikiId.value)
const pageTitle = computed(() => {
  if (!isEdit.value || !form.value.kindName.trim()) return '新建词条'
  return `编辑: ${getWikiFullLabel(form.value)}`
})
const pageLoading = ref(false)
const saving = ref(false)

const form = ref<WikiForm>({
  kindName: params?.kindName ? decodeURIComponent(params.kindName) : '',
  varietyName: '',
  icon: params?.icon ? decodeURIComponent(params.icon) : '🌷',
  enabled: true,
})

const canSave = computed(() => form.value.kindName.trim().length > 0)

if (isEdit.value) {
  pageLoading.value = true
  getMerchantWiki(wikiId.value)
    .then((wiki) => {
      form.value = {
        kindName: wiki.kindName || '',
        varietyName: wiki.varietyName || '',
        icon: wiki.icon || '🌷',
        enabled: wiki.enabled !== false,
      }
    })
    .catch((err) => {
      showToast({ title: err instanceof Error ? err.message : '加载失败', icon: 'none' })
    })
    .finally(() => {
      pageLoading.value = false
    })
}

async function handleSave() {
  if (!canSave.value || saving.value) return
  saving.value = true
  try {
    if (isEdit.value) {
      await updateWiki(wikiId.value, {
        kindName: form.value.kindName.trim(),
        varietyName: form.value.varietyName.trim(),
        icon: form.value.icon.trim() || '🌷',
        enabled: form.value.enabled,
      })
      showToast({ title: '已保存', icon: 'success' })
    } else {
      await createWiki({
        kindName: form.value.kindName.trim(),
        varietyName: form.value.varietyName.trim(),
        icon: form.value.icon.trim() || '🌷',
      })
      showToast({ title: '已创建', icon: 'success' })
    }
    setTimeout(() => navigateBack(), 1000)
  } catch (err) {
    showToast({ title: err instanceof Error ? err.message : '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function confirmDelete() {
  wx.showModal({
    title: '删除词条',
    content: '删除后不可恢复，对应的衍生分类也将移除，确定继续？',
    confirmText: '删除',
    confirmColor: '#e53935',
    success: async (res) => {
      if (!res.confirm) return
      saving.value = true
      try {
        await removeWiki(wikiId.value)
        showToast({ title: '已删除', icon: 'success' })
        setTimeout(() => navigateBack(), 1000)
      } catch (err) {
        showToast({ title: err instanceof Error ? err.message : '删除失败', icon: 'none' })
      } finally {
        saving.value = false
      }
    },
  })
}
</script>

<style lang="less">
.page-merchant-wiki-edit {
  min-height: 100vh;
  background: #f8f8f8;
  padding-bottom: 120rpx;
}
.loading-tip {
  padding: 80rpx 32rpx; text-align: center; font-size: 26rpx; color: #999;
}
.form-card {
  background: #fff;
  margin: 16rpx;
  padding: 24rpx;
  border-radius: 16rpx;
}
.form-row {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 2rpx solid #f5f5f5;
  &:last-child { border-bottom: none; }
}
.form-label {
  width: 140rpx;
  flex-shrink: 0;
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}
.form-input {
  flex: 1;
  height: 60rpx;
  font-size: 28rpx;
  padding: 0 12rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
}
.switch-wrap {
  flex: 1;
}
.danger-card { margin-top: 32rpx; }
.delete-row {
  padding: 20rpx 0;
  text-align: center;
  font-size: 28rpx;
  color: #e53935;
  font-weight: 500;
  cursor: pointer;
}
.delete-row:active { opacity: 0.7; }
.submit-bar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  padding: 16rpx 32rpx calc(16rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 2rpx solid #eee;
}
.submit-btn { width: 100%; border-radius: 48rpx; }
</style>
