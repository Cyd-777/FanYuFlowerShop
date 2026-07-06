<template>
  <view class="page-category-edit">
    <AppNavBar />
    <view class="form-card">
      <nut-form>
        <nut-form-item label="分类类型">
          <picker v-if="!categoryId" :range="typeLabels" :value="typeIndex" @change="onTypeChange">
            <view class="picker-value">{{ typeLabels[typeIndex] || '请选择' }}</view>
          </picker>
          <view v-else class="picker-value type-readonly">{{ currentTypeLabel }}</view>
        </nut-form-item>
        <nut-form-item label="分类名称">
          <nut-input v-model="form.name" :placeholder="namePlaceholder" />
        </nut-form-item>
        <nut-form-item label="分类图标">
          <nut-input v-model="form.icon" placeholder="输入 emoji，如 🌹" />
        </nut-form-item>
        <nut-form-item v-if="form.categoryType === 'material'" label="定制用途">
          <picker :range="customRoleLabels" :value="customRoleIndex" @change="onCustomRoleChange">
            <view class="picker-value">{{ customRoleLabels[customRoleIndex] || '普通物料' }}</view>
          </picker>
          <view class="status-hint">{{ uiText_84165b }}</view>
        </nut-form-item>
        <nut-form-item v-if="categoryId" label="一阶 tab">
          <view class="switch-row">
            <nut-switch
              :model-value="form.navTier === 'primary'"
              :disabled="tierChanging"
              @change="onPrimaryTabSwitch"
            />
            <text class="switch-label">{{ form.navTier === 'primary' ? '已升为左侧一阶' : '当前为二阶胶囊' }}</text>
          </view>
          <view class="status-hint">{{ uiText_a0c18c }}</view>
        </nut-form-item>
        <nut-form-item
          v-if="form.navTier === 'secondary'"
          label="所属一阶 tab"
        >
          <picker
            :range="parentTabLabels"
            :value="parentTabIndex"
            @change="onParentTabChange"
          >
            <view class="picker-value">{{ parentTabLabels[parentTabIndex] || '请选择' }}</view>
          </picker>
        </nut-form-item>
        <nut-form-item
          v-else-if="categoryId"
          label="降级归属"
        >
          <picker
            :range="parentTabLabels"
            :value="parentTabIndex"
            @change="onParentTabChange"
          >
            <view class="picker-value">{{ parentTabLabels[parentTabIndex] || '请选择' }}</view>
          </picker>
          <view class="status-hint">{{ uiText_85ec8d }}</view>
        </nut-form-item>
        <nut-form-item label="启用状态">
          <view class="status-row">
            <text class="status-tag" :class="{ on: categoryEnabled }">{{ categoryEnabled ? '启用' : '停用' }}</text>
            <text class="status-count">{{ goodsCount }} 件商品</text>
          </view>
          <view class="status-hint">{{ uiText_313f0f }}</view>
        </nut-form-item>
      </nut-form>
    </view>

    <view class="preview-card">
      <view class="preview-label">{{ uiText_7f7a50 }}</view>
      <view class="preview-item">
        <view class="preview-icon">{{ form.icon || '🌷' }}</view>
        <view class="preview-name">{{ form.name || previewNameFallback }}</view>
        <view class="preview-type-tag">
          {{ form.navTier === 'primary' ? '一阶 · 左侧 tab' : '二阶 · 顶部胶囊' }}
        </view>
      </view>
    </view>

    <view class="actions">
      <nut-button type="primary" block class="save-btn" :loading="saving" @click="save">
        {{ categoryId ? '保存修改' : '创建' }}
      </nut-button>
      <nut-button v-if="categoryId" block plain type="danger" class="delete-btn" :loading="deleting" @click="handleDelete">
        删除
      </nut-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { showToast } from '@/utils/feedback'
import { ref, computed } from 'vue'
import { useLoad } from '@tarojs/taro'
import { navigateBack } from '@/utils/router'
import { createCategory, getMerchantCategory, removeCategory, setCategoryNavTier, updateCategory } from '@/modules/category'
import type { CategoryForm } from '@/types/category'
import {
  MERCHANT_CATEGORY_TYPE_OPTIONS,
  MATERIAL_CUSTOM_ROLE_OPTIONS,
  MALL_NAV_PARENT_IDS,
  resolveCategoryEnabled,
} from '@/types/category'
import { useMerchantCategories } from '@/composables/useMerchantCategories'

const uiText_313f0f = '有商品时自动启用，无商品时自动停用'
const uiText_7f7a50 = '用户端预览'
const uiText_84165b = '选「定制包装」或「定制贺卡」后，可在自选花束中选到该分类下的商品'
const uiText_85ec8d = '关闭「一阶 tab」时将归入此处所选的一阶 tab 下'
const uiText_a0c18c = '开启后显示在商城左侧 tab；关闭则降为顶部胶囊，需选择归属的一阶 tab'

const categoryId = ref('')
const saving = ref(false)
const deleting = ref(false)
const tierChanging = ref(false)
const goodsCount = ref(0)
const { categories, loadCategoriesQuiet } = useMerchantCategories()

const form = ref<CategoryForm>({
  name: '',
  icon: '🌷',
  categoryType: 'bouquet',
  customRole: '',
  navTier: 'secondary',
  parentId: MALL_NAV_PARENT_IDS.bouquet,
})

const categoryEnabled = computed(() => resolveCategoryEnabled({ goodsCount: goodsCount.value }))

const typeLabels = MERCHANT_CATEGORY_TYPE_OPTIONS.map((item) => item.label)
const typeIndex = computed(() =>
  Math.max(0, MERCHANT_CATEGORY_TYPE_OPTIONS.findIndex((item) => item.value === form.value.categoryType)),
)

const customRoleLabels = MATERIAL_CUSTOM_ROLE_OPTIONS.map((item) => item.label)
const customRoleIndex = computed(() =>
  Math.max(0, MATERIAL_CUSTOM_ROLE_OPTIONS.findIndex((item) => item.value === form.value.customRole)),
)

const currentTypeLabel = computed(() => {
  const opt = MERCHANT_CATEGORY_TYPE_OPTIONS.find((item) => item.value === form.value.categoryType)
  return opt ? opt.label : '花束场景'
})

const namePlaceholder = computed(() => {
  if (form.value.categoryType === 'bouquet') return '如：求婚、生日、探病'
  if (form.value.categoryType === 'material') return '如：贺卡、包装纸'
  return '如：求婚'
})

const previewNameFallback = computed(() => {
  if (form.value.categoryType === 'bouquet') return '花束场景'
  if (form.value.categoryType === 'material') return '物料品类'
  return '花束场景'
})

const parentTabOptions = computed(() => {
  const opts = [
    { id: MALL_NAV_PARENT_IDS.bouquet, label: '花束' },
    { id: MALL_NAV_PARENT_IDS.material, label: '物料' },
  ]
  const customs = categories.value.filter(
    (c) => c.navTier === 'primary' && c._id !== categoryId.value,
  )
  for (const item of customs) {
    opts.push({ id: item._id, label: item.name })
  }
  return opts
})

const parentTabLabels = computed(() => parentTabOptions.value.map((item) => item.label))

const parentTabIndex = computed(() => {
  const idx = parentTabOptions.value.findIndex((item) => item.id === form.value.parentId)
  return idx >= 0 ? idx : 0
})

function onParentTabChange(e: { detail: { value: string } }) {
  const idx = Number(e.detail.value)
  const opt = parentTabOptions.value[idx]
  if (opt) form.value.parentId = opt.id
}

function syncParentIdForType() {
  if (form.value.navTier === 'primary') {
    return
  }
  if (form.value.parentId) return
  form.value.parentId =
    form.value.categoryType === 'material'
      ? MALL_NAV_PARENT_IDS.material
      : MALL_NAV_PARENT_IDS.bouquet
}

function onTypeChange(e: { detail: { value: string } }) {
  const idx = Number(e.detail.value)
  form.value.categoryType = MERCHANT_CATEGORY_TYPE_OPTIONS[idx]?.value || 'bouquet'
  if (form.value.categoryType !== 'material') {
    form.value.customRole = ''
  }
  syncParentIdForType()
}

function onCustomRoleChange(e: { detail: { value: string } }) {
  const idx = Number(e.detail.value)
  form.value.customRole = MATERIAL_CUSTOM_ROLE_OPTIONS[idx]?.value || ''
}

const isEdit = computed(() => !!categoryId.value)

useLoad((options) => {
  categoryId.value = options?.id || ''
  const presetType = options?.type || ''
  const presetParentId = options?.parentId || ''
  void loadCategoriesQuiet()
  if (presetType === 'bouquet' || presetType === 'material') {
    form.value.categoryType = presetType
  }
  if (presetParentId) {
    form.value.parentId = presetParentId
  } else {
    syncParentIdForType()
  }
  wx.setNavigationBarTitle({ title: categoryId.value ? '编辑' : '新建' })
  if (categoryId.value) void loadCategory()
})

async function loadCategory() {
  try {
    wx.showLoading({ title: '加载中' })
    const category = await getMerchantCategory(categoryId.value)
    form.value = {
      name: category.name,
      icon: category.icon,
      categoryType: category.categoryType === 'material' ? 'material' : 'bouquet',
      customRole: category.customRole || '',
      navTier: category.navTier === 'primary' ? 'primary' : 'secondary',
      parentId: category.parentId || '',
    }
    if (form.value.navTier === 'secondary' && !form.value.parentId) {
      syncParentIdForType()
    }
    if (form.value.navTier === 'primary') {
      form.value.parentId =
        form.value.categoryType === 'material'
          ? MALL_NAV_PARENT_IDS.material
          : MALL_NAV_PARENT_IDS.bouquet
    }
    goodsCount.value = category.goodsCount ?? 0
  } catch (err) {
    showToast({ title: err instanceof Error ? err.message : '加载失败', icon: 'none' })
    setTimeout(() => navigateBack(), 1500)
  } finally { wx.hideLoading() }
}

function validateForm() {
  if (!form.value.name.trim()) { showToast({ title: '请填写名称', icon: 'none' }); return false }
  if (form.value.categoryType !== 'bouquet' && form.value.categoryType !== 'material') {
    showToast({ title: '请选择花束场景或物料品类', icon: 'none' })
    return false
  }
  if (form.value.navTier === 'secondary' && !form.value.parentId?.trim()) {
    showToast({ title: '请选择所属一阶 tab', icon: 'none' })
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
      showToast({ title: '已保存', icon: 'success' })
    } else {
      await createCategory(form.value)
      showToast({ title: '已创建', icon: 'success' })
    }
    setTimeout(() => navigateBack(), 1200)
  } catch (err) {
    showToast({ title: err instanceof Error ? err.message : '保存失败', icon: 'none' })
  } finally { saving.value = false }
}

async function onPrimaryTabSwitch(checked: boolean) {
  if (tierChanging.value) return

  if (!categoryId.value) {
    form.value.navTier = checked ? 'primary' : 'secondary'
    if (!checked) syncParentIdForType()
    return
  }

  if (checked) {
    await promoteToPrimary()
    return
  }

  if (!form.value.parentId?.trim()) {
    showToast({ title: '请先选择降级归属的一阶 tab', icon: 'none' })
    return
  }
  await demoteToSecondary()
}

async function promoteToPrimary() {
  if (!categoryId.value || tierChanging.value) return
  tierChanging.value = true
  try {
    const updated = await setCategoryNavTier(categoryId.value, 'primary')
    form.value.navTier = updated.navTier === 'primary' ? 'primary' : 'secondary'
    form.value.parentId = updated.parentId || ''
    showToast({ title: '已升为一阶 tab', icon: 'success' })
  } catch (err) {
    showToast({ title: err instanceof Error ? err.message : '操作失败', icon: 'none' })
  } finally {
    tierChanging.value = false
  }
}

async function demoteToSecondary() {
  if (!categoryId.value || tierChanging.value) return
  if (!form.value.parentId?.trim()) {
    showToast({ title: '请先选择降级归属的一阶 tab', icon: 'none' })
    return
  }
  tierChanging.value = true
  try {
    const updated = await setCategoryNavTier(
      categoryId.value,
      'secondary',
      form.value.parentId,
    )
    form.value.navTier = 'secondary'
    form.value.parentId = updated.parentId || form.value.parentId
    showToast({ title: '已降为二阶胶囊', icon: 'success' })
  } catch (err) {
    showToast({ title: err instanceof Error ? err.message : '操作失败', icon: 'none' })
  } finally {
    tierChanging.value = false
  }
}

async function handleDelete() {
  const { confirm } = await new Promise<{ confirm: boolean }>((resolve) => {
    wx.showModal({
      title: '删除', content: '删除后无法恢复，确定继续？', confirmColor: '#e53935',
      success: (r) => resolve({ confirm: r.confirm }),
    })
  })
  if (!confirm || deleting.value) return
  deleting.value = true
  try {
    await removeCategory(categoryId.value)
    showToast({ title: '已删除', icon: 'success' })
    setTimeout(() => navigateBack(), 1200)
  } catch (err) {
    showToast({ title: err instanceof Error ? err.message : '删除失败', icon: 'none' })
  } finally { deleting.value = false }
}
</script>

<style lang="less">
.page-category-edit { min-height: 100vh; padding-bottom: 48rpx; background: #f8f8f8; }
.form-card, .preview-card { background: #fff; margin-bottom: 16rpx; }
.preview-card { padding: 24rpx 32rpx 32rpx; }
.preview-label { font-size: 26rpx; color: #999; margin-bottom: 16rpx; }
.preview-item { display: inline-flex; flex-direction: column; align-items: center; }
.preview-icon { width: 96rpx; height: 96rpx; border-radius: 50%; background: #fce4ec; display: flex; align-items: center; justify-content: center; font-size: 40rpx; }
.preview-name { margin-top: 8rpx; font-size: 24rpx; color: #666; }
.preview-type-tag { margin-top: 4rpx; font-size: 20rpx; color: #999; }
.actions { padding: 0 32rpx; }
.save-btn, .delete-btn { margin-top: 16rpx; border-radius: 48rpx; height: 96rpx; font-size: 30rpx; }
.picker-value { font-size: 28rpx; color: #333; }
.type-readonly { color: #999; }
.status-row { display: flex; align-items: center; gap: 16rpx; }
.status-tag { font-size: 26rpx; color: #999; }
.status-tag.on { color: #4caf50; }
.status-count { font-size: 24rpx; color: #999; }
.status-hint { margin-top: 8rpx; font-size: 22rpx; color: #bbb; line-height: 1.4; }
.switch-row { display: flex; align-items: center; gap: 16rpx; }
.switch-label { font-size: 26rpx; color: #666; }
</style>
