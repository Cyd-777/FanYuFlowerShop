<template>
  <AppSearchInput
    :model-value="modelValue"
    :placeholder="placeholder"
    suggest-title="输入预判"
    :suggest="goodsSuggest"
    history-profile="merchant-goods"
    :sticky="sticky"
    :sticky-top="stickyTop"
    :sticky-background="stickyBackground"
    :sticky-bleed="stickyBleed"
    @update:model-value="emit('update:modelValue', $event)"
    @search="emit('search', $event)"
    @select="onSelect"
    @focus-change="emit('focus-change', $event)"
  />
</template>

<script setup lang="ts">
import type { Goods } from '@/types/goods'
import type { SearchSuggestion } from '@/types/search'
import AppSearchInput from '@/components/AppSearchInput.vue'
import {
  suggestGoodsAsSearchItems,
  type GoodsNameSuggestion,
} from '@/utils/goodsNameSuggest'

const props = withDefaults(
  defineProps<{
    modelValue: string
    catalog: Goods[]
    placeholder?: string
    sticky?: boolean
    stickyTop?: string
    stickyBackground?: string
    stickyBleed?: string
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

function goodsSuggest(query: string): SearchSuggestion[] {
  return suggestGoodsAsSearchItems(props.catalog, query)
}

function onSelect(item: SearchSuggestion) {
  emit('select', {
    id: item.id,
    name: item.label,
    categoryName: item.meta || '未分类',
  })
}
</script>
