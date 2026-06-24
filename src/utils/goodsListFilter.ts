import type { Goods, GoodsListFilter, GoodsSalesType } from '@/types/goods'
import { inferSalesType } from '@/types/goods'
import { isGoodsOffSale, isGoodsOnSale } from '@/utils/goodsAvailability'
import {
  matchMerchantGoodsSearch,
  type MerchantGoodsSearchContext,
} from '@/utils/merchantGoodsSearch'

/** 商家端上架状态：已上架含售罄 */
export type MerchantShelfStatus = 'all' | 'onShelf' | 'offShelf'

/** 商家端库存筛选 */
export type MerchantStockStatus = 'all' | 'inStock' | 'soldOut'

/** 多选筛选项中的「全部」占位 id（空字符串） */
export const MERCHANT_FILTER_ALL_ID = ''

export interface MerchantGoodsFilterState {
  shelfStatus: MerchantShelfStatus
  categoryIds: string[]
  flowerKindIds: string[]
  flowerVarietyIds: string[]
  recommendOnly: boolean
  salesTypes: GoodsSalesType[]
  stockStatus: MerchantStockStatus
  priceMin: string
  priceMax: string
  /** 搜索框：精确品名或口语化范围条件 */
  searchQuery: string
  /** 从预判选择时为 exact；手输回车为 auto（自动识别） */
  searchMatchMode: 'auto' | 'exact'
}

export const DEFAULT_MERCHANT_GOODS_FILTER: MerchantGoodsFilterState = {
  shelfStatus: 'all',
  categoryIds: [],
  flowerKindIds: [],
  flowerVarietyIds: [],
  recommendOnly: false,
  salesTypes: [],
  stockStatus: 'all',
  priceMin: '',
  priceMax: '',
  searchQuery: '',
  searchMatchMode: 'auto',
}

export interface FlowerKindOption {
  id: string
  name: string
}

export interface FlowerVarietyOption {
  id: string
  name: string
  kindId: string
}

/** 多选：空数组 = 全部；(a) 选具体项取消全部；(b) 全选则归并为全部 */
export function toggleMerchantMultiFilter(
  selected: string[],
  optionId: string,
  allOptionIds: string[],
): string[] {
  if (optionId === MERCHANT_FILTER_ALL_ID) {
    return []
  }
  const current = selected.filter(Boolean)
  const next = current.includes(optionId)
    ? current.filter((id) => id !== optionId)
    : [...current, optionId]
  if (!next.length) return []
  if (allOptionIds.length > 0 && allOptionIds.every((id) => next.includes(id))) {
    return []
  }
  return next
}

export function isMerchantMultiFilterAll(selected: string[]): boolean {
  return selected.length === 0
}

export function isMerchantMultiFilterActive(selected: string[], optionId: string): boolean {
  if (optionId === MERCHANT_FILTER_ALL_ID) return isMerchantMultiFilterAll(selected)
  return selected.includes(optionId)
}

export function toggleMerchantSalesTypes(
  selected: GoodsSalesType[],
  value: GoodsSalesType | '',
  allValues: GoodsSalesType[],
): GoodsSalesType[] {
  if (value === '') return []
  const next = selected.includes(value)
    ? selected.filter((item) => item !== value)
    : [...selected, value]
  if (!next.length) return []
  if (allValues.length > 0 && allValues.every((item) => next.includes(item))) {
    return []
  }
  return next
}

export function isMerchantSalesTypeActive(
  selected: GoodsSalesType[],
  value: GoodsSalesType | '',
): boolean {
  if (value === '') return selected.length === 0
  return selected.includes(value)
}

export function pruneMerchantMultiFilterIds(selected: string[], validIds: string[]): string[] {
  const validSet = new Set(validIds)
  const next = selected.filter((id) => validSet.has(id))
  if (!next.length) return []
  if (validIds.length > 0 && validIds.every((id) => next.includes(id))) return []
  return next
}

/** 商家端 Tab：在同一份全量列表上按 onSale 筛选（云函数 / 旧接口） */
export function filterMerchantGoodsList(list: Goods[], filter: GoodsListFilter): Goods[] {
  if (filter === 'onSale') return list.filter((item) => item.onSale !== false)
  if (filter === 'offSale') return list.filter((item) => item.onSale === false)
  return list
}

function parsePriceBound(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const num = Number(trimmed)
  if (Number.isNaN(num) || num < 0) return null
  return num
}

function matchShelfStatus(item: Goods, shelfStatus: MerchantShelfStatus): boolean {
  if (shelfStatus === 'onShelf') return isGoodsOnSale(item)
  if (shelfStatus === 'offShelf') return isGoodsOffSale(item)
  return true
}

function matchCategories(item: Goods, categoryIds: string[]): boolean {
  if (!categoryIds.length) return true
  if (!item.categoryId) return categoryIds.includes('__none__')
  return categoryIds.includes(item.categoryId)
}

function matchFlowerKinds(item: Goods, flowerKindIds: string[]): boolean {
  if (!flowerKindIds.length) return true
  const id = item.flowerKindId?.trim()
  if (!id) return false
  return flowerKindIds.includes(id)
}

function matchFlowerVarieties(item: Goods, flowerVarietyIds: string[]): boolean {
  if (!flowerVarietyIds.length) return true
  const id = item.flowerVarietyId?.trim()
  if (!id) return false
  return flowerVarietyIds.includes(id)
}

function matchStockStatus(item: Goods, stockStatus: MerchantStockStatus): boolean {
  if (stockStatus === 'inStock') return item.stock > 0
  if (stockStatus === 'soldOut') return item.stock <= 0
  return true
}

function matchSalesTypes(item: Goods, salesTypes: GoodsSalesType[]): boolean {
  if (!salesTypes.length) return true
  return salesTypes.includes(inferSalesType(item))
}

function matchPriceRange(item: Goods, priceMin: string, priceMax: string): boolean {
  const min = parsePriceBound(priceMin)
  const max = parsePriceBound(priceMax)
  const price = Number(item.price) || 0
  if (min != null && price < min) return false
  if (max != null && price > max) return false
  return true
}

/** 商家端：多维组合筛选 + 搜索框（精确品名 / 口语化范围） */
export function filterMerchantGoodsView(
  list: Goods[],
  filter: MerchantGoodsFilterState,
  searchContext?: MerchantGoodsSearchContext,
): Goods[] {
  const context: MerchantGoodsSearchContext = searchContext ?? {
    categories: [],
    catalog: list,
  }

  return list.filter((item) => {
    if (!matchMerchantGoodsSearch(item, filter, context)) return false
    if (!matchShelfStatus(item, filter.shelfStatus)) return false
    if (!matchCategories(item, filter.categoryIds)) return false
    if (!matchFlowerKinds(item, filter.flowerKindIds)) return false
    if (!matchFlowerVarieties(item, filter.flowerVarietyIds)) return false
    if (!matchStockStatus(item, filter.stockStatus)) return false
    if (filter.recommendOnly && !item.recommend) return false
    if (!matchSalesTypes(item, filter.salesTypes)) return false
    if (!matchPriceRange(item, filter.priceMin, filter.priceMax)) return false
    return true
  })
}

/** 从商品列表提取花材种类选项（去重） */
export function collectFlowerKindOptions(list: Goods[]): FlowerKindOption[] {
  const map = new Map<string, string>()
  for (const item of list) {
    const id = item.flowerKindId?.trim()
    if (!id) continue
    map.set(id, item.flowerKindName?.trim() || id)
  }
  return Array.from(map.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
}

export function collectFlowerVarietyOptions(
  list: Goods[],
  flowerKindIds: string[] = [],
): FlowerVarietyOption[] {
  const kindSet = flowerKindIds.length ? new Set(flowerKindIds) : null
  const map = new Map<string, FlowerVarietyOption>()
  for (const item of list) {
    const kindId = item.flowerKindId?.trim() || ''
    if (kindSet && !kindSet.has(kindId)) continue
    const id = item.flowerVarietyId?.trim()
    if (!id) continue
    map.set(id, {
      id,
      name: item.flowerVarietyName?.trim() || id,
      kindId,
    })
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
}

/** 花材种类是否仍存在于当前可选列表 */
export function isFlowerKindInOptions(
  flowerKindIds: string[],
  options: FlowerKindOption[],
): boolean {
  if (!flowerKindIds.length) return true
  const optionIds = options.map((item) => item.id)
  return flowerKindIds.every((id) => optionIds.includes(id))
}

/** 顾客端：在售商品（含售罄）按分类筛选；下架商品不展示 */
export function filterPublicGoodsList(list: Goods[], categoryId = ''): Goods[] {
  const onSale = list.filter((item) => item.onSale !== false)
  const id = categoryId.trim()
  if (!id) return onSale
  return onSale.filter((item) => item.categoryId === id)
}
