<template>
  <view class="wiki-ext-prefill">
    <view class="wiki-ext-prefill__head">
      <view>
        <text class="wiki-ext-prefill__title">外部自动填充</text>
        <text class="wiki-ext-prefill__subtitle">维基百科 + GBIF · 填入后可继续在下方表单修改</text>
      </view>
      <nut-button
        size="small"
        type="primary"
        :loading="loading"
        :disabled="!canFetch"
        @click="runFetch"
      >
        自动填充
      </nut-button>
    </view>

    <view v-if="statusText" class="wiki-ext-prefill__status">{{ statusText }}</view>

    <view v-if="suggestions.length" class="wiki-ext-prefill__list">
      <view class="wiki-ext-prefill__list-head">
        <text>建议字段</text>
        <view class="wiki-ext-prefill__bulk">
          <text class="wiki-ext-prefill__bulk-btn" @tap="selectAll(true)">全选</text>
          <text class="wiki-ext-prefill__bulk-btn" @tap="selectAll(false)">全不选</text>
        </view>
      </view>

      <view
        v-for="(row, idx) in suggestions"
        :key="`${row.field}-${idx}`"
        class="wiki-ext-prefill__row"
        :class="{ 'wiki-ext-prefill__row--selected': row.selected }"
        @tap="toggleRow(idx)"
      >
        <view class="wiki-ext-prefill__check" :class="{ checked: row.selected }">
          <text v-if="row.selected">✓</text>
        </view>
        <view class="wiki-ext-prefill__row-body">
          <view class="wiki-ext-prefill__row-top">
            <text class="wiki-ext-prefill__label">{{ row.label }}</text>
            <text class="wiki-ext-prefill__tag">{{ row.source }}</text>
          </view>
          <text class="wiki-ext-prefill__value">{{ row.value }}</text>
        </view>
      </view>

      <nut-button block type="primary" plain size="small" @click="applySelected">
        应用到表单
      </nut-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { showToast } from '@/utils/feedback'
import { fetchWikiExternalPrefill } from '@/services/wiki'
import {
  applyExternalPrefillSuggestions,
  type WikiExternalPrefillSuggestion,
} from '@/utils/wikiExternalPrefill'
import type { WikiArticleEditForm } from '@/utils/wikiMerchantForm'
import { getWikiFullLabel } from '@/types/wiki'

const props = defineProps<{
  form: WikiArticleEditForm
}>()

const emit = defineEmits<{
  'update:form': [WikiArticleEditForm]
}>()

interface Row extends WikiExternalPrefillSuggestion {
  selected: boolean
}

const loading = ref(false)
const statusText = ref('')
const suggestions = ref<Row[]>([])

const canFetch = computed(() => {
  const label = getWikiFullLabel(props.form).trim()
  return label.length >= 2 && !loading.value
})

function buildQuery(): string {
  const label = getWikiFullLabel(props.form).trim()
  if (label) return label
  return props.form.kindName.trim()
}

async function runFetch() {
  const query = buildQuery()
  if (query.length < 2) {
    showToast({ title: '请先填写种类或品种名', icon: 'none' })
    return
  }

  loading.value = true
  statusText.value = '正在拉取维基百科与 GBIF…'
  suggestions.value = []
  try {
    const result = await fetchWikiExternalPrefill(query)
    const list = result.suggestions || []
    if (!list.length) {
      statusText.value = result.errMsg || '未找到可填充字段'
      return
    }
    suggestions.value = list.map((item) => ({
      ...item,
      selected: item.confidence !== 'low',
    }))
    statusText.value = `已找到 ${list.length} 项，勾选后点「应用到表单」`
  } catch (err) {
    statusText.value = err instanceof Error ? err.message : '拉取失败'
  } finally {
    loading.value = false
  }
}

function toggleRow(index: number) {
  const row = suggestions.value[index]
  if (!row) return
  row.selected = !row.selected
}

function selectAll(on: boolean) {
  suggestions.value = suggestions.value.map((row) => ({ ...row, selected: on }))
}

function applySelected() {
  const selected = new Set(
    suggestions.value.filter((row) => row.selected).map((row) => row.field),
  )
  if (!selected.size) {
    showToast({ title: '请至少勾选一项', icon: 'none' })
    return
  }
  const next = applyExternalPrefillSuggestions(props.form, suggestions.value, selected)
  emit('update:form', next)
  showToast({ title: '已写入表单', icon: 'success' })
}
</script>

<style lang="less">
@import '@/styles/tokens.less';
.wiki-ext-prefill {
  margin: 16rpx 24rpx 0;
  padding: 24rpx;
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);

  &__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16rpx;
  }

  &__title {
    display: block;
    font-size: 30rpx;
    font-weight: 600;
    color: #222;
  }

  &__subtitle {
    display: block;
    margin-top: 8rpx;
    font-size: 22rpx;
    color: #888;
    line-height: 1.4;
  }

  &__status {
    margin-top: 16rpx;
    font-size: 24rpx;
    color: #666;
    line-height: 1.5;
  }

  &__list {
    margin-top: 20rpx;
  }

  &__list-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12rpx;
    font-size: 26rpx;
    color: #333;
  }

  &__bulk {
    display: flex;
    gap: 16rpx;
  }

  &__bulk-btn {
    font-size: 24rpx;
    color: @color-wiki-green-dark;
  }

  &__row {
    display: flex;
    gap: 16rpx;
    padding: 16rpx;
    margin-bottom: 12rpx;
    border-radius: 12rpx;
    background: @color-bg-page;
    border: 2rpx solid transparent;

    &--selected {
      border-color: rgba(45, 80, 22, 0.35);
      background: rgba(45, 80, 22, 0.06);
    }
  }

  &__check {
    width: 36rpx;
    height: 36rpx;
    border-radius: 8rpx;
    border: 2rpx solid #ccc;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22rpx;
    flex-shrink: 0;

    &.checked {
      background: @color-wiki-green-dark;
      border-color: @color-wiki-green-dark;
      color: #fff;
    }
  }

  &__row-body {
    flex: 1;
    min-width: 0;
  }

  &__row-top {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 8rpx;
  }

  &__label {
    font-size: 26rpx;
    font-weight: 600;
    color: #333;
  }

  &__tag {
    font-size: 20rpx;
    color: #888;
    background: #eee;
    padding: 2rpx 10rpx;
    border-radius: 8rpx;
  }

  &__value {
    font-size: 24rpx;
    color: #555;
    line-height: 1.5;
    word-break: break-all;
  }
}
</style>
