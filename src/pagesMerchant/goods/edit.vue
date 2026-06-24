<template>
  <view class="page-merchant-goods-edit">
    <AppNavBar />
    <view class="images-section">
      <view class="section-label">{{ labelImages }}</view>
      <view class="images-tip">{{ imagesTip }}</view>
      <view class="images-grid">
        <view
          v-for="(item, idx) in imageSlots"
          :key="item.fileId"
          class="image-slot"
        >
          <image
            class="slot-img"
            :src="item.preview"
            mode="aspectFill"
            @tap.stop="previewImages(idx)"
          />
          <view v-if="idx === 0" class="cover-badge">{{ coverBadgeText }}</view>
          <view
            v-else
            class="set-cover-btn"
            @click.stop="setAsCover(idx)"
          >{{ setCoverText }}</view>
          <view class="remove-btn" @click.stop="removeImage(idx)">×</view>
        </view>
        <view
          v-if="imageSlots.length < maxImages"
          class="image-add"
          @click="addImages"
        >
          <text class="plus">{{ plusText }}</text>
          <text class="hint">{{ uploadHint }}</text>
        </view>
      </view>
    </view>

    <view class="form-card">
      <view class="sales-type-card">
        <view class="card-title">{{ labelSalesType }}</view>
        <view class="sales-type-list">
          <view
            v-for="item in salesTypeOptions"
            :key="item.value"
            class="sales-type-option"
            :class="{ active: form.salesType === item.value }"
            @click="selectSalesType(item.value)"
          >
            {{ item.label }}
          </view>
        </view>
      </view>

      <nut-form>
        <nut-form-item v-if="showFlowerPicker" :label="labelFlower">
          <view class="picker-cell" @click="openFlowerPicker">
            <view v-if="hasFlowerSelection" class="flower-selected">
              <text class="kind-tag">{{ form.flowerKindName }}</text>
              <text class="variety-name">{{ form.flowerVarietyName }}</text>
            </view>
            <text v-else class="picker-value placeholder">{{ flowerPlaceholder }}</text>
            <text class="picker-arrow">{{ arrowText }}</text>
          </view>
        </nut-form-item>

        <nut-form-item :label="labelName">
          <nut-input v-model="form.name" :placeholder="namePlaceholder" />
        </nut-form-item>

        <nut-form-item :label="labelPrice">
          <nut-input v-model="form.price" placeholder="0.00" type="digit" />
        </nut-form-item>

        <nut-form-item :label="labelStock">
          <nut-input v-model="form.stock" placeholder="0" type="number" />
        </nut-form-item>

        <nut-form-item v-if="form.salesType === 'group'" :label="labelUnitsPerGroup">
          <nut-input
            v-model="form.unitsPerGroup"
            :placeholder="unitsPerGroupPlaceholder"
            type="number"
          />
        </nut-form-item>

        <nut-form-item :label="labelDescription">
          <nut-input
            v-model="form.description"
            :placeholder="descriptionPlaceholder"
            type="textarea"
          />
        </nut-form-item>

        <nut-form-item :label="labelSort">
          <nut-input v-model="form.sort" :placeholder="sortPlaceholder" type="number" />
        </nut-form-item>

        <nut-form-item :label="labelOnSale">
          <nut-switch v-model="form.onSale" />
        </nut-form-item>

        <nut-form-item :label="labelRecommend">
          <view class="recommend-row">
            <nut-switch v-model="form.recommend" />
            <text class="recommend-hint">{{ recommendHint }}</text>
          </view>
        </nut-form-item>
      </nut-form>
    </view>

    <view class="category-card">
      <view class="card-header">
        <view class="card-title">{{ labelCategory }}</view>
        <view class="card-link" @click="goCategoryManage">{{ manageCategoryText }}</view>
      </view>

      <view v-if="enabledCategories.length" class="category-list">
        <view
          v-for="item in enabledCategories"
          :key="item._id"
          class="category-option"
          :class="{ active: form.categoryId === item._id }"
          @click="form.categoryId = item._id"
        >
          <text class="option-icon">{{ item.icon }}</text>
          <text class="option-name">{{ item.name }}</text>
        </view>
      </view>

      <view v-else class="empty-category">
        <view class="empty-text">{{ emptyCategoryText }}</view>
        <nut-button size="small" type="primary" @click="goCategoryManage">
          {{ goCategoryText }}
        </nut-button>
      </view>
    </view>

    <view class="actions">
      <nut-button type="primary" block class="save-btn" :loading="saving" @click="save">
        {{ saveButtonText }}
      </nut-button>
      <nut-button
        v-if="goodsId"
        block
        plain
        type="danger"
        class="delete-btn"
        :loading="deleting"
        @click="handleDelete"
      >
        {{ deleteButtonText }}
      </nut-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { showToast } from '@/utils/feedback'
import { ref, computed } from 'vue'
import { useDidShow, useLoad } from '@tarojs/taro'
import { navigateBack, navigateTo } from '@/utils/router'
import {
  createGoods,
  getMerchantGoods,
  removeGoods,
  updateGoods,
  uploadGoodsImage,
} from '@/services/goods'
import { linkStockInLineGoods } from '@/utils/stockInSession'
import { useMerchantCategories } from '@/composables/useMerchantCategories'
import { resolveCloudImageMap } from '@/utils/goodsImage'
import type { FlowerPickResult } from '@/types/flower'
import { FLOWER_PICK_STORAGE_KEY } from '@/types/flower'
import type { Goods, GoodsForm, GoodsSalesType } from '@/types/goods'
import {
  GOODS_SALES_TYPE_OPTIONS,
  inferSalesType,
  needsFlowerPickForSalesType,
  unitFromSalesType,
} from '@/types/goods'
import { MAX_GOODS_IMAGES } from '@/types/goods'

interface ImageSlot {
  fileId: string
  preview: string
}

const labelImages = '商品图片'
const imagesTip = `首张为主图，最多 ${MAX_GOODS_IMAGES} 张，详情页按顺序轮播展示`
const coverBadgeText = '主图'
const setCoverText = '设为主图'
const plusText = '+'
const uploadHint = '添加图片'
const labelSalesType = '商品类'
const labelFlower = '花卉选择'
const flowerPlaceholder = '请选择品类与品种'
const arrowText = '›'
const labelName = '品名'
const namePlaceholder = '如：春日混搭花束'
const labelPrice = '价格（元）'
const labelStock = '库存'
const labelUnitsPerGroup = '每组数量'
const unitsPerGroupPlaceholder = '如 10（表示每组 10 支）'
const labelDescription = '商品简介'
const descriptionPlaceholder = '介绍花材、适用场景等'
const labelSort = '排序优先级'
const sortPlaceholder = '数字越大越靠前'
const labelOnSale = '上架开关'
const labelRecommend = '首页推荐'
const recommendHint = '开启后，有库存时展示在顾客端首页'
const labelCategory = '商品分类'
const manageCategoryText = '管理分类'
const emptyCategoryText = '还没有可用分类，请先创建分类'
const goCategoryText = '去分类管理'
const deleteButtonText = '删除商品'
const createButtonText = '创建商品'
const saveEditButtonText = '保存修改'

const goodsId = ref('')
const returnToStockIn = ref(false)
const stockInLineKey = ref('')
const prefillColor = ref('')
const saving = ref(false)
const deleting = ref(false)
const imageSlots = ref<ImageSlot[]>([])
const maxImages = MAX_GOODS_IMAGES
const { categories: categoryOptions, loadCategoriesQuiet: refreshMerchantCategories } =
  useMerchantCategories()
const salesTypeOptions = GOODS_SALES_TYPE_OPTIONS

const form = ref<GoodsForm>({
  name: '',
  price: '',
  salesType: 'bouquet',
  unit: '束',
  stock: '',
  description: '',
  categoryId: '',
  flowerKindId: '',
  flowerKindName: '',
  flowerVarietyId: '',
  flowerVarietyName: '',
  coverImage: '',
  images: [],
  onSale: true,
  recommend: false,
  sort: '0',
  unitsPerGroup: '',
})

const isEdit = computed(() => !!goodsId.value)
const showFlowerPicker = computed(() => needsFlowerPickForSalesType(form.value.salesType))
const hasFlowerSelection = computed(
  () => !!(form.value.flowerVarietyId || (form.value.flowerKindName && form.value.flowerVarietyName)),
)
const enabledCategories = computed(() => categoryOptions.value.filter((item) => item.enabled))
const saveButtonText = computed(() => (isEdit.value ? saveEditButtonText : createButtonText))
const pageBootstrapped = ref(false)
/** 防止进行中的 loadGoods 在花卉选择之后覆盖表单 */
let goodsLoadSeq = 0

useLoad((options) => {
  goodsId.value = options?.id || ''
  returnToStockIn.value = options?.from === 'stock-in'
  stockInLineKey.value = options?.stockInLineKey || ''
  prefillColor.value = options?.prefillColor || ''
  if (options?.prefillName) {
    form.value.name = decodeURIComponent(options.prefillName)
  }
  wx.setNavigationBarTitle({ title: goodsId.value ? '编辑商品' : '新建商品' })
  void bootstrapPage()
})

useDidShow(() => {
  void handlePageShow()
})

/** 仅首次进入页面时拉取商品，避免 useDidShow 覆盖未保存的花卉选择等表单内容 */
async function bootstrapPage() {
  if (goodsId.value) {
    await loadGoods()
  }
  await loadCategories()
  pageBootstrapped.value = true
}

/** 从子页返回：只消费花卉选择结果或刷新分类列表，不重新 loadGoods */
async function handlePageShow() {
  const pick = consumeFlowerPickFromStorage()
  if (pick) {
    await loadCategories()
    applyFlowerPick(pick)
    return
  }
  if (!pageBootstrapped.value) return
  await refreshMerchantCategories()
}

function consumeFlowerPickFromStorage(): FlowerPickResult | null {
  try {
    const pick = wx.getStorageSync(FLOWER_PICK_STORAGE_KEY) as FlowerPickResult | ''
    if (!pick || typeof pick !== 'object' || !pick.flowerVarietyId) return null
    wx.removeStorageSync(FLOWER_PICK_STORAGE_KEY)
    return pick
  } catch {
    return null
  }
}

function clearFlowerSelection() {
  form.value.flowerKindId = ''
  form.value.flowerKindName = ''
  form.value.flowerVarietyId = ''
  form.value.flowerVarietyName = ''
}

function selectSalesType(type: GoodsSalesType) {
  if (form.value.salesType === type) return
  form.value.salesType = type
  form.value.unit = unitFromSalesType(type)
  if (type !== 'group') {
    form.value.unitsPerGroup = ''
  }
  if (!needsFlowerPickForSalesType(type)) {
    clearFlowerSelection()
  }
}

function applyFlowerPick(pick: FlowerPickResult) {
  goodsLoadSeq += 1
  form.value.flowerKindId = pick.flowerKindId
  form.value.flowerKindName = pick.flowerKindName
  form.value.flowerVarietyId = pick.flowerVarietyId
  form.value.flowerVarietyName = pick.flowerVarietyName
  form.value.unit = unitFromSalesType(form.value.salesType)
  if (!form.value.name.trim()) {
    form.value.name = pick.name
  }
  if (!form.value.description.trim()) {
    form.value.description = pick.description
  }
  matchCategoryByKindName(pick.flowerKindName)
}

function applyGoodsToForm(goods: Goods) {
  const salesType = inferSalesType(goods)
  form.value.salesType = salesType
  form.value.name = goods.name
  form.value.price = String(goods.price)
  form.value.unit = unitFromSalesType(salesType)
  form.value.stock = String(goods.stock)
  form.value.description = goods.description
  form.value.categoryId = goods.categoryId || enabledCategories.value[0]?._id || ''
  form.value.flowerKindId = goods.flowerKindId || ''
  form.value.flowerKindName = goods.flowerKindName || ''
  form.value.flowerVarietyId = goods.flowerVarietyId || ''
  form.value.flowerVarietyName = goods.flowerVarietyName || ''
  form.value.coverImage = goods.coverImage
  form.value.images = goods.images
  form.value.onSale = goods.onSale
  form.value.recommend = goods.recommend === true
  form.value.sort = String(goods.sort || 0)
  form.value.unitsPerGroup =
    goods.unitsPerGroup != null && goods.unitsPerGroup > 0
      ? String(goods.unitsPerGroup)
      : ''
}

function matchCategoryByKindName(kindName: string) {
  const matchedCategory = categoryOptions.value.find(
    (item) => item.enabled && (item.name === kindName || item.name.includes(kindName)),
  )
  if (matchedCategory) {
    form.value.categoryId = matchedCategory._id
  }
}

function openFlowerPicker() {
  const parts: string[] = []
  if (form.value.flowerKindId) parts.push(`kindId=${form.value.flowerKindId}`)
  if (form.value.flowerVarietyId) parts.push(`varietyId=${form.value.flowerVarietyId}`)
  const query = parts.join('&')
  navigateTo({
    url: query ? `/pagesMerchant/flower/picker?${query}` : '/pagesMerchant/flower/picker',
  })
}

async function loadCategories() {
  try {
    await refreshMerchantCategories()
    if (form.value.flowerKindName) {
      const matchedCategory = enabledCategories.value.find(
        (item) =>
          item.name === form.value.flowerKindName ||
          item.name.includes(form.value.flowerKindName),
      )
      if (matchedCategory) {
        form.value.categoryId = matchedCategory._id
        return
      }
    }
    if (!form.value.categoryId && enabledCategories.value.length) {
      form.value.categoryId = enabledCategories.value[0]._id
    }
  } catch (err) {
    showToast({
      title: err instanceof Error ? err.message : '加载分类失败',
      icon: 'none',
    })
  }
}

async function loadGoods() {
  const seq = ++goodsLoadSeq
  try {
    wx.showLoading({ title: '加载中' })
    const goods = await getMerchantGoods(goodsId.value)
    if (seq !== goodsLoadSeq) return
    applyGoodsToForm(goods)
    await loadImageSlotsFromGoods(goods)
  } catch (err) {
    if (seq !== goodsLoadSeq) return
    showToast({
      title: err instanceof Error ? err.message : '加载失败',
      icon: 'none',
    })
    setTimeout(() => navigateBack(), 1500)
  } finally {
    if (seq === goodsLoadSeq) {
      wx.hideLoading()
    }
  }
}

function goCategoryManage() {
  navigateTo({ url: '/pagesMerchant/category/list' })
}

function syncFormImagesFromSlots() {
  const ids = imageSlots.value.map((item) => item.fileId)
  form.value.coverImage = ids[0] || ''
  form.value.images = ids
}

async function loadImageSlotsFromGoods(goods: Goods) {
  const fileIds = goods.images.length
    ? goods.images
    : goods.coverImage
      ? [goods.coverImage]
      : []

  const uniqueIds = [...new Set(fileIds.filter(Boolean))]
  if (!uniqueIds.length) {
    imageSlots.value = []
    syncFormImagesFromSlots()
    return
  }

  const map = await resolveCloudImageMap(uniqueIds)
  imageSlots.value = uniqueIds.map((fileId) => ({
    fileId,
    preview:
      map.get(fileId) || (/^https?:\/\//.test(fileId) ? fileId : ''),
  }))
  syncFormImagesFromSlots()
}

async function addImages() {
  const remain = maxImages - imageSlots.value.length
  if (remain <= 0) return

  try {
    const res = await wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
    })

    const files = res.tempFiles.filter((item) => item?.tempFilePath)
    if (!files.length) return

    wx.showLoading({ title: '上传中' })
    for (const file of files) {
      const fileID = await uploadGoodsImage(file.tempFilePath)
      imageSlots.value.push({
        fileId: fileID,
        preview: file.tempFilePath,
      })
    }
    syncFormImagesFromSlots()
  } catch (err) {
    if ((err as { errMsg?: string }).errMsg?.includes('cancel')) return
    showToast({
      title: err instanceof Error ? err.message : '上传失败',
      icon: 'none',
    })
  } finally {
    wx.hideLoading()
  }
}

function removeImage(index: number) {
  if (imageSlots.value.length <= 1) {
    showToast({ title: '至少保留一张主图', icon: 'none' })
    return
  }
  imageSlots.value.splice(index, 1)
  syncFormImagesFromSlots()
}

function setAsCover(index: number) {
  if (index <= 0 || index >= imageSlots.value.length) return
  const [item] = imageSlots.value.splice(index, 1)
  imageSlots.value.unshift(item)
  syncFormImagesFromSlots()
}

function previewImages(index: number) {
  const urls = imageSlots.value.map((item) => item.preview).filter(Boolean)
  if (!urls.length) return
  wx.previewImage({
    current: urls[index] || urls[0],
    urls,
  })
}

function validateForm() {
  if (!form.value.salesType) {
    showToast({ title: '请选择商品类', icon: 'none' })
    return false
  }
  if (showFlowerPicker.value && !form.value.flowerVarietyId) {
    showToast({ title: '请选择花卉品种', icon: 'none' })
    return false
  }
  if (!form.value.name.trim()) {
    showToast({ title: '请填写品名', icon: 'none' })
    return false
  }
  if (!form.value.categoryId) {
    showToast({ title: '请选择商品分类', icon: 'none' })
    return false
  }
  if (!form.value.coverImage || !imageSlots.value.length) {
    showToast({ title: '请上传至少一张商品图', icon: 'none' })
    return false
  }
  if (Number.isNaN(Number(form.value.price)) || Number(form.value.price) < 0) {
    showToast({ title: '请填写有效价格', icon: 'none' })
    return false
  }
  if (Number.isNaN(parseInt(form.value.stock, 10)) || parseInt(form.value.stock, 10) < 0) {
    showToast({ title: '请填写有效库存', icon: 'none' })
    return false
  }
  if (form.value.salesType === 'group') {
    const perGroup = parseInt(form.value.unitsPerGroup, 10)
    if (Number.isNaN(perGroup) || perGroup <= 0) {
      showToast({ title: '请填写每组数量', icon: 'none' })
      return false
    }
  }
  return true
}

async function save() {
  if (!validateForm() || saving.value) return

  saving.value = true
  try {
    const saved = isEdit.value
      ? await updateGoods(goodsId.value, form.value)
      : await createGoods(form.value)

    if (!saved.flowerVarietyId && form.value.flowerVarietyId) {
      throw new Error('花卉信息未写入云端，请重新部署 goods 云函数后重试')
    }

    wx.removeStorageSync(FLOWER_PICK_STORAGE_KEY)
    showToast({ title: isEdit.value ? '已保存' : '已创建', icon: 'success' })

    if (returnToStockIn.value && stockInLineKey.value && !isEdit.value) {
      linkStockInLineGoods(stockInLineKey.value, saved._id, {
        name: saved.name,
        stock: saved.stock,
        unit: saved.unit,
      })
      setTimeout(() => navigateBack(), 800)
      return
    }

    setTimeout(() => navigateBack(), 1200)
  } catch (err) {
    showToast({
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
      title: '删除商品',
      content: '删除后无法恢复，确定继续？',
      confirmColor: '#e53935',
      success: (r) => resolve({ confirm: r.confirm }),
    })
  })

  if (!confirm || deleting.value) return

  deleting.value = true
  try {
    await removeGoods(goodsId.value)
    showToast({ title: '已删除', icon: 'success' })
    setTimeout(() => navigateBack(), 1200)
  } catch (err) {
    showToast({
      title: err instanceof Error ? err.message : '删除失败',
      icon: 'none',
    })
  } finally {
    deleting.value = false
  }
}
</script>

<style lang="less">
.page-merchant-goods-edit {
  min-height: 100vh;
  padding-bottom: 48rpx;
  background: #f8f8f8;
}
.images-section,
.form-card,
.category-card {
  background: #fff;
  margin-bottom: 16rpx;
}
.sales-type-card {
  padding: 24rpx 32rpx 8rpx;
}
.sales-type-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.sales-type-option {
  padding: 12rpx 24rpx;
  border-radius: 32rpx;
  background: #f5f5f5;
  font-size: 26rpx;
  color: #666;
  border: 2rpx solid transparent;
  &.active {
    background: #fce4ec;
    border-color: #f8bbd0;
    color: #e53935;
    font-weight: 600;
  }
}
.images-section {
  padding: 24rpx 32rpx;
}
.images-tip {
  margin-bottom: 16rpx;
  font-size: 22rpx;
  color: #bbb;
  line-height: 1.5;
}
.images-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.image-slot,
.image-add {
  position: relative;
  width: calc((100% - 32rpx) / 3);
  height: 200rpx;
  border-radius: 12rpx;
  overflow: hidden;
  background: #fafafa;
}
.image-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2rpx dashed #e0e0e0;
  color: #bbb;
  .plus {
    font-size: 48rpx;
    line-height: 1;
  }
  .hint {
    margin-top: 8rpx;
    font-size: 22rpx;
  }
}
.slot-img {
  width: 100%;
  height: 100%;
}
.cover-badge {
  position: absolute;
  left: 0;
  top: 0;
  padding: 4rpx 12rpx;
  font-size: 20rpx;
  color: #fff;
  background: rgba(229, 57, 53, 0.9);
  border-bottom-right-radius: 12rpx;
}
.set-cover-btn {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 6rpx 0;
  text-align: center;
  font-size: 20rpx;
  color: #fff;
  background: rgba(0, 0, 0, 0.55);
}
.remove-btn {
  position: absolute;
  top: 0;
  right: 0;
  width: 44rpx;
  height: 44rpx;
  line-height: 40rpx;
  text-align: center;
  font-size: 32rpx;
  color: #fff;
  background: rgba(0, 0, 0, 0.45);
  border-bottom-left-radius: 12rpx;
}
.picker-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 48rpx;
}
.flower-selected {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-width: 0;
}
.kind-tag {
  flex-shrink: 0;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  background: #fce4ec;
  border: 2rpx solid #f8bbd0;
  font-size: 22rpx;
  color: #e53935;
  font-weight: 600;
  line-height: 1.4;
}
.variety-name {
  flex: 1;
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.picker-value {
  flex: 1;
  font-size: 28rpx;
  color: #333;
  &.placeholder {
    color: #bbb;
  }
}
.picker-arrow {
  margin-left: 12rpx;
  font-size: 32rpx;
  color: #ccc;
  line-height: 1;
  flex-shrink: 0;
}
.recommend-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  width: 100%;
}
.recommend-hint {
  flex: 1;
  font-size: 22rpx;
  color: #999;
  line-height: 1.4;
}
.section-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
}
.category-card {
  padding: 24rpx 32rpx 32rpx;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.card-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}
.card-link {
  font-size: 24rpx;
  color: #e53935;
}
.category-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.category-option {
  display: inline-flex;
  align-items: center;
  padding: 16rpx 24rpx;
  border-radius: 32rpx;
  background: #f5f5f5;
  border: 2rpx solid transparent;
  &.active {
    background: #fce4ec;
    border-color: #f8bbd0;
    .option-name {
      color: #e53935;
      font-weight: 600;
    }
  }
}
.option-icon {
  font-size: 28rpx;
  margin-right: 8rpx;
}
.option-name {
  font-size: 26rpx;
  color: #666;
}
.empty-category {
  text-align: center;
  padding: 24rpx 0 8rpx;
}
.empty-text {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 16rpx;
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
</style>
