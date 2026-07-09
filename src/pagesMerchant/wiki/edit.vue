<template>
  <view class="page-merchant-wiki-edit">
    <AppNavBar :title="pageTitle" />
    <view v-if="pageLoading" class="loading-tip">{{ loadingTipText }}</view>

    <template v-else>
      <view class="edit-mode-bar">
        <view
          class="edit-mode-bar__item"
          :class="{ active: editMode === 'note' }"
          @tap="editMode = 'note'"
        >
          {{ noteModeLabel }}
        </view>
        <view
          class="edit-mode-bar__item"
          :class="{ active: editMode === 'form' }"
          @tap="editMode = 'form'"
        >
          {{ formModeLabel }}
        </view>
      </view>

      <view v-if="hasBuiltinOverlay" class="overlay-banner">
        <text class="overlay-banner__title">{{ overlayBannerTitle }}</text>
        <text class="overlay-banner__desc">{{ overlayBannerDesc }}</text>
      </view>

      <WikiMerchantNoteEditor
        v-if="editMode === 'note'"
        :form="form"
        @switch-form="editMode = 'form'"
        @picker="onNotePicker"
      />

      <scroll-view v-else scroll-y class="edit-scroll" :show-scrollbar="false">
      <WikiSmartPasteCard :form="form" />

      <!-- 基本信息 -->
      <view class="article-card">
        <view class="article-section-title">基本信息</view>
        <view class="article-field">
          <text class="article-field__label">种类 *</text>
          <input
            class="article-field__input"
            v-model="form.kindName"
            placeholder="如：玫瑰、百合"
            :disabled="!!isEdit"
            @blur="onKindBlur"
          />
        </view>
        <view class="article-field">
          <text class="article-field__label">品种</text>
          <input class="article-field__input" v-model="form.varietyName" placeholder="留空=种类级词条" />
        </view>
        <view class="article-field">
          <text class="article-field__label">图标</text>
          <input class="article-field__input article-field__input--short" v-model="form.icon" maxlength="2" />
        </view>
        <view class="article-field article-field--picker" @tap="openPicker('plantForm')">
          <text class="article-field__label">形态</text>
          <text class="article-field__value">{{ plantFormLabel }}</text>
          <text class="article-field__arrow">›</text>
        </view>
        <view class="article-field article-field--switch">
          <text class="article-field__label">启用</text>
          <nut-switch v-model="form.enabled" />
        </view>
      </view>

      <!-- 介绍 -->
      <view class="article-card">
        <view class="article-section-title">介绍</view>
        <view class="article-section-desc">与顾客端图鉴正文同源；选公共块后自动拼装段落</view>

        <view class="article-field article-field--picker" @tap="openPicker('taxonomy')">
          <text class="article-field__label">生物学分类</text>
          <text class="article-field__value">{{ taxonomyLabel }}</text>
          <text class="article-field__arrow">›</text>
        </view>
        <view class="article-field">
          <text class="article-field__label">学名</text>
          <input class="article-field__input" v-model="form.scientificName" placeholder="Rosa 'Pink Floyd'" />
        </view>
        <view class="article-field">
          <text class="article-field__label">俗名</text>
          <input class="article-field__input" v-model="form.commonNamesText" placeholder="逗号分隔" />
        </view>
        <view class="article-field article-field--picker" @tap="openPicker('group')">
          <text class="article-field__label">园艺分类</text>
          <text class="article-field__value">{{ groupLabel }}</text>
          <text class="article-field__arrow">›</text>
        </view>
        <view class="article-field">
          <text class="article-field__label">育种者</text>
          <input class="article-field__input" v-model="form.breeder" placeholder="选填" />
        </view>
        <view class="article-field">
          <text class="article-field__label">推出年代</text>
          <input class="article-field__input" v-model="form.introducedYear" placeholder="如：2008 年前后" />
        </view>
        <view class="article-field article-field--textarea">
          <text class="article-field__label">命名说明</text>
          <textarea
            class="article-textarea"
            :value="form.namingNote"
            placeholder="品种背景、命名由来"
            @input="onTextInput('namingNote', $event)"
          />
        </view>
        <view class="article-field">
          <text class="article-field__label">育种地</text>
          <input class="article-field__input" v-model="form.breedingOrigin" placeholder="如：荷兰" />
        </view>
        <view class="article-field article-field--picker" @tap="openPicker('regions')">
          <text class="article-field__label">主产区</text>
          <text class="article-field__value">{{ regionsLabel }}</text>
          <text class="article-field__arrow">›</text>
        </view>

        <view class="article-subtitle">形态描述</view>
        <view class="article-field article-field--picker" @tap="openPicker('flowerForm')">
          <text class="article-field__label">花型</text>
          <text class="article-field__value">{{ flowerFormLabel }}</text>
          <text class="article-field__arrow">›</text>
        </view>
        <view class="article-field">
          <text class="article-field__label">瓣数</text>
          <input class="article-field__input" v-model="form.petalCount" placeholder="如：35 至 45 枚" />
        </view>
        <view class="article-field">
          <text class="article-field__label">花径 cm</text>
          <input class="article-field__input" v-model="form.bloomDiameterCm" placeholder="如：8 至 10" />
        </view>
        <view class="article-field article-field--textarea">
          <text class="article-field__label">色泽</text>
          <textarea
            class="article-textarea"
            :value="form.color"
            placeholder="颜色与质感描述"
            @input="onTextInput('color', $event)"
          />
        </view>
        <view class="article-field">
          <text class="article-field__label">茎</text>
          <input class="article-field__input" v-model="form.stem" placeholder="茎干特征" />
        </view>
        <view class="article-field">
          <text class="article-field__label">叶</text>
          <input class="article-field__input" v-model="form.foliage" placeholder="叶片特征" />
        </view>
        <view class="article-field">
          <text class="article-field__label">香气</text>
          <input class="article-field__input" v-model="form.scent" placeholder="如：淡清甜香" />
        </view>
        <view class="article-field article-field--picker" @tap="openPicker('features')">
          <text class="article-field__label">特征 chip</text>
          <text class="article-field__value">{{ featuresLabel }}</text>
          <text class="article-field__arrow">›</text>
        </view>

        <view class="article-subtitle">易混辨识</view>
        <view v-for="(row, idx) in form.distinguishFrom" :key="idx" class="distinguish-row">
          <input
            class="distinguish-input"
            :value="row.name"
            placeholder="对比品种"
            @input="onDistinguishInput(idx, 'name', $event)"
          />
          <textarea
            class="distinguish-diff"
            :value="row.difference"
            placeholder="差异说明"
            @input="onDistinguishInput(idx, 'difference', $event)"
          />
          <text v-if="form.distinguishFrom.length > 1" class="distinguish-remove" @tap="removeDistinguish(idx)">删</text>
        </view>
        <view class="article-add-btn" @tap="addDistinguish">+ 添加对比项</view>
      </view>

      <!-- 能开多久 -->
      <view class="article-card">
        <view class="article-section-title">能开多久</view>
        <view class="article-field">
          <text class="article-field__label">瓶插天数</text>
          <input class="article-field__input" v-model="form.bloomVase" placeholder="约 5—8 天" />
        </view>
        <view class="article-field">
          <text class="article-field__label">补充说明</text>
          <input class="article-field__input" v-model="form.bloomVaseNote" placeholder="分季、养护影响等" />
        </view>
        <view class="article-field">
          <text class="article-field__label">土培花期</text>
          <input class="article-field__input" v-model="form.bloomSoil" placeholder="可选" />
        </view>
      </view>

      <!-- 养护方式 -->
      <view class="article-card">
        <view class="article-section-title">养护方式</view>
        <view class="article-field article-field--picker" @tap="openPicker('careBase')">
          <text class="article-field__label">种类底稿</text>
          <text class="article-field__value">{{ careBaseLabel }}</text>
          <text class="article-field__arrow">›</text>
        </view>
        <view v-if="careBaseHint" class="care-base-hint">{{ careBaseHint }}</view>
        <view class="article-subtitle">品种覆盖（写入云库）</view>
        <view class="article-field article-field--textarea">
          <text class="article-field__label">开篇摘要</text>
          <textarea
            class="article-textarea"
            :value="form.careSummary"
            placeholder="覆盖底稿 summary"
            @input="onTextInput('careSummary', $event)"
          />
        </view>
        <view class="article-field article-field--textarea">
          <text class="article-field__label">换水</text>
          <textarea
            class="article-textarea"
            :value="form.careWaterChange"
            @input="onTextInput('careWaterChange', $event)"
          />
        </view>
        <view class="article-field">
          <text class="article-field__label">修剪</text>
          <input class="article-field__input" v-model="form.careTrim" />
        </view>
        <view class="article-field">
          <text class="article-field__label">水深</text>
          <input class="article-field__input" v-model="form.careWaterDepth" />
        </view>
        <view class="article-field article-field--textarea">
          <text class="article-field__label">Tips</text>
          <textarea
            class="article-textarea"
            :value="form.careTipsText"
            placeholder="一行一条"
            @input="onTextInput('careTipsText', $event)"
          />
        </view>
        <view class="care-ref-link" hover-class="care-ref-link--active" @tap="goCareReference">
          <text>{{ careRefLinkText }}</text>
          <text class="care-ref-link__arrow">›</text>
        </view>
      </view>

      <!-- 花语 -->
      <view class="article-card">
        <view class="article-section-title">花语</view>
        <view class="article-field">
          <text class="article-field__label">核心花语</text>
          <input class="article-field__input" v-model="form.languageMeaning" placeholder="一句话" />
        </view>
        <view class="article-field article-field--textarea">
          <text class="article-field__label">正文</text>
          <textarea
            class="article-textarea article-textarea--tall"
            :value="form.languageParagraphsText"
            placeholder="段落之间空一行"
            @input="onTextInput('languageParagraphsText', $event)"
          />
        </view>
        <view class="article-field article-field--picker" @tap="openPicker('occasions')">
          <text class="article-field__label">适用场合</text>
          <text class="article-field__value">{{ occasionsLabel }}</text>
          <text class="article-field__arrow">›</text>
        </view>

        <view class="article-subtitle">色彩寓意</view>
        <view v-for="(row, idx) in form.colorMeanings" :key="`c-${idx}`" class="pair-row">
          <input class="pair-input" v-model="row.color" placeholder="颜色" />
          <input class="pair-input pair-input--wide" v-model="row.meaning" placeholder="寓意" />
          <text class="pair-remove" @tap="removeColorMeaning(idx)">删</text>
        </view>
        <view class="article-add-btn" @tap="addColorMeaning">+ 添加色彩</view>

        <view class="article-subtitle">搭配建议</view>
        <view v-for="(row, idx) in form.pairing" :key="`p-${idx}`" class="pairing-block">
          <input class="pair-input" v-model="row.style" placeholder="风格名" />
          <input class="pair-input" v-model="row.flowersText" placeholder="花材，逗号分隔" />
          <textarea class="pair-note" v-model="row.note" placeholder="说明" />
          <text class="pair-remove" @tap="removePairing(idx)">删</text>
        </view>
        <view class="article-add-btn" @tap="addPairing">+ 添加搭配</view>

        <view class="article-field article-field--textarea">
          <text class="article-field__label">送花注意</text>
          <textarea
            class="article-textarea"
            :value="form.languageCaution"
            @input="onTextInput('languageCaution', $event)"
          />
        </view>
      </view>

      <!-- 搜索 -->
      <view class="article-card">
        <view class="article-section-title">搜索索引</view>
        <view class="article-field">
          <text class="article-field__label">别称</text>
          <input class="article-field__input" v-model="form.aliasesText" placeholder="逗号分隔" />
        </view>
        <view class="article-field">
          <text class="article-field__label">标签</text>
          <input class="article-field__input" v-model="form.tagsText" placeholder="逗号分隔" />
        </view>
        <view class="article-field">
          <text class="article-field__label">关键词</text>
          <input class="article-field__input" v-model="form.keywordsText" placeholder="逗号分隔" />
        </view>
      </view>

      <view v-if="isEdit" class="article-card danger-card">
        <view class="delete-row" @tap="confirmDelete">{{ deleteLabelText }}</view>
      </view>

      <view class="scroll-bottom-spacer" />
    </scroll-view>
    </template>

    <view v-if="!pageLoading" class="submit-bar">
      <nut-button type="primary" class="submit-btn" :loading="saving" :disabled="!canSave" @tap="handleSave">
        {{ isEdit ? '保存修改' : '创建词条' }}
      </nut-button>
    </view>

    <WikiBlockPickerSheet
      v-model:visible="pickerVisible"
      :title="pickerTitle"
      :mode="pickerMode"
      :options="pickerOptions"
      :model-value="pickerValue"
      @confirm="onPickerConfirm"
    />
  </view>
</template>

<script setup lang="ts">
import { showToast } from '@/utils/feedback'
import { computed, ref } from 'vue'
import { useRouter } from '@tarojs/taro'
import WikiBlockPickerSheet from '@/components/wiki/WikiBlockPickerSheet.vue'
import WikiMerchantNoteEditor from '@/components/wiki/WikiMerchantNoteEditor.vue'
import WikiSmartPasteCard from '@/components/wiki/WikiSmartPasteCard.vue'
import { getWikiVarietyOverlay } from '@/data/wiki/varieties'
import { getMerchantWiki, createWiki, updateWiki, removeWiki } from '@/services/wiki'
import { getWikiFullLabel } from '@/types/wiki'
import type { WikiBlockId } from '@/types/wikiBlocks'
import { navigateBack, navigateTo } from '@/utils/router'
import {
  formatBlockSelection,
  listCareBaseBlockOptions,
  listGroupBlockOptions,
  listRegionBlockOptions,
  listTaxonomyBlockOptions,
  listTraitBlockOptions,
  WIKI_OCCASION_OPTIONS,
  type WikiBlockOption,
} from '@/utils/wikiBlockCatalog'
import { resolveCareVaseBlock, resolveGroupLabel, resolveRegionLabel, resolveTaxonomyLine, resolveTraitLabel } from '@/utils/wikiBlockRegistry'
import {
  articleEditFormToWikiPayload,
  emptyWikiArticleEditForm,
  syncKindDefaults,
  wikiToArticleEditForm,
  WIKI_PLANT_FORM_OPTIONS,
  type WikiArticleEditForm,
} from '@/utils/wikiMerchantForm'

const loadingTipText = '加载中…'
const noteModeLabel = '笔记'
const formModeLabel = '表单'
const deleteLabelText = '删除此词条'
const overlayBannerTitle = '内置 L2 专文'
const overlayBannerDesc =
  '该品种有小程序内置详文，顾客详情优先展示内置内容；此处写入云库，用于搜索、别称与无内置时的展示。'
const careRefLinkText = '养护图示说明'

type PickerKey =
  | 'taxonomy'
  | 'group'
  | 'regions'
  | 'flowerForm'
  | 'features'
  | 'careBase'
  | 'occasions'
  | 'plantForm'

const router = useRouter()
const params = router.params as Record<string, string> | undefined
const wikiId = ref(params?.id || '')
const isEdit = computed(() => !!wikiId.value)
const pageLoading = ref(false)
const saving = ref(false)
const hasBuiltinOverlay = ref(false)
const editMode = ref<'note' | 'form'>('note')

const form = ref<WikiArticleEditForm>(
  emptyWikiArticleEditForm({
    kindName: params?.kindName ? decodeURIComponent(params.kindName) : '',
    icon: params?.icon ? decodeURIComponent(params.icon) : '🌷',
  }),
)

const pageTitle = computed(() => {
  if (!isEdit.value || !form.value.kindName.trim()) return '新建词条'
  return `编辑: ${getWikiFullLabel(form.value)}`
})

const canSave = computed(() => form.value.kindName.trim().length > 0)

const plantFormLabel = computed(
  () => WIKI_PLANT_FORM_OPTIONS.find((item) => item.value === form.value.plantForm)?.label || '鲜切花',
)

const taxonomyLabel = computed(() =>
  form.value.taxonomyRef ? resolveTaxonomyLine(form.value.taxonomyRef) || form.value.taxonomyRef : '点击选择',
)
const groupLabel = computed(() =>
  form.value.horticulturalGroup
    ? resolveGroupLabel(form.value.horticulturalGroup) || form.value.horticulturalGroup
    : '点击选择',
)
const regionsLabel = computed(() =>
  formatBlockSelection(form.value.productionRegions, resolveRegionLabel) || '点击选择',
)
const flowerFormLabel = computed(() =>
  formatBlockSelection(form.value.flowerForm, resolveTraitLabel) || '点击选择',
)
const featuresLabel = computed(() =>
  formatBlockSelection(form.value.featureRefs, resolveTraitLabel) || '点击选择',
)
const careBaseLabel = computed(() => {
  if (!form.value.careBaseRef) return '点击选择'
  const opt = listCareBaseBlockOptions().find((item) => item.id === form.value.careBaseRef)
  return opt?.label || form.value.careBaseRef
})
const careBaseHint = computed(() => {
  const care = resolveCareVaseBlock(form.value.careBaseRef)
  return care?.summary?.trim() || ''
})
const occasionsLabel = computed(() =>
  form.value.occasions.length ? form.value.occasions.join('、') : '点击选择',
)

const pickerVisible = ref(false)
const pickerKey = ref<PickerKey>('taxonomy')
const pickerTitle = ref('')
const pickerMode = ref<'single' | 'multiple'>('single')
const pickerOptions = ref<WikiBlockOption[]>([])
const pickerValue = ref<string | string[]>([])

const occasionOptions: WikiBlockOption[] = WIKI_OCCASION_OPTIONS.map((label) => ({
  id: label,
  label,
}))

const plantFormOptions: WikiBlockOption[] = WIKI_PLANT_FORM_OPTIONS.map((item) => ({
  id: item.value,
  label: item.label,
}))

function onKindBlur() {
  syncKindDefaults(form.value)
  refreshOverlayFlag()
}

function onTextInput(field: keyof WikiArticleEditForm, e: { detail: { value: string } }) {
  ;(form.value as Record<string, unknown>)[field] = e.detail.value
}

function onDistinguishInput(
  idx: number,
  field: 'name' | 'difference',
  e: { detail: { value: string } },
) {
  form.value.distinguishFrom[idx][field] = e.detail.value
}

function addDistinguish() {
  form.value.distinguishFrom.push({ name: '', difference: '' })
}

function removeDistinguish(idx: number) {
  form.value.distinguishFrom.splice(idx, 1)
}

function addColorMeaning() {
  form.value.colorMeanings.push({ color: '', meaning: '' })
}

function removeColorMeaning(idx: number) {
  form.value.colorMeanings.splice(idx, 1)
}

function addPairing() {
  form.value.pairing.push({ style: '', flowersText: '', note: '' })
}

function removePairing(idx: number) {
  form.value.pairing.splice(idx, 1)
}

function openPicker(key: PickerKey) {
  pickerKey.value = key
  if (key === 'taxonomy') {
    pickerTitle.value = '生物学分类'
    pickerMode.value = 'single'
    pickerOptions.value = listTaxonomyBlockOptions()
    pickerValue.value = form.value.taxonomyRef
  } else if (key === 'group') {
    pickerTitle.value = '园艺分类'
    pickerMode.value = 'single'
    pickerOptions.value = listGroupBlockOptions()
    pickerValue.value = form.value.horticulturalGroup
  } else if (key === 'regions') {
    pickerTitle.value = '主产区'
    pickerMode.value = 'multiple'
    pickerOptions.value = listRegionBlockOptions()
    pickerValue.value = [...form.value.productionRegions]
  } else if (key === 'flowerForm' || key === 'features') {
    pickerTitle.value = key === 'flowerForm' ? '花型' : '特征 chip'
    pickerMode.value = 'multiple'
    pickerOptions.value = listTraitBlockOptions()
    pickerValue.value =
      key === 'flowerForm' ? [...form.value.flowerForm] : [...form.value.featureRefs]
  } else if (key === 'careBase') {
    pickerTitle.value = '种类养护底稿'
    pickerMode.value = 'single'
    pickerOptions.value = listCareBaseBlockOptions()
    pickerValue.value = form.value.careBaseRef
  } else if (key === 'occasions') {
    pickerTitle.value = '适用场合'
    pickerMode.value = 'multiple'
    pickerOptions.value = occasionOptions
    pickerValue.value = [...form.value.occasions]
  } else if (key === 'plantForm') {
    pickerTitle.value = '植物形态'
    pickerMode.value = 'single'
    pickerOptions.value = plantFormOptions
    pickerValue.value = form.value.plantForm
  }
  pickerVisible.value = true
}

function onPickerConfirm(value: string | string[]) {
  const key = pickerKey.value
  if (key === 'taxonomy' && typeof value === 'string') {
    form.value.taxonomyRef = value as WikiBlockId
  } else if (key === 'group' && typeof value === 'string') {
    form.value.horticulturalGroup = value as WikiBlockId
  } else if (key === 'regions' && Array.isArray(value)) {
    form.value.productionRegions = value as WikiBlockId[]
  } else if (key === 'flowerForm' && Array.isArray(value)) {
    form.value.flowerForm = value as WikiBlockId[]
  } else if (key === 'features' && Array.isArray(value)) {
    form.value.featureRefs = value as WikiBlockId[]
  } else if (key === 'careBase' && typeof value === 'string') {
    form.value.careBaseRef = value as WikiBlockId
  } else if (key === 'occasions' && Array.isArray(value)) {
    form.value.occasions = value
  } else if (key === 'plantForm' && typeof value === 'string') {
    form.value.plantForm = value as WikiArticleEditForm['plantForm']
  }
}

function refreshOverlayFlag() {
  const kind = form.value.kindName.trim()
  const variety = form.value.varietyName.trim()
  hasBuiltinOverlay.value = Boolean(kind && variety && getWikiVarietyOverlay(kind, variety))
}

function onNotePicker(key: string) {
  openPicker(key as PickerKey)
}

function goCareReference() {
  navigateTo({ url: '/pagesMerchant/wiki/care-reference' })
}

if (isEdit.value) {
  pageLoading.value = true
  getMerchantWiki(wikiId.value)
    .then((wiki) => {
      form.value = wikiToArticleEditForm(wiki)
      if (!form.value.distinguishFrom.length) {
        form.value.distinguishFrom = [{ name: '', difference: '' }]
      }
      refreshOverlayFlag()
    })
    .catch((err) => {
      showToast({ title: err instanceof Error ? err.message : '加载失败', icon: 'none' })
    })
    .finally(() => {
      pageLoading.value = false
    })
} else {
  syncKindDefaults(form.value)
  form.value.distinguishFrom = [{ name: '', difference: '' }]
}

async function handleSave() {
  if (!canSave.value || saving.value) return
  saving.value = true
  try {
    const payload = articleEditFormToWikiPayload(form.value)
    if (isEdit.value) {
      await updateWiki(wikiId.value, payload)
      showToast({ title: '已保存', icon: 'success' })
    } else {
      await createWiki(payload)
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
    confirmColor: '@color-primary',
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
@import '@/styles/tokens.less';
.page-merchant-wiki-edit {
  min-height: 100vh;
  background: @color-bg-page;
  display: flex;
  flex-direction: column;
}

.edit-mode-bar {
  display: flex;
  margin: 12rpx 16rpx 0;
  padding: 6rpx;
  background: #fff;
  border-radius: 12rpx;
  border: 1rpx solid #eee;
}

.edit-mode-bar__item {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  font-size: 26rpx;
  color: #666;
  border-radius: 8rpx;

  &.active {
    color: @color-primary;
    font-weight: 600;
    background: @color-danger-bg-alt;
  }
}

.loading-tip {
  padding: 80rpx 32rpx;
  text-align: center;
  font-size: 26rpx;
  color: #999;
}

.edit-scroll {
  flex: 1;
  height: calc(100vh - 200rpx);
}

.scroll-bottom-spacer {
  height: 160rpx;
}

.overlay-banner {
  margin: 16rpx 16rpx 0;
  padding: 20rpx 24rpx;
  background: @color-warning-bg;
  border-radius: 12rpx;
  border: 1rpx solid @color-wiki-amber-bg;
}

.overlay-banner__title {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: @color-wiki-amber;
}

.overlay-banner__desc {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: @color-wiki-amber;
  line-height: 1.55;
}

.article-card {
  margin: 16rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 16rpx;
}

.article-section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 8rpx;
}

.article-section-desc {
  font-size: 22rpx;
  color: #999;
  line-height: 1.5;
  margin-bottom: 16rpx;
}

.article-subtitle {
  margin: 24rpx 0 12rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #666;
}

.article-field {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 14rpx 0;
  border-bottom: 1rpx solid @color-bg-muted;

  &:last-child {
    border-bottom: none;
  }

  &--picker {
    align-items: center;
  }

  &--switch {
    align-items: center;
  }

  &--textarea {
    flex-direction: column;
    gap: 8rpx;
  }
}

.article-field__label {
  width: 148rpx;
  flex-shrink: 0;
  font-size: 26rpx;
  color: #666;
  line-height: 1.5;
  padding-top: 8rpx;
}

.article-field--picker .article-field__label,
.article-field--switch .article-field__label {
  padding-top: 0;
}

.article-field__input {
  flex: 1;
  min-height: 64rpx;
  font-size: 28rpx;
  padding: 8rpx 12rpx;
  background: @color-bg-surface-alt;
  border-radius: 8rpx;

  &--short {
    max-width: 120rpx;
  }
}

.article-field__value {
  flex: 1;
  font-size: 28rpx;
  color: #333;
  line-height: 1.45;
}

.article-field__arrow {
  font-size: 32rpx;
  color: #ccc;
}

.article-textarea {
  width: 100%;
  min-height: 120rpx;
  font-size: 28rpx;
  line-height: 1.55;
  padding: 16rpx 12rpx;
  background: @color-bg-surface-alt;
  border-radius: 8rpx;
  box-sizing: border-box;

  &--tall {
    min-height: 220rpx;
  }
}

.distinguish-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 12rpx;
  align-items: flex-start;
}

.distinguish-input {
  width: 160rpx;
  height: 64rpx;
  font-size: 26rpx;
  padding: 0 12rpx;
  background: @color-bg-surface-alt;
  border-radius: 8rpx;
}

.distinguish-diff {
  flex: 1;
  min-width: 200rpx;
  min-height: 80rpx;
  font-size: 26rpx;
  padding: 12rpx;
  background: @color-bg-surface-alt;
  border-radius: 8rpx;
}

.distinguish-remove,
.pair-remove {
  font-size: 24rpx;
  color: @color-primary;
  padding: 8rpx;
}

.article-add-btn {
  margin-top: 8rpx;
  font-size: 26rpx;
  color: @color-primary;
  padding: 12rpx 0;
}

.pair-row {
  display: flex;
  gap: 12rpx;
  align-items: center;
  margin-bottom: 12rpx;
}

.pair-input {
  flex: 1;
  height: 64rpx;
  font-size: 26rpx;
  padding: 0 12rpx;
  background: @color-bg-surface-alt;
  border-radius: 8rpx;

  &--wide {
    flex: 2;
  }
}

.pairing-block {
  position: relative;
  padding: 16rpx;
  margin-bottom: 12rpx;
  background: @color-bg-input;
  border-radius: 12rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;

  .pair-remove {
    position: absolute;
    top: 8rpx;
    right: 8rpx;
  }
}

.pair-note {
  min-height: 72rpx;
  font-size: 26rpx;
  padding: 12rpx;
  background: #fff;
  border-radius: 8rpx;
}

.care-base-hint {
  font-size: 22rpx;
  color: #999;
  line-height: 1.5;
  padding: 0 0 12rpx 148rpx;
}

.care-ref-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12rpx;
  padding: 16rpx 12rpx;
  font-size: 26rpx;
  color: @color-primary;
  background: @color-danger-bg-alt;
  border-radius: 8rpx;
}

.care-ref-link--active {
  opacity: 0.85;
}

.care-ref-link__arrow {
  font-size: 32rpx;
}

.danger-card {
  padding-top: 8rpx;
  padding-bottom: 8rpx;
}

.delete-row {
  padding: 20rpx 0;
  text-align: center;
  font-size: 28rpx;
  color: @color-primary;
  font-weight: 500;
}

.submit-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16rpx 32rpx calc(16rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 2rpx solid #eee;
  z-index: 100;
}

.submit-btn {
  width: 100%;
  border-radius: 48rpx;
}
</style>
