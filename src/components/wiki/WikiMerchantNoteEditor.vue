<template>
  <view class="wiki-merchant-note">
    <view class="wiki-merchant-note__toolbar">
      <text class="wiki-merchant-note__hint">{{ toolbarHint }}</text>
      <text class="wiki-merchant-note__switch" @tap="emit('switch-form')">{{ switchFormText }}</text>
    </view>

    <view class="wiki-merchant-note__stage">
      <view
        id="wiki-detail-hero"
        class="wiki-detail-hero-layer"
        @touchstart="onChromeTouchStart"
        @touchmove.stop.prevent="onChromeTouchMove"
        @touchend="onPanelTouchEnd"
        @touchcancel="onPanelTouchEnd"
      >
        <WikiDetailHero :wiki="previewWiki" />
      </view>

      <view
        id="wiki-floating-panel"
        class="wiki-floating-panel"
        :class="{
          'wiki-floating-panel--expanded': panelExpanded,
          'wiki-floating-panel--dragging': panelDragActive,
        }"
        :style="panelStyle"
      >
        <view
          class="wiki-floating-panel__handle"
          @touchstart="onChromeTouchStart"
          @touchmove.stop.prevent="onChromeTouchMove"
          @touchend="onPanelTouchEnd"
          @touchcancel="onPanelTouchEnd"
        >
          <view class="wiki-floating-panel__grab" />
        </view>

        <view
          id="wiki-detail-nav"
          class="wiki-detail-nav"
          @touchstart="onChromeTouchStart"
          @touchmove.stop.prevent="onChromeTouchMove"
          @touchend="onPanelTouchEnd"
          @touchcancel="onPanelTouchEnd"
        >
          <view
            v-for="tab in sectionTabs"
            :key="tab.key"
            class="wiki-detail-tab"
            :class="{ active: activeTab === tab.key }"
            @tap="clickSectionTab(tab.key)"
          >
            <text class="wiki-detail-tab-label">{{ tab.label }}</text>
          </view>
        </view>

        <scroll-view
          id="wiki-panel-scroll"
          class="wiki-floating-panel__body"
          :scroll-y="innerScrollEnabled"
          :scroll-into-view="scrollIntoView"
          scroll-with-animation
          :enhanced="true"
          :bounces="false"
          :show-scrollbar="false"
          :upper-threshold="0"
          :catch-move="panelCatchMove"
          @scroll="onContentScroll"
          @scrolltoupper="onPanelScrollToUpper"
          @touchstart="onBodyTouchStart"
          @touchmove="onBodyTouchMove"
          @touchend="onPanelTouchEnd"
          @touchcancel="onPanelTouchEnd"
        >
          <view id="wiki-panel-scroll-body">
            <view class="wiki-detail-stack">
              <view id="wiki-section-atlas" class="wiki-detail-section-header">{{ introTitle }}</view>
              <WikiAtlasSection
                :wiki="previewWiki"
                :highlight-anchor="highlightAnchor"
                editable
                @edit="onEditTarget"
              />

              <view id="wiki-section-care" class="wiki-detail-section-header">{{ careTitle }}</view>
              <WikiCareSection
                v-if="hasCare"
                :wiki="previewWiki"
                :highlight-anchor="highlightAnchor"
                editable
                @edit="onEditTarget"
              />
              <text v-else class="wiki-detail-section-empty wiki-note-editable" @tap="onEditTarget('picker:careBase')">
                {{ emptyCareText }}
              </text>

              <view id="wiki-section-language" class="wiki-detail-section-header">{{ languageTitle }}</view>
              <view class="wiki-detail-section wiki-detail-section--last">
                <WikiLanguageSection
                  :wiki="previewWiki"
                  :highlight-anchor="highlightAnchor"
                  editable
                  @edit="onEditTarget"
                />
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <WikiNoteEditSheet
      v-model:visible="sheetVisible"
      :title="sheetTitle"
      :value="sheetValue"
      :placeholder="sheetPlaceholder"
      :multiline="sheetMultiline"
      @confirm="onSheetConfirm"
      @cancel="sheetVisible = false"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useReady } from '@tarojs/taro'
import WikiAtlasSection from '@/components/wiki/WikiAtlasSection.vue'
import WikiCareSection from '@/components/wiki/WikiCareSection.vue'
import WikiDetailHero from '@/components/wiki/WikiDetailHero.vue'
import WikiLanguageSection from '@/components/wiki/WikiLanguageSection.vue'
import WikiNoteEditSheet from '@/components/wiki/WikiNoteEditSheet.vue'
import { useNavBarLayout } from '@/composables/useNavBarLayout'
import { useWikiDetailScrollLink, WIKI_DETAIL_SECTIONS } from '@/composables/useWikiDetailScrollLink'
import { useWikiFloatingPanel } from '@/composables/useWikiFloatingPanel'
import { hasWikiCareVaseContent, hasWikiCareSoilContent } from '@/types/wiki'
import { formToPreviewWiki } from '@/utils/wikiMerchantPreview'
import type { WikiArticleEditForm } from '@/utils/wikiMerchantForm'
import {
  isWikiNotePickerTarget,
  WIKI_NOTE_TEXT_FIELDS,
  wikiNotePickerKey,
  type WikiNoteEditTarget,
} from '@/utils/wikiNoteEdit'

const props = defineProps<{
  form: WikiArticleEditForm
}>()

const emit = defineEmits<{
  'switch-form': []
  picker: [key: string]
}>()

const toolbarHint = '点击正文或标签即可编辑'
const switchFormText = '表单模式'
const introTitle = '介绍'
const careTitle = '养护方式'
const languageTitle = '花语'
const emptyCareText = '点击选择养护底稿并填写养护说明'
const sectionTabs = WIKI_DETAIL_SECTIONS

const { layout } = useNavBarLayout()

const previewWiki = computed(() => formToPreviewWiki(props.form))

const hasCare = computed(
  () =>
    hasWikiCareVaseContent(previewWiki.value) || hasWikiCareSoilContent(previewWiki.value),
)

const floatingPanel = useWikiFloatingPanel({
  heroSelector: '#wiki-detail-hero',
  innerScrollSelector: '#wiki-panel-scroll',
  contentWatchKey: () => previewWiki.value._id + props.form.kindName + props.form.varietyName,
  isContentReady: () => !!props.form.kindName.trim(),
  navTotalHeight: () => layout.value.totalHeight,
  collapsedPeekRatio: 0.55,
})

const scrollLink = useWikiDetailScrollLink({
  scrollSelector: '#wiki-panel-scroll',
  bodySelector: '#wiki-panel-scroll-body',
  contentWatchKey: () => previewWiki.value._id + props.form.kindName,
  isContentReady: () => !!props.form.kindName.trim(),
  ensurePanelExpanded: floatingPanel.ensureExpanded,
  onInnerScroll: floatingPanel.onPanelBodyScroll,
})

const {
  activeTab,
  scrollIntoView,
  highlightAnchor,
  clickSectionTab,
  onContentScroll,
  remeasure: remeasureScroll,
} = scrollLink

const {
  panelExpanded,
  panelStyle,
  innerScrollEnabled,
  panelDragActive,
  panelCatchMove,
  onChromeTouchStart,
  onChromeTouchMove,
  onBodyTouchStart,
  onBodyTouchMove,
  onPanelScrollToUpper,
  onPanelTouchEnd,
  remeasure: remeasurePanel,
} = floatingPanel

const sheetVisible = ref(false)
const sheetField = ref<keyof WikiArticleEditForm | ''>('')
const sheetValue = ref('')
const sheetTitle = ref('')
const sheetPlaceholder = ref('')
const sheetMultiline = ref(true)

watch(
  () => [
    props.form.kindName,
    props.form.varietyName,
    props.form.atlasIntroParagraphsText,
    props.form.languageParagraphsText,
    props.form.careSummary,
  ],
  () => {
    void nextTick(() => {
      remeasurePanel()
      remeasureScroll()
    })
  },
)

useReady(() => {
  void nextTick(() => {
    remeasurePanel()
    remeasureScroll()
  })
})

function onEditTarget(target: WikiNoteEditTarget) {
  if (isWikiNotePickerTarget(target)) {
    emit('picker', wikiNotePickerKey(target))
    return
  }
  const meta = WIKI_NOTE_TEXT_FIELDS[target]
  if (!meta) return
  sheetField.value = target
  sheetTitle.value = meta.label
  sheetPlaceholder.value = meta.placeholder
  sheetMultiline.value = meta.multiline
  sheetValue.value = String(props.form[target] || '')
  sheetVisible.value = true
}

function onSheetConfirm(value: string) {
  if (!sheetField.value) return
  ;(props.form as Record<string, unknown>)[sheetField.value] = value
  sheetField.value = ''
}
</script>

<style lang="less">
@import '@/styles/wiki-detail-panel.less';

.wiki-merchant-note {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.wiki-merchant-note__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 24rpx;
  background: #f5f3ff;
  border-bottom: 1rpx solid #e9e0ff;
}

.wiki-merchant-note__hint {
  font-size: 22rpx;
  color: #6d28d9;
}

.wiki-merchant-note__switch {
  font-size: 24rpx;
  color: #7c3aed;
  padding: 8rpx 12rpx;
}

.wiki-merchant-note__stage {
  position: relative;
  flex: 1;
  height: calc(100vh - 280rpx);
  min-height: 520rpx;
  overflow: hidden;
}
</style>
