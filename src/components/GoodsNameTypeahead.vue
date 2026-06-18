<template>
  <view class="goods-name-typeahead-wrap">
    <view
      v-if="focused"
      class="typeahead-mask"
      catchtouchmove
      @tap="dismiss"
    />

    <view class="goods-name-typeahead" :class="{ 'is-focused': focused }">
      <view class="search-box">
        <text class="search-icon">⌕</text>
        <input
          class="search-input"
          :value="inputValue"
          :focus="inputFocused"
          :placeholder="placeholder"
          confirm-type="search"
          @input="onInput"
          @confirm="onConfirm"
          @focus="onFocus"
          @blur="onBlur"
        />
        <text v-if="inputValue" class="clear-btn" @tap.stop="onClear">×</text>
      </view>

      <view
        v-if="panelVisible && suggestions.length"
        class="suggest-panel"
        @touchstart.stop
        @touchmove.stop
      >
        <view class="suggest-title">输入预判</view>
        <view
          v-for="item in suggestions"
          :key="item.id"
          class="suggest-item"
          hover-class="suggest-item--active"
          @tap.stop="onPick(item)"
        >
          <text class="suggest-name">{{ item.name }}</text>
          <text class="suggest-meta">{{ item.categoryName }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Goods } from '@/types/goods'
import {
  suggestGoodsNames,
  type GoodsNameSuggestion,
} from '@/utils/goodsNameSuggest'

const props = withDefaults(
  defineProps<{
    modelValue: string
    catalog: Goods[]
    placeholder?: string
  }>(),
  {
    placeholder: '搜索商品名称...',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  search: [value: string]
  select: [item: GoodsNameSuggestion]
  'focus-change': [focused: boolean]
}>()

const inputValue = ref(props.modelValue)
const focused = ref(false)
const inputFocused = ref(false)
const panelVisible = ref(false)
const debouncedQuery = ref('')
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let blurTimer: ReturnType<typeof setTimeout> | null = null

const suggestions = computed(() =>
  suggestGoodsNames(props.catalog, debouncedQuery.value),
)

watch(
  () => props.modelValue,
  (value) => {
    if (value !== inputValue.value) {
      inputValue.value = value
    }
  },
)

function setFocused(value: boolean) {
  focused.value = value
  emit('focus-change', value)
}

function dismiss() {
  if (blurTimer) {
    clearTimeout(blurTimer)
    blurTimer = null
  }
  inputFocused.value = false
  panelVisible.value = false
  setFocused(false)
}

function scheduleDebouncedQuery(value: string) {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedQuery.value = value.trim()
    emit('search', debouncedQuery.value)
  }, 220)
}

function onInput(event: { detail: { value: string } }) {
  const value = event.detail.value || ''
  inputValue.value = value
  emit('update:modelValue', value)
  panelVisible.value = !!value.trim()
  scheduleDebouncedQuery(value)
}

function onConfirm() {
  dismiss()
  emit('search', inputValue.value.trim())
}

function onFocus() {
  if (blurTimer) {
    clearTimeout(blurTimer)
    blurTimer = null
  }
  inputFocused.value = true
  setFocused(true)
  panelVisible.value = !!inputValue.value.trim()
  debouncedQuery.value = inputValue.value.trim()
}

function onBlur() {
  blurTimer = setTimeout(() => {
    dismiss()
  }, 180)
}

function onPick(item: GoodsNameSuggestion) {
  inputValue.value = item.name
  emit('update:modelValue', item.name)
  emit('select', item)
  emit('search', item.name)
  dismiss()
}

function onClear() {
  inputValue.value = ''
  debouncedQuery.value = ''
  emit('update:modelValue', '')
  emit('search', '')
  panelVisible.value = false
}
</script>

<style lang="less">
.typeahead-mask {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.45);
}
.goods-name-typeahead {
  position: relative;
  z-index: 201;
  &.is-focused .search-box {
    background: #fff;
    box-shadow: 0 4rpx 24rpx rgba(102, 126, 234, 0.12);
  }
}
.search-box {
  display: flex;
  align-items: center;
  height: 72rpx;
  padding: 0 20rpx;
  background: #f5f5f5;
  border-radius: 36rpx;
  transition: background 0.2s, box-shadow 0.2s;
}
.search-icon {
  flex-shrink: 0;
  margin-right: 12rpx;
  font-size: 32rpx;
  color: #999;
  line-height: 1;
}
.search-input {
  flex: 1;
  min-width: 0;
  height: 72rpx;
  font-size: 28rpx;
  color: #333;
}
.clear-btn {
  flex-shrink: 0;
  width: 40rpx;
  height: 40rpx;
  line-height: 36rpx;
  text-align: center;
  font-size: 36rpx;
  color: #bbb;
}
.suggest-panel {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 8rpx);
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.12);
  overflow: hidden;
  z-index: 202;
}
.suggest-title {
  padding: 16rpx 24rpx 8rpx;
  font-size: 22rpx;
  color: #999;
}
.suggest-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 20rpx 24rpx;
  border-top: 1rpx solid #f5f5f5;
}
.suggest-item--active {
  background: rgba(102, 126, 234, 0.06);
}
.suggest-name {
  flex: 1;
  min-width: 0;
  font-size: 28rpx;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.suggest-meta {
  flex-shrink: 0;
  font-size: 22rpx;
  color: #999;
}
</style>
