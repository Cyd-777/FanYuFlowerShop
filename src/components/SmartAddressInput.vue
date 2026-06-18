<template>
  <view class="smart-address-input">
    <view class="smart-card">
      <view class="smart-head">
        <text class="smart-title">智能填写</text>
        <text class="smart-hint">粘贴姓名、电话、地址，一键识别</text>
      </view>
      <textarea
        class="smart-textarea"
        :value="smartText"
        placeholder="示例：张三 13800138000 广东省深圳市南山区科技园南路XX号"
        placeholder-class="smart-placeholder"
        maxlength="300"
        @input="onSmartTextInput"
      />
      <view class="smart-actions">
        <view class="smart-btn" @tap="pasteAndParse">粘贴并识别</view>
        <view class="smart-btn primary" @tap="parseCurrent">识别填写</view>
      </view>
    </view>

    <view class="detail-card">
      <view class="detail-label">详细地址</view>
      <textarea
        class="detail-textarea"
        :value="detail"
        placeholder="输入小区、楼栋、门牌号，将联想附近地点"
        placeholder-class="smart-placeholder"
        maxlength="200"
        @input="onDetailInput"
        @focus="detailFocused = true"
        @blur="onDetailBlur"
      />
      <view v-if="showSuggestions" class="suggest-panel">
        <view v-if="suggestLoading" class="suggest-empty">正在联想地址…</view>
        <view v-else-if="!suggestions.length" class="suggest-empty">暂无匹配地点</view>
        <view
          v-for="item in suggestions"
          :key="item.id"
          class="suggest-item"
          @tap="selectSuggestion(item)"
        >
          <view class="suggest-title">{{ item.title }}</view>
          <view class="suggest-address">{{ item.address }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { parseAddressText } from '@/utils/addressParse'
import { parseRegionFromAddress } from '@/utils/location'
import { suggestAddress, type AddressSuggestion } from '@/services/map'
import type { UserAddressForm } from '@/types/address'

const props = defineProps<{
  detail: string
  province: string
  city: string
  district: string
}>()

const emit = defineEmits<{
  'update:detail': [value: string]
  apply: [payload: Partial<UserAddressForm>]
}>()

const smartText = ref('')
const suggestions = ref<AddressSuggestion[]>([])
const suggestLoading = ref(false)
const detailFocused = ref(false)
const suppressSuggest = ref(false)
let suggestTimer: ReturnType<typeof setTimeout> | null = null
let blurTimer: ReturnType<typeof setTimeout> | null = null

const regionKeyword = computed(() => {
  const parts = [props.province, props.city, props.district].filter(Boolean)
  if (!parts.length) return '全国'
  if (props.province && props.province === props.city) {
    return [props.province, props.district].filter(Boolean).join('')
  }
  return parts.join('')
})

const showSuggestions = computed(
  () => detailFocused.value && props.detail.trim().length >= 2,
)

watch(
  () => props.detail,
  (value) => {
    if (suppressSuggest.value) return
    scheduleSuggest(value)
  },
)

function onSmartTextInput(event: { detail: { value: string } }) {
  smartText.value = event.detail.value
}

function onDetailInput(event: { detail: { value: string } }) {
  emit('update:detail', event.detail.value)
}

function onDetailBlur() {
  blurTimer = setTimeout(() => {
    detailFocused.value = false
  }, 200)
}

function scheduleSuggest(keyword: string) {
  if (suggestTimer) clearTimeout(suggestTimer)

  const text = keyword.trim()
  if (text.length < 2) {
    suggestions.value = []
    suggestLoading.value = false
    return
  }

  suggestTimer = setTimeout(() => {
    void fetchSuggestions(text)
  }, 320)
}

async function fetchSuggestions(keyword: string) {
  suggestLoading.value = true
  try {
    const { list } = await suggestAddress(keyword, regionKeyword.value)
    if (keyword !== props.detail.trim()) return
    suggestions.value = list
  } catch (err) {
    suggestions.value = []
    console.warn('[address] suggest failed:', err)
  } finally {
    suggestLoading.value = false
  }
}

function applyParsed(raw: string) {
  const parsed = parseAddressText(raw)
  if (!parsed.name && !parsed.phone && !parsed.detail && !parsed.province) {
    wx.showToast({ title: '未识别到有效地址', icon: 'none' })
    return
  }

  emit('apply', {
    name: parsed.name,
    phone: parsed.phone,
    province: parsed.province,
    city: parsed.city,
    district: parsed.district,
    detail: parsed.detail,
    latitude: undefined,
    longitude: undefined,
    poiName: undefined,
  })

  if (parsed.detail) {
    suppressSuggest.value = true
    emit('update:detail', parsed.detail)
    setTimeout(() => {
      suppressSuggest.value = false
    }, 0)
  }

  wx.showToast({ title: '识别完成', icon: 'success' })
}

function parseCurrent() {
  applyParsed(smartText.value)
}

async function pasteAndParse() {
  try {
    const res = await wx.getClipboardData()
    smartText.value = res.data
    applyParsed(res.data)
  } catch (err) {
    wx.showToast({
      title: err instanceof Error ? err.message : '读取剪贴板失败',
      icon: 'none',
    })
  }
}

function selectSuggestion(item: AddressSuggestion) {
  if (blurTimer) clearTimeout(blurTimer)

  const parsed = parseRegionFromAddress(item.address)
  const detailParts = [item.title, parsed?.remainder].filter(Boolean)

  emit('apply', {
    province: item.province || parsed?.province || props.province,
    city: item.city || parsed?.city || props.city,
    district: item.district || parsed?.district || props.district,
    detail: detailParts.join(' ') || item.address,
    latitude: item.latitude,
    longitude: item.longitude,
    poiName: item.title,
  })

  suppressSuggest.value = true
  emit('update:detail', detailParts.join(' ') || item.address)
  suggestions.value = []
  detailFocused.value = false

  setTimeout(() => {
    suppressSuggest.value = false
  }, 0)
}
</script>

<style lang="less">
@import '@/styles/tokens.less';

.smart-address-input {
  padding-top: 16rpx;
}
.smart-card,
.detail-card {
  margin: 0 16rpx 16rpx;
  padding: 24rpx;
  background: @color-bg-card;
  border-radius: @radius-md;
}
.smart-head {
  margin-bottom: 16rpx;
}
.smart-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: @color-text-primary;
}
.smart-hint {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: @color-text-tertiary;
}
.smart-textarea,
.detail-textarea {
  width: 100%;
  min-height: 140rpx;
  padding: 20rpx;
  box-sizing: border-box;
  font-size: 26rpx;
  line-height: 1.6;
  color: @color-text-primary;
  background: @color-bg-input;
  border-radius: @radius-sm;
}
.detail-textarea {
  min-height: 120rpx;
}
.smart-placeholder {
  color: @color-text-placeholder;
  font-size: 24rpx;
}
.smart-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
}
.smart-btn {
  flex: 1;
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  font-size: 26rpx;
  color: @color-text-secondary;
  background: @color-bg-muted;
  border-radius: @radius-pill;
  &.primary {
    color: #fff;
    background: @color-primary;
  }
}
.detail-label {
  margin-bottom: 12rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: @color-text-primary;
}
.suggest-panel {
  margin-top: 12rpx;
  border: 2rpx solid @color-border;
  border-radius: @radius-sm;
  overflow: hidden;
}
.suggest-empty {
  padding: 24rpx;
  text-align: center;
  font-size: 24rpx;
  color: @color-text-tertiary;
}
.suggest-item {
  padding: 20rpx 24rpx;
  border-bottom: 2rpx solid @color-border;
  &:last-child {
    border-bottom: none;
  }
}
.suggest-title {
  font-size: 26rpx;
  color: @color-text-primary;
}
.suggest-address {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: @color-text-tertiary;
  line-height: 1.5;
}
</style>
