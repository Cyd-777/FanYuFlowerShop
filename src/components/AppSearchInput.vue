<template>
  <view
    class="app-search-input-wrap"
    :class="{
      'is-sticky': sticky && !modalOpen,
      'is-modal-open': modalOpen,
    }"
    :style="stickyWrapStyle"
  >
    <!-- 页内：外观同搜索框，实为打开模态的按钮（不可输入） -->
    <view
      class="search-trigger"
      :style="triggerStyle"
      hover-class="search-trigger--active"
      aria-role="button"
      @tap="openModal"
    >
      <text class="search-icon">⌕</text>
      <text class="search-trigger-text is-placeholder">{{ placeholder }}</text>
    </view>

    <!-- 全屏模态：page-container 拦截物理返回 / 侧滑返回，先关模态不退出小程序 -->
    <page-container
      v-if="modalOpen"
      :show="true"
      :overlay="false"
      :round="false"
      :duration="0"
      position="bottom"
      custom-style="height:100vh;background:#fff;"
      :custom-style="pageContainerStyle"
      @beforeleave="onPageContainerBeforeLeave"
    >
      <view
        class="search-modal"
        catchtouchmove
        @touchmove.stop.prevent
      >
      <view class="search-modal__inner">
        <!-- 占位区：高度 = 自定义 Head（无 AppNavBar，仅用 navBarLayout 数据） -->
        <view class="search-modal__head" :style="modalHeadStyle">
          <view class="search-modal__status" :style="{ height: `${navLayout.statusBarHeight}px` }" />
          <view class="search-modal__nav" :style="modalNavStyle">
            <AppNavBackButton
              :width-px="modalBackWidthPx"
              :height-px="navLayout.capsuleHeight"
              @tap="closeModal"
            />
            <view class="search-modal__title-wrap" :style="modalTitleWrapStyle">
              <text class="search-modal__title">{{ resolvedModalTitle }}</text>
            </view>
          </view>
        </view>

        <view class="search-modal__search-bar">
          <view class="search-modal__input-row">
            <text class="search-icon">⌕</text>
            <input
              class="search-input"
              :value="inputValue"
              :focus="modalOpen && inputFocused"
              :hold-keyboard="modalOpen && inputFocused"
              adjust-position
              :placeholder="placeholder"
              confirm-type="search"
              @input="onInput"
              @confirm="onConfirm"
              @blur="onModalInputBlur"
            />
            <text
              v-if="inputValue.trim()"
              class="search-action"
              @tap.stop="onConfirm"
            >
              {{ searchActionText }}
            </text>
          </view>
        </view>

        <scroll-view class="search-modal__body" :scroll-y="true" :enhanced="true" :show-scrollbar="false">
          <view v-if="showHistoryPanel" class="history-panel">
            <view class="history-header">
              <text class="history-title">{{ historyTitleText }}</text>
              <text class="history-clear" @tap.stop="onClearHistory">{{ historyClearText }}</text>
            </view>
            <view class="history-tags">
              <view
                v-for="keyword in historyList"
                :key="`history:${keyword}`"
                class="history-tag"
                hover-class="history-tag--active"
                @tap.stop="onPickHistory(keyword)"
              >
                <text class="history-tag__text">{{ keyword }}</text>
              </view>
            </view>
          </view>
          <view v-else-if="suggestions.length" class="suggest-panel">
            <view class="suggest-title">{{ suggestTitle }}</view>
            <view
              v-for="item in suggestions"
              :key="item.id"
              class="suggest-item suggest-item--dual"
              @tap.stop="onItemTap(item)"
            >
              <view class="suggest-main">
                <text class="suggest-name">{{ item.label }}</text>
                <text v-if="item.meta" class="suggest-meta">{{ item.meta }}</text>
              </view>
              <view v-if="suggestChannels(item).length" class="suggest-tags">
                <view
                  v-if="suggestChannels(item).includes('wiki')"
                  class="suggest-tag suggest-tag--wiki"
                  hover-class="suggest-tag--active"
                  @tap.stop="onPickChannel(item, 'wiki')"
                >
                  {{ wikiChannelText }}
                </view>
                <view
                  v-if="suggestChannels(item).includes('goods')"
                  class="suggest-tag suggest-tag--goods"
                  hover-class="suggest-tag--active"
                  @tap.stop="onPickChannel(item, 'goods')"
                >
                  {{ goodsChannelText }}
                </view>
              </view>
            </view>
          </view>
          <view v-else-if="inputValue.trim()" class="suggest-empty">{{ suggestEmptyText }}</view>
        </scroll-view>
      </view>
      </view>
    </page-container>
  </view>
</template>

<script setup lang="ts">
import Taro from '@tarojs/taro'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppNavBackButton from '@/components/AppNavBackButton.vue'
import type { CustomerUnifiedSearchScope, SearchSuggestion } from '@/types/search'
import { getNavBarLayout, type NavBarLayout } from '@/utils/navBarLayout'
import { getCurrentPageRoute, resolvePageNav } from '@/config/pageNav'
import { searchModalHostOpen } from '@/utils/searchModalHost'
import { hideTabBarForSearch, showTabBarAfterSearch } from '@/utils/searchFullscreen'
import {
  clearSearchHistory,
  pushSearchHistory,
  readSearchHistory,
  type SearchHistoryProfile,
} from '@/utils/searchHistory'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    suggestTitle?: string
    suggest: (query: string) => SearchSuggestion[]
    sticky?: boolean
    stickyTop?: string
    stickyBackground?: string
    stickyBleed?: string
    /** 页内触发条额外样式（如吸顶时 max-width 避让胶囊） */
    triggerStyle?: Record<string, string>
    /** 设置后启用本地搜索历史（按 profile 分区） */
    historyProfile?: SearchHistoryProfile
    /** 历史项展示「百科」「商品」标签（顾客端联合搜索） */
    historyDualChannel?: boolean
    /** 模态 Head 标题；默认取当前页 AppNavBar 标题，无则「搜索」 */
    modalTitle?: string
  }>(),
  {
    placeholder: '搜索…',
    suggestTitle: '输入预判',
    sticky: true,
    stickyTop: '0',
    stickyBackground: '@color-bg-page',
    stickyBleed: '24rpx',
    historyDualChannel: false,
    triggerStyle: () => ({}),
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  search: [value: string]
  select: [item: SearchSuggestion]
  'select-channel': [payload: { label: string; channel: Exclude<CustomerUnifiedSearchScope, 'all'> }]
  'focus-change': [focused: boolean]
}>()

const searchActionText = '搜索'
const historyTitleText = '搜索历史'
const historyClearText = '清空'
const wikiChannelText = '百科'
const goodsChannelText = '商品'
const suggestEmptyText = '暂无匹配，可点「搜索」查看结果'

const inputValue = ref(props.modelValue)
const modalOpen = ref(false)
const keyboardHeight = ref(0)
const inputFocused = ref(false)

/** 键盘高度变化时跟踪，延迟确认最终高度避免动画中途闪烁 */
let keyboardListener: (() => void) | null = null
let kbStableTimer: ReturnType<typeof setTimeout> | null = null
let lastKbHeight = 0

onMounted(() => {
  try {
    const off = wx.onKeyboardHeightChange((res) => {
      const h = res.height || 0
      // 键盘收起（高度归零）或高度变化过程中，延迟更新等待稳定
      if (kbStableTimer) clearTimeout(kbStableTimer)
      if (h === 0) {
        // 键盘收起：立即归零
        keyboardHeight.value = 0
      } else {
        lastKbHeight = h
        // 延迟 150ms 等键盘动画稳定后再收缩容器
        kbStableTimer = setTimeout(() => {
          keyboardHeight.value = lastKbHeight
        }, 150)
      }
    })
    keyboardListener = off as unknown as (() => void)
  } catch {
    // 低版本基础库不支持
  }
})

onBeforeUnmount(() => {
  keyboardListener?.()
  if (kbStableTimer) clearTimeout(kbStableTimer)
})

const pageContainerStyle = computed(() => {
  const kb = keyboardHeight.value
  const height = kb ? `calc(100vh - ${kb}px)` : '100vh'
  return `height:${height};background:#fff;`
})

const historyList = ref<string[]>([])
let tabBarHidden = false
let focusToken = 0
let closingModal = false

const navLayout = ref<NavBarLayout>(getNavBarLayout())

const suggestions = computed(() => props.suggest(inputValue.value.trim()))
const showHistoryPanel = computed(
  () =>
    !!props.historyProfile &&
    !inputValue.value.trim() &&
    historyList.value.length > 0,
)

const modalHeadStyle = computed(() => ({
  height: `${navLayout.value.totalHeight}px`,
}))

const modalNavStyle = computed(() => ({
  height: `${navLayout.value.navContentHeight}px`,
  paddingTop: `${navLayout.value.capsuleTopGap}px`,
  paddingRight: `${navLayout.value.titleAreaPaddingRight}px`,
}))

const modalBackWidthPx = computed(() =>
  Math.max(navLayout.value.capsuleHeight + 16, 44),
)

const resolvedModalTitle = computed(() => {
  const explicit = String(props.modalTitle || '').trim()
  if (explicit) return explicit
  const route = getCurrentPageRoute()
  const navTitle = resolvePageNav(route).title?.trim()
  return navTitle || '搜索'
})

const modalTitleWrapStyle = computed(() => {
  const symmetricInset = Math.max(
    modalBackWidthPx.value,
    navLayout.value.titleAreaPaddingRight,
  )
  return {
    top: `${navLayout.value.capsuleTopGap}px`,
    height: `${navLayout.value.capsuleHeight}px`,
    paddingLeft: `${symmetricInset}px`,
    paddingRight: `${symmetricInset}px`,
  }
})

const stickyWrapStyle = computed(() => {
  if (!props.sticky || modalOpen.value) return {}
  const style: Record<string, string> = {
    top: props.stickyTop,
    '--search-sticky-top': props.stickyTop,
    '--search-sticky-bg': props.stickyBackground,
  }
  if (props.stickyBleed) {
    style.marginLeft = `-${props.stickyBleed}`
    style.marginRight = `-${props.stickyBleed}`
    style.paddingLeft = props.stickyBleed
    style.paddingRight = props.stickyBleed
  }
  return style
})

watch(
  () => props.modelValue,
  (value) => {
    if (value !== inputValue.value) {
      inputValue.value = value
    }
  },
)

onBeforeUnmount(() => {
  if (modalOpen.value) {
    defocusModalInput()
    searchModalHostOpen.value = false
  }
  if (tabBarHidden) {
    showTabBarAfterSearch()
    tabBarHidden = false
  }
})

function setModalOpen(value: boolean) {
  modalOpen.value = value
  searchModalHostOpen.value = value
  emit('focus-change', value)
  if (value) {
    tabBarHidden = hideTabBarForSearch()
  } else if (tabBarHidden) {
    showTabBarAfterSearch()
    tabBarHidden = false
  }
  if (!value) {
    inputFocused.value = false
  }
}

function refreshHistory() {
  if (!props.historyProfile) {
    historyList.value = []
    return
  }
  historyList.value = readSearchHistory(props.historyProfile)
}

function rememberSearch(keyword: string) {
  if (!props.historyProfile) return
  const text = keyword.trim()
  if (!text) return
  historyList.value = pushSearchHistory(props.historyProfile, text)
}

function onClearHistory() {
  if (!props.historyProfile) return
  clearSearchHistory(props.historyProfile)
  historyList.value = []
}

function defocusModalInput() {
  focusToken += 1
  inputFocused.value = false
  void Taro.hideKeyboard().catch(() => {})
}

async function focusModalInput() {
  const token = ++focusToken
  inputFocused.value = false
  await nextTick()
  if (token !== focusToken || !modalOpen.value || closingModal) return
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 120)
  })
  if (token !== focusToken || !modalOpen.value || closingModal) return
  inputFocused.value = true
}

async function openModal() {
  navLayout.value = getNavBarLayout(true)
  refreshHistory()
  setModalOpen(true)
  await focusModalInput()
}

async function closeModal() {
  if (!modalOpen.value || closingModal) return
  closingModal = true
  defocusModalInput()
  await nextTick()
  resetInput()
  setModalOpen(false)
  closingModal = false
}

/** 物理返回 / 侧滑返回：先失焦收键盘，再关模态 */
function onPageContainerBeforeLeave() {
  void closeModal()
}

function onModalInputBlur() {
  if (!modalOpen.value) {
    inputFocused.value = false
  }
}

function onInput(event: { detail: { value: string } }) {
  const value = event.detail.value || ''
  inputValue.value = value
  emit('update:modelValue', value)
}

function resetInput() {
  inputValue.value = ''
  emit('update:modelValue', '')
}

function onConfirm() {
  const query = inputValue.value.trim()
  if (!query) return
  rememberSearch(query)
  emit('search', query)
  resetInput()
  closeModal()
}

function historySuggestion(keyword: string): SearchSuggestion {
  return {
    id: `history:${keyword}`,
    label: keyword,
  }
}

function onPickHistory(keyword: string) {
  const item = historySuggestion(keyword)
  rememberSearch(item.label)
  emit('select', item)
  emit('search', item.label)
  resetInput()
  closeModal()
}

function onItemTap(item: SearchSuggestion) {
  const channels = suggestChannels(item)
  if (channels.length === 1) {
    onPickChannel(item, channels[0])
    return
  }
  if (channels.length >= 2) return
  onPick(item)
}

function suggestChannels(item: SearchSuggestion): Exclude<CustomerUnifiedSearchScope, 'all'>[] {
  if (item.channels?.length) return item.channels
  return []
}

function onPickChannel(item: SearchSuggestion, channel: Exclude<CustomerUnifiedSearchScope, 'all'>) {
  rememberSearch(item.label)
  emit('select-channel', { label: item.label, channel })
  resetInput()
  closeModal()
}

function onPick(item: SearchSuggestion) {
  rememberSearch(item.label)
  emit('select', item)
  emit('search', item.label)
  resetInput()
  closeModal()
}
</script>

<script lang="ts">
export default {
  options: {
    virtualHost: true,
    styleIsolation: 'apply-shared',
  },
}
</script>

<style lang="less">
.app-search-input-wrap.is-modal-open {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 200;
  margin: 0 !important;
  padding: 0 !important;
  background: #fff;
}

.app-search-input-wrap.is-sticky {
  position: -webkit-sticky;
  position: sticky;
  top: var(--search-sticky-top, 0);
  z-index: 120;
  padding-top: 12rpx;
  padding-bottom: 12rpx;
  background: var(--search-sticky-bg, @color-bg-page);
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);
}

.search-trigger {
  display: flex;
  align-items: center;
  height: 72rpx;
  padding: 0 20rpx;
  background: @color-bg-muted;
  border: 1rpx solid @color-border-dashed;
  border-radius: 36rpx;
  box-sizing: border-box;
}

.search-trigger--active {
  opacity: 0.88;
}

.search-icon {
  flex-shrink: 0;
  margin-right: 12rpx;
  font-size: 32rpx;
  color: #999;
  line-height: 1;
}

.search-trigger-text {
  flex: 1;
  min-width: 0;
  font-size: 28rpx;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &.is-placeholder {
    color: #999;
  }
}

.search-modal {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 200;
  background: #fff;
}

.search-modal__inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
}

.search-modal__head {
  flex-shrink: 0;
  box-sizing: border-box;
}

.search-modal__status {
  width: 100%;
}

.search-modal__nav {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  box-sizing: border-box;
  width: 100%;
}

.search-modal__title-wrap {
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  overflow: hidden;
  pointer-events: none;
}

.search-modal__title {
  max-width: 100%;
  font-size: 24rpx;
  font-weight: 600;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}

.search-modal__search-bar {
  flex-shrink: 0;
  padding: 12rpx 24rpx 16rpx;
  border-bottom: 1rpx solid @color-bg-placeholder;
  box-sizing: border-box;
}

.search-modal__input-row {
  display: flex;
  align-items: center;
  height: 72rpx;
  padding: 0 20rpx;
  background: @color-bg-muted;
  border: 1rpx solid @color-border-dashed;
  border-radius: 36rpx;
  box-sizing: border-box;
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 72rpx;
  font-size: 28rpx;
  color: #333;
}

.search-action {
  flex-shrink: 0;
  margin-left: 8rpx;
  padding: 0 8rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: @color-primary;
  line-height: 72rpx;
}

.search-modal__body {
  flex: 1;
  min-height: 0;
  background: #fff;
}

.suggest-panel {
  padding-bottom: 32rpx;
}

.history-panel {
  padding-bottom: 32rpx;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 32rpx 8rpx;
}

.history-title {
  font-size: 22rpx;
  color: #999;
}

.history-clear {
  font-size: 22rpx;
  color: #999;
  padding: 8rpx 0 8rpx 16rpx;
}

.history-tags {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  padding: 4rpx 32rpx 8rpx;
  box-sizing: border-box;
}

.history-tag {
  margin: 0 16rpx 16rpx 0;
  padding: 12rpx 24rpx;
  max-width: 100%;
  background: @color-bg-muted;
  border-radius: 999rpx;
  box-sizing: border-box;
}

.history-tag--active {
  opacity: 0.7;
}

.history-tag__text {
  font-size: 26rpx;
  line-height: 1.35;
  color: #333;
  word-break: break-all;
}

.suggest-title {
  padding: 20rpx 32rpx 8rpx;
  font-size: 22rpx;
  color: #999;
}

.suggest-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid @color-bg-muted;
}

.suggest-item--active {
  background: rgba(102, 126, 234, 0.06);
}

.suggest-item--dual {
  cursor: default;
}

.suggest-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.suggest-name {
  font-size: 28rpx;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.suggest-meta {
  font-size: 22rpx;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.suggest-tags {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.suggest-tag {
  padding: 8rpx 20rpx;
  font-size: 22rpx;
  line-height: 1.2;
  border-radius: 999rpx;
  box-sizing: border-box;
}

.suggest-tag--wiki {
  color: @color-tag-indigo;
  background: rgba(92, 107, 192, 0.1);
  border: 1rpx solid rgba(92, 107, 192, 0.25);
}

.suggest-tag--goods {
  color: @color-primary;
  background: rgba(229, 57, 53, 0.08);
  border: 1rpx solid rgba(229, 57, 53, 0.22);
}

.suggest-tag--active {
  opacity: 0.65;
}

.suggest-empty {
  padding: 48rpx 32rpx;
  text-align: center;
  font-size: 26rpx;
  color: #999;
}
</style>
