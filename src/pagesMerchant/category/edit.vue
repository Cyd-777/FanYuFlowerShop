<template>
  <view class="page-category-edit">
    <view class="form-card">
      <nut-form>
        <nut-form-item label="分类名称">
          <nut-input v-model="form.name" placeholder="如：玫瑰" />
        </nut-form-item>
        <nut-form-item label="分类图标">
          <nut-input v-model="form.icon" placeholder="输入 emoji，如 🌹" />
        </nut-form-item>
        <nut-form-item label="排序权重">
          <nut-input v-model="form.sort" placeholder="数字越大越靠前" type="number" />
        </nut-form-item>
        <nut-form-item label="启用分类">
          <nut-switch v-model="form.enabled" />
        </nut-form-item>
        <nut-form-item label="定制用途">
          <picker :range="roleLabels" :value="roleIndex" @change="onRoleChange">
            <view class="picker-value">{{ roleLabels[roleIndex] }}</view>
          </picker>
        </nut-form-item>
      </nut-form>
    </view>

    <view class="preview-card">
      <view class="preview-label">用户端预览</view>
      <view class="preview-item">
        <view class="preview-icon">{{ form.icon || '🌷' }}</view>
        <view class="preview-name">{{ form.name || '分类名称' }}</view>
      </view>
    </view>

    <view class="actions">
      <nut-button type="primary" block class="save-btn" :loading="saving" @click="save">
        {{ categoryId ? '保存修改' : '创建分类' }}
      </nut-button>
      <nut-button
        v-if="categoryId"
        block
        plain
        type="danger"
        class="delete-btn"
        :loading="deleting"
        @click="handleDelete"
      >
        删除分类
      </nut-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLoad } from '@tarojs/taro'
import { navigateBack } from '@/utils/router'
import {
  createCategory,
  getMerchantCategory,
  removeCategory,
  updateCategory,
} from '@/services/category'
import type { CategoryForm, CategoryCustomRole } from '@/types/category'
import { CATEGORY_CUSTOM_ROLE_OPTIONS } from '@/types/category'

const categoryId = ref('')
const saving = ref(false)
const deleting = ref(false)

const form = ref<CategoryForm>({
  name: '',
  icon: '🌷',
  sort: '0',
  enabled: true,
  customRole: '',
})

const roleLabels = CATEGORY_CUSTOM_ROLE_OPTIONS.map((item) => item.label)
const roleIndex = computed(() =>
  Math.max(
    0,
    CATEGORY_CUSTOM_ROLE_OPTIONS.findIndex((item) => item.value === form.value.customRole),
  ),
)

function onRoleChange(e: { detail: { value: string } }) {
  const idx = Number(e.detail.value)
  form.value.customRole = CATEGORY_CUSTOM_ROLE_OPTIONS[idx]?.value || ''
}

const isEdit = computed(() => !!categoryId.value)

useLoad((options) => {
  categoryId.value = options?.id || ''
  wx.setNavigationBarTitle({ title: categoryId.value ? '编辑分类' : '新建分类' })
  if (categoryId.value) {
    void loadCategory()
  }
})

async function loadCategory() {
  try {
    wx.showLoading({ title: '加载中' })
    const category = await getMerchantCategory(categoryId.value)
    form.value = {
      name: category.name,
      icon: category.icon,
      sort: String(category.sort || 0),
      enabled: category.enabled,
      customRole: category.customRole || '',
    }
  } catch (err) {
    wx.showToast({
      title: err instanceof Error ? err.message : '加载失败',
      icon: 'none',
    })
    setTimeout(() => navigateBack(), 1500)
  } finally {
    wx.hideLoading()
  }
}

function validateForm() {
  if (!form.value.name.trim()) {
    wx.showToast({ title: '请填写分类名称', icon: 'none' })
    return false
  }
  return true
}

async function save() {
  if (!validateForm() || saving.value) return

  saving.value = true
  try {
    if (isEdit.value) {
      await updateCategory(categoryId.value, form.value)
      wx.showToast({ title: '已保存', icon: 'success' })
    } else {
      await createCategory(form.value)
      wx.showToast({ title: '已创建', icon: 'success' })
    }
    setTimeout(() => navigateBack(), 1200)
  } catch (err) {
    wx.showToast({
      title: err instanceof Error ? err.message : '保存失败',
      icon: 'none',
    })
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  const { confirm } = await new Promise<{ confirm: boolean }>((resolve) => {
    wx.showModal({
      title: '删除分类',
      content: '删除后无法恢复，确定继续？',
      confirmColor: '#e53935',
      success: (r) => resolve({ confirm: r.confirm }),
    })
  })

  if (!confirm || deleting.value) return

  deleting.value = true
  try {
    await removeCategory(categoryId.value)
    wx.showToast({ title: '已删除', icon: 'success' })
    setTimeout(() => navigateBack(), 1200)
  } catch (err) {
    wx.showToast({
      title: err instanceof Error ? err.message : '删除失败',
      icon: 'none',
    })
  } finally {
    deleting.value = false
  }
}
</script>

<style lang="less">
.page-category-edit {
  min-height: 100vh;
  padding-bottom: 48rpx;
  background: #f8f8f8;
}
.form-card,
.preview-card {
  background: #fff;
  margin-bottom: 16rpx;
}
.preview-card {
  padding: 24rpx 32rpx 32rpx;
}
.preview-label {
  font-size: 26rpx;
  color: #999;
  margin-bottom: 16rpx;
}
.preview-item {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
}
.preview-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #fce4ec;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
}
.preview-name {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #666;
}
.actions {
  padding: 0 32rpx;
}
.save-btn,
.delete-btn {
  margin-top: 16rpx;
  border-radius: 48rpx;
  height: 96rpx;
  font-size: 30rpx;
}
.picker-value {
  font-size: 28rpx;
  color: #333;
}
</style>
