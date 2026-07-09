<template>
  <view class="wiki-smart-paste">
    <view class="wiki-smart-paste__head" @tap="expanded = !expanded">
      <view class="wiki-smart-paste__title-wrap">
        <text class="wiki-smart-paste__title">智能识别</text>
        <text class="wiki-smart-paste__subtitle">粘贴百科 / 大模型输出，自动对照表单</text>
      </view>
      <text class="wiki-smart-paste__toggle">{{ expanded ? '收起' : '展开' }}</text>
    </view>

    <view v-if="expanded" class="wiki-smart-paste__body">
      <view class="wiki-smart-paste__prompt-bar">
        <text class="wiki-smart-paste__prompt-tip">无现成百科？复制提示词到大模型，再把输出贴回下方</text>
        <nut-button size="small" plain type="primary" @click="copyLlmPrompt">复制提示词</nut-button>
      </view>

      <textarea
        class="wiki-smart-paste__textarea"
        :value="pasteText"
        placeholder="从百度、百科等复制整段介绍 / 花语 / 养护文字，粘贴到这里…"
        :maxlength="12000"
        :cursor-spacing="120"
        @input="onPasteInput"
      />

      <view class="wiki-smart-paste__actions">
        <nut-button size="small" plain @click="clearPaste">清空</nut-button>
        <nut-button size="small" type="primary" :loading="recognizing" @click="runRecognize">
          识别并对照
        </nut-button>
      </view>

      <view v-if="summaryText" class="wiki-smart-paste__summary">{{ summaryText }}</view>

      <view v-if="matches.length" class="wiki-smart-paste__compare">
        <view class="wiki-smart-paste__compare-head">
          <text class="wiki-smart-paste__compare-title">字段对照</text>
          <view class="wiki-smart-paste__bulk">
            <text class="wiki-smart-paste__bulk-btn" @tap="selectAll(true)">全选</text>
            <text class="wiki-smart-paste__bulk-btn" @tap="selectAll(false)">全不选</text>
          </view>
        </view>

        <view
          v-for="(row, idx) in matches"
          :key="row.key"
          class="wiki-smart-paste__row"
          :class="{ 'wiki-smart-paste__row--selected': row.selected }"
          @tap="toggleRow(idx)"
        >
          <view class="wiki-smart-paste__check" :class="{ checked: row.selected }">
            <text v-if="row.selected" class="wiki-smart-paste__check-icon">✓</text>
          </view>
          <view class="wiki-smart-paste__row-body">
            <view class="wiki-smart-paste__row-top">
              <text class="wiki-smart-paste__label">{{ row.label }}</text>
              <text class="wiki-smart-paste__confidence" :class="`is-${row.confidence}`">
                {{ confidenceLabel(row.confidence) }}
              </text>
            </view>
            <view class="wiki-smart-paste__col">
              <text class="wiki-smart-paste__col-title">识别</text>
              <text class="wiki-smart-paste__col-text">{{ row.parsedDisplay || '—' }}</text>
            </view>
            <view class="wiki-smart-paste__col">
              <text class="wiki-smart-paste__col-title">当前</text>
              <text class="wiki-smart-paste__col-text wiki-smart-paste__col-text--muted">
                {{ row.currentDisplay || '（空）' }}
              </text>
            </view>
          </view>
        </view>

        <nut-button
          type="primary"
          block
          class="wiki-smart-paste__apply"
          :disabled="!selectedCount"
          @click="applySelected"
        >
          应用所选（{{ selectedCount }}）
        </nut-button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { showToast } from '@/utils/feedback'
import { computed, ref } from 'vue'
import type { WikiArticleEditForm } from '@/utils/wikiMerchantForm'
import {
  applyWikiSmartPasteMatches,
  compareWikiSmartPaste,
  parseWikiSmartPaste,
  summarizeWikiSmartPaste,
  type WikiSmartPasteMatch,
} from '@/utils/wikiSmartPaste'
import { buildWikiSmartPastePrompt } from '@/utils/wikiSmartPastePrompt'

const props = defineProps<{
  form: WikiArticleEditForm
}>()

const emit = defineEmits<{
  applied: [count: number]
}>()

const expanded = ref(true)
const pasteText = ref('')
const recognizing = ref(false)
const matches = ref<WikiSmartPasteMatch[]>([])

const selectedCount = computed(() => matches.value.filter((m) => m.selected).length)

const summaryText = computed(() => {
  if (!matches.value.length) return ''
  const { recognized, changed, selected } = summarizeWikiSmartPaste(matches.value)
  return `识别 ${recognized} 项 · 与当前不同 ${changed} 项 · 已勾选 ${selected} 项`
})

function confidenceLabel(level: WikiSmartPasteMatch['confidence']) {
  if (level === 'high') return '较准'
  if (level === 'low') return '待核'
  return '参考'
}

function onPasteInput(e: { detail: { value: string } }) {
  pasteText.value = e.detail.value
}

function clearPaste() {
  pasteText.value = ''
  matches.value = []
}

function copyLlmPrompt() {
  const kind = props.form.kindName.trim()
  if (!kind) {
    showToast({ title: '请先填写种类', icon: 'none' })
    return
  }
  const prompt = buildWikiSmartPastePrompt({
    kindName: kind,
    varietyName: props.form.varietyName.trim(),
    plantForm: props.form.plantForm,
  })
  wx.setClipboardData({
    data: prompt,
    success: () => showToast({ title: '提示词已复制', icon: 'success' }),
    fail: () => showToast({ title: '复制失败', icon: 'none' }),
  })
}

function runRecognize() {
  const text = pasteText.value.trim()
  if (!text) {
    showToast({ title: '请先粘贴内容', icon: 'none' })
    return
  }
  recognizing.value = true
  try {
    const parsed = parseWikiSmartPaste(text, props.form.kindName.trim())
    const rows = compareWikiSmartPaste(parsed, props.form)
    matches.value = rows
    if (!rows.length) {
      showToast({ title: '未识别到可对照字段', icon: 'none' })
    }
  } finally {
    recognizing.value = false
  }
}

function toggleRow(idx: number) {
  const row = matches.value[idx]
  if (!row) return
  row.selected = !row.selected
}

function selectAll(selected: boolean) {
  matches.value = matches.value.map((row) => ({ ...row, selected }))
}

function applySelected() {
  const count = applyWikiSmartPasteMatches(props.form, matches.value)
  if (!count) {
    showToast({ title: '请先勾选要应用的项', icon: 'none' })
    return
  }
  showToast({ title: `已应用 ${count} 项`, icon: 'success' })
  matches.value = compareWikiSmartPaste(parseWikiSmartPaste(pasteText.value, props.form.kindName.trim()), props.form)
  emit('applied', count)
}
</script>

<style lang="less">
.wiki-smart-paste {
  margin: 16rpx;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  border: 1rpx solid @color-wiki-purple-bg-alt;
}

.wiki-smart-paste__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background: linear-gradient(135deg, @color-wiki-purple-bg 0%, #fff 100%);
}

.wiki-smart-paste__title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: @color-wiki-purple-dark;
}

.wiki-smart-paste__subtitle {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #888;
}

.wiki-smart-paste__toggle {
  font-size: 24rpx;
  color: @color-wiki-purple;
  flex-shrink: 0;
}

.wiki-smart-paste__body {
  padding: 0 24rpx 24rpx;
}

.wiki-smart-paste__prompt-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 16rpx;
  padding: 16rpx;
  background: @color-wiki-purple-bg-lighter;
  border-radius: 12rpx;
}

.wiki-smart-paste__prompt-tip {
  flex: 1;
  font-size: 22rpx;
  line-height: 1.5;
  color: @color-wiki-purple-mid;
}

.wiki-smart-paste__textarea {
  width: 100%;
  min-height: 220rpx;
  padding: 20rpx;
  box-sizing: border-box;
  font-size: 26rpx;
  line-height: 1.6;
  color: #333;
  background: @color-bg-input;
  border-radius: 12rpx;
}

.wiki-smart-paste__actions {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  margin-top: 16rpx;
}

.wiki-smart-paste__summary {
  margin-top: 16rpx;
  font-size: 24rpx;
  color: #666;
}

.wiki-smart-paste__compare {
  margin-top: 20rpx;
}

.wiki-smart-paste__compare-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.wiki-smart-paste__compare-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
}

.wiki-smart-paste__bulk {
  display: flex;
  gap: 20rpx;
}

.wiki-smart-paste__bulk-btn {
  font-size: 24rpx;
  color: @color-wiki-purple;
}

.wiki-smart-paste__row {
  display: flex;
  gap: 16rpx;
  padding: 16rpx;
  margin-bottom: 12rpx;
  background: @color-bg-input;
  border-radius: 12rpx;
  border: 2rpx solid transparent;

  &--selected {
    background: @color-wiki-purple-bg-lighter;
    border-color: @color-wiki-purple-light;
  }
}

.wiki-smart-paste__check {
  width: 36rpx;
  height: 36rpx;
  margin-top: 4rpx;
  border-radius: 8rpx;
  border: 2rpx solid #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &.checked {
    background: @color-wiki-purple;
    border-color: @color-wiki-purple;
  }
}

.wiki-smart-paste__check-icon {
  color: #fff;
  font-size: 22rpx;
}

.wiki-smart-paste__row-body {
  flex: 1;
  min-width: 0;
}

.wiki-smart-paste__row-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.wiki-smart-paste__label {
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
}

.wiki-smart-paste__confidence {
  font-size: 20rpx;
  padding: 2rpx 10rpx;
  border-radius: 999rpx;

  &.is-high {
    color: @color-wiki-green;
    background: @color-wiki-green-bg;
  }

  &.is-medium {
    color: @color-wiki-amber;
    background: @color-wiki-amber-bg;
  }

  &.is-low {
    color: @color-wiki-gray;
    background: @color-wiki-gray-bg;
  }
}

.wiki-smart-paste__col {
  margin-top: 8rpx;
}

.wiki-smart-paste__col-title {
  display: block;
  font-size: 20rpx;
  color: #999;
}

.wiki-smart-paste__col-text {
  display: block;
  font-size: 24rpx;
  color: #333;
  line-height: 1.5;
  word-break: break-all;

  &--muted {
    color: #777;
  }
}

.wiki-smart-paste__apply {
  margin-top: 8rpx;
  border-radius: 48rpx;
}
</style>
