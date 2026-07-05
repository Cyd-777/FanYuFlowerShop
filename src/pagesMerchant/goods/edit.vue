<template>
  <view class="page-merchant-goods-edit">
    <AppNavBar :title="pageNavTitle" />
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
      <view v-if="imageSlots.length < maxImages" class="image-from-lib" @click="pickFromAsset">{{ uiText_9c8b39 }}</view>
    </view>

    <view class="form-card">
      <nut-form :key="form.unit">
        <nut-form-item :label="labelUnit">
          <view class="unit-list">
            <view
              v-for="item in unitOptions"
              :key="item.value"
              class="unit-option"
              :class="{ active: form.unit === item.value }"
              @click="selectUnit(item.value)"
            >
              {{ item.label }}
            </view>
          </view>
        </nut-form-item>

        <nut-form-item v-show="showFlowerPicker" :label="labelFlower">
          <view class="picker-cell" @click="openFlowerPicker">
            <view v-if="hasFlowerSelection" class="flower-selected">
              <text class="flower-selected-label">{{ flowerSelectionLabel }}</text>
            </view>
            <text v-else class="picker-value placeholder">{{ flowerPlaceholder }}</text>
            <text class="picker-arrow">{{ arrowText }}</text>
          </view>
        </nut-form-item>

        <nut-form-item v-if="showCategorySelector" :label="labelCategory">
          <view class="category-inline">
            <view class="category-inline-head">
              <view class="card-link" @click="goCategoryManage">{{ manageCategoryText }}</view>
            </view>
            <view v-if="selectableCategories.length" class="category-list">
              <view
                v-for="item in selectableCategories"
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
        </nut-form-item>

        <nut-form-item :label="labelName">
          <input
            class="form-text-input"
            type="text"
            :value="form.name"
            :placeholder="namePlaceholder"
            :cursor-spacing="120"
            @input="onNameInput"
          />
        </nut-form-item>

        <nut-form-item :label="labelPrice">
          <view class="form-field-end">
            <FormStepCounter
              v-model="priceNum"
              :quick-steps="priceQuickSteps"
              :decimal="2"
              :max="99999"
            />
          </view>
        </nut-form-item>

        <nut-form-item :label="labelStock">
          <view class="form-field-end">
            <FormStepCounter v-model="stockNum" :quick-steps="stockQuickSteps" />
          </view>
        </nut-form-item>

        <nut-form-item v-if="form.unit === '组'" :label="labelUnitsPerGroup">
          <input
            class="form-text-input"
            type="number"
            :value="form.unitsPerGroup"
            :placeholder="unitsPerGroupPlaceholder"
            :cursor-spacing="120"
            @input="onUnitsPerGroupInput"
          />
        </nut-form-item>

        <nut-form-item :label="labelDescription">
          <textarea
            class="form-textarea"
            :value="form.description"
            :placeholder="descriptionPlaceholder"
            :cursor-spacing="120"
            :maxlength="500"
            @input="onDescriptionInput"
          />
        </nut-form-item>

        <nut-form-item :label="labelSort">
          <input
            class="form-text-input"
            type="number"
            :value="form.sort"
            :placeholder="sortPlaceholder"
            :cursor-spacing="120"
            @input="onSortInput"
          />
        </nut-form-item>
      </nut-form>

      <view class="switch-section">
        <view class="switch-row">
          <text class="switch-label">{{ labelOnSale }}</text>
          <nut-switch v-model="form.onSale" />
        </view>
        <view class="switch-row">
          <view class="switch-label-block">
            <text class="switch-label">{{ labelRecommend }}</text>
            <text class="switch-hint">{{ recommendHint }}</text>
          </view>
          <nut-switch v-model="form.recommend" />
        </view>
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
import { ref, computed, watch } from 'vue'
import { useDidShow, useLoad } from '@tarojs/taro'
import { navigateBack, navigateTo } from '@/utils/router'
import FormStepCounter from '@/components/FormStepCounter.vue'
import {
  createGoods,
  getMerchantGoods,
  parseGoodsStockField,
  removeGoods,
  updateGoods,
} from '@/services/goods'
import { uploadAndProcessImage } from '@/services/asset'
import { readAssetPick, markAssetPickConsumed } from '@/types/assetPick'
import { linkStockInLineGoods } from '@/utils/stockInSession'
import { useMerchantCategories } from '@/composables/useMerchantCategories'
import { resolveCloudImageMap } from '@/utils/goodsImage'
import type { FlowerPickResult } from '@/types/flower'
import { FLOWER_PICK_STORAGE_KEY } from '@/types/flower'
import type { Goods, GoodsForm, GoodsUnit } from '@/types/goods'
import {
  GOODS_UNIT_OPTIONS,
  inferSalesType,
  needsFlowerPickForUnit,
  salesTypeFromUnit,
  unitFromSalesType,
} from '@/types/goods'
import { MAX_GOODS_IMAGES } from '@/types/goods'
import { filterChooseMediaFiles } from '@/utils/uploadImageLimit'
import { wikiCategoryIdFromKindName, resolveGoodsFormCategoryId } from '@/utils/goodsCategory'
import { getGoodsFlowerDisplayLabel } from '@/types/wiki'

const uiText_9c8b39 = '从素材库选择'

interface ImageSlot {
  fileId: string
  previewFileId: string
  standardFileId: string
  preview: string
}

const labelImages = '商品图片'
const imagesTip = `首张为主图，最多 ${MAX_GOODS_IMAGES} 张，详情页按顺序轮播展示`
const coverBadgeText = '主图'
const setCoverText = '设为主图'
const plusText = '+'
const uploadHint = '添加图片'
const labelUnit = '单位'
const labelFlower = '花卉选择'
const flowerPlaceholder = '请选择品类与品种'
const arrowText = '›'
const labelName = '品名'
const namePlaceholder = '如：春日混搭花束'
const labelPrice = '价格（元）'
const priceQuickSteps = [10, 50]
const labelStock = '库存'
const stockQuickSteps = [5, 10]
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
const unitOptions = GOODS_UNIT_OPTIONS

const form = ref<GoodsForm>({
  name: '',
  price: '',
  salesType: 'bouquet',
  unit: '束',
  stock: '0',
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
const pageNavTitle = computed(() => (isEdit.value ? '编辑商品' : '新建商品'))
const showFlowerPicker = computed(() => needsFlowerPickForUnit(form.value.unit))
const hasFlowerSelection = computed(
  () => !!(form.value.flowerVarietyId || (form.value.flowerKindName && form.value.flowerVarietyName)),
)
const flowerSelectionLabel = computed(() => getGoodsFlowerDisplayLabel(form.value))
/** 支/组 → 隐藏分类；束→花束场景；件→物料品类 */
const showCategorySelector = computed(() => {
  return form.value.unit !== '支' && form.value.unit !== '组'
})
const selectableCategories = computed(() => {
  const unit = form.value.unit
  // 支/组 → 无需分类
  if (unit === '支' || unit === '组') return []
  // 束 → 花束场景（含无商品的预设标签，便于创建首件商品）
  if (unit === '束') {
    return categoryOptions.value.filter((c) => c.categoryType === 'bouquet' && c._source !== 'wiki')
  }
  // 件 → 物料品类
  return categoryOptions.value.filter((c) => c.categoryType === 'material')
})
const saveButtonText = computed(() => (isEdit.value ? saveEditButtonText : createButtonText))

const priceNum = computed({
  get() {
    const n = Number(form.value.price)
    return Number.isNaN(n) ? 0 : n
  },
  set(v: number) {
    const clamped = Math.max(0, Math.round(v * 100) / 100)
    form.value.price = String(clamped)
  },
})

function onNameInput(e: { detail: { value: string } }) {
  form.value.name = e.detail.value
}

function onDescriptionInput(e: { detail: { value: string } }) {
  form.value.description = e.detail.value
}

function onSortInput(e: { detail: { value: string } }) {
  form.value.sort = e.detail.value
}

function onUnitsPerGroupInput(e: { detail: { value: string } }) {
  form.value.unitsPerGroup = e.detail.value
}

const stockNum = computed({
  get() {
    const n = parseInt(form.value.stock, 10)
    return Number.isNaN(n) ? 0 : n
  },
  set(v: number) {
    form.value.stock = String(Math.max(0, Math.round(v)))
  },
})

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
  wx.setNavigationBarTitle({ title: pageNavTitle.value })
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

  // 从素材库选取返回
  const assetPick = readAssetPick()
  if (assetPick && !assetPick.consumed && assetPick.originalFileId) {
    markAssetPickConsumed()
    applyAssetPick(assetPick)
    return
  }

  if (!pageBootstrapped.value) return
  await refreshMerchantCategories()
  syncCategoryForCurrentUnit()
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

function selectUnit(unit: GoodsUnit) {
  if (form.value.unit === unit) return
  form.value.unit = unit
  form.value.salesType = salesTypeFromUnit(unit)
  if (unit !== '组') {
    form.value.unitsPerGroup = ''
  }
  if (!needsFlowerPickForUnit(unit)) {
    clearFlowerSelection()
  }
}

function applyFlowerPick(pick: FlowerPickResult) {
  goodsLoadSeq += 1
  form.value.flowerKindId = pick.flowerKindId
  form.value.flowerKindName = pick.flowerKindName
  form.value.flowerVarietyId = pick.flowerVarietyId
  form.value.flowerVarietyName = pick.flowerVarietyName
  if (!form.value.name.trim()) {
    form.value.name = pick.name
  }
  if (!form.value.description.trim()) {
    form.value.description = pick.description
  }
  matchCategoryByKindName(pick.flowerKindName)
}

function applyGoodsToForm(goods: Goods) {
  const unit = goods.unit || unitFromSalesType(inferSalesType(goods))
  form.value.unit = unit
  form.value.salesType = salesTypeFromUnit(unit)
  form.value.name = goods.name
  form.value.price = String(goods.price)
  form.value.stock = String(goods.stock)
  form.value.description = goods.description
  form.value.categoryId = goods.categoryId || selectableCategories.value[0]?._id || ''
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

function wikiCategoryId(kindName: string) {
  return wikiCategoryIdFromKindName(kindName)
}

/** 支/组单位：由花卉种类自动推导 wiki 衍生分类 */
function applyAutoCategoryForStemOrGroup() {
  const unit = form.value.unit
  if (unit !== '支' && unit !== '组') return
  const id = wikiCategoryId(form.value.flowerKindName)
  if (id) form.value.categoryId = id
}

/** 束/件：确保 categoryId 落在当前单位可选分类内（分类异步加载后也会重算） */
function syncCategoryForCurrentUnit() {
  const unit = form.value.unit
  if (unit === '支' || unit === '组') {
    applyAutoCategoryForStemOrGroup()
    return
  }
  const options = selectableCategories.value
  if (!options.length) {
    form.value.categoryId = ''
    return
  }
  if (!options.some((c) => c._id === form.value.categoryId)) {
    form.value.categoryId = options[0]._id
  }
}

function matchCategoryByKindName(kindName: string) {
  const unit = form.value.unit
  if (unit === '支' || unit === '组') {
    const id = wikiCategoryId(kindName)
    if (id) form.value.categoryId = id
    return
  }
  const matched = selectableCategories.value.find((item) => item.name === kindName)
  if (matched) form.value.categoryId = matched._id
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
    syncCategoryForCurrentUnit()
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
  const cover = imageSlots.value[0]
  form.value.previewFileId = cover?.previewFileId || ''
  form.value.standardFileId = cover?.standardFileId || ''
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
  const isCover = (fileId) => fileId === goods.coverImage
  imageSlots.value = uniqueIds.map((fileId) => ({
    fileId,
    previewFileId: isCover(fileId) ? (goods.previewFileId || '') : '',
    standardFileId: isCover(fileId) ? (goods.standardFileId || '') : '',
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

    const files = filterChooseMediaFiles(res.tempFiles)
    if (!files.length) return

    wx.showLoading({ title: '上传中' })
    for (const file of files) {
      const name = form.value.name.trim() || `商品图_${Date.now()}`
      const result = await uploadAndProcessImage(file.tempFilePath, name)
      imageSlots.value.push({
        fileId: result.originalFileId,
        previewFileId: result.previewFileId,
        standardFileId: result.standardFileId,
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

/** 从素材库选取的结果应用到图片槽 */
function applyAssetPick(pick: { originalFileId: string; previewFileId: string; standardFileId: string }) {
  const names = new Set(imageSlots.value.map((s) => s.fileId))
  if (names.has(pick.originalFileId)) {
    showToast({ title: '该素材已添加', icon: 'none' })
    return
  }
  imageSlots.value.push({
    fileId: pick.originalFileId,
    previewFileId: pick.previewFileId,
    standardFileId: pick.standardFileId,
    preview: pick.originalFileId,
  })
  syncFormImagesFromSlots()
  showToast({ title: '已添加', icon: 'success' })
}

function pickFromAsset() {
  const excludeIds = imageSlots.value.map((s) => s.fileId).join(',')
  navigateTo({
    url: `/pagesMerchant/asset/index?picker=1&type=goods${excludeIds ? '&exclude=' + excludeIds : ''}`,
  })
}

function removeImage(index: number) {
  // 编辑已有商品：至少保留一张；新建时可删光后重传
  if (isEdit.value && imageSlots.value.length <= 1) {
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
  if (!form.value.unit) {
    showToast({ title: '请选择单位', icon: 'none' })
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
  syncCategoryForCurrentUnit()
  form.value.categoryId = resolveGoodsFormCategoryId(form.value)
  if (form.value.unit !== '支' && form.value.unit !== '组' && !form.value.categoryId) {
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
  const stock = parseGoodsStockField(form.value.stock)
  if (Number.isNaN(stock) || stock < 0) {
    showToast({ title: '请填写有效库存', icon: 'none' })
    return false
  }
  if (form.value.unit === '组') {
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
    syncCategoryForCurrentUnit()
    form.value.categoryId = resolveGoodsFormCategoryId(form.value)

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

/** 切换单位或分类列表就绪后，重置分类到当前单位可用项 */
watch(
  () => form.value.unit,
  () => {
    syncCategoryForCurrentUnit()
  },
)

watch(selectableCategories, () => {
  syncCategoryForCurrentUnit()
})
</script>

<style lang="less">
.page-merchant-goods-edit {
  min-height: 100vh;
  padding-bottom: 48rpx;
  background: #f8f8f8;
}
.images-section,
.form-card {
  background: #fff;
  margin-bottom: 16rpx;
}
.form-card {
  padding-bottom: 8rpx;
}
.form-text-input {
  width: 100%;
  min-height: 72rpx;
  padding: 16rpx 20rpx;
  font-size: 28rpx;
  color: #333;
  background: #f5f5f5;
  border-radius: 12rpx;
  box-sizing: border-box;
}
.form-textarea {
  width: 100%;
  min-height: 160rpx;
  padding: 16rpx 20rpx;
  font-size: 28rpx;
  color: #333;
  line-height: 1.5;
  background: #f5f5f5;
  border-radius: 12rpx;
  box-sizing: border-box;
}
.category-inline {
  width: 100%;
}
.category-inline-head {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12rpx;
}
.sales-type-card,
.unit-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.sales-type-option,
.unit-option {
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
.image-from-lib {
  margin-top: 16rpx;
  padding: 18rpx 0;
  text-align: center;
  font-size: 26rpx;
  color: #e53935;
  background: #fff5f5;
  border-radius: 12rpx;
  border: 2rpx solid #ffcdd2;
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
  min-width: 0;
}
.flower-selected-label {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.picker-value {
  flex: 1;
  font-size: 28rpx;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
.form-field-end {
  display: flex;
  justify-content: flex-end;
  width: 100%;
}
.switch-section {
  padding: 8rpx 32rpx 24rpx;
  border-top: 2rpx solid #f5f5f5;
}
.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
  min-height: 88rpx;
  &:not(:last-child) {
    margin-bottom: 8rpx;
  }
}
.switch-label-block {
  flex: 1;
  min-width: 0;
}
.switch-label {
  display: block;
  font-size: 28rpx;
  color: #333;
}
.switch-hint {
  display: block;
  margin-top: 6rpx;
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
