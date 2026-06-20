import type { Goods, GoodsListFilter, GoodsSalesType } from '@/types/goods'
import { inferSalesType } from '@/types/goods'
import { matchGoodsNameKeyword } from '@/utils/goodsNameSuggest'
import { isGoodsOffSale, isGoodsOnSale } from '@/utils/goodsAvailability'

/** 商家端上架状态：已上架含售罄 */
export type MerchantShelfStatus = 'all' | 'onShelf' | 'offShelf'

/** 商家端库存筛选 */
export type MerchantStockStatus = 'all' | 'inStock' | 'soldOut'

export interface MerchantGoodsFilterState {
  shelfStatus: MerchantShelfStatus
  categoryId: string
  flowerKindId: string
  flowerVarietyId: string
  recommendOnly: boolean
  salesType: GoodsSalesType | ''
  stockStatus: MerchantStockStatus
  priceMin: string
  priceMax: string
  nameKeyword: string
  /** 品名精确匹配（否则为包含匹配） */
  nameKeywordExact: boolean
}

export const DEFAULT_MERCHANT_GOODS_FILTER: MerchantGoodsFilterState = {
  shelfStatus: 'all',
  categoryId: '',
  flowerKindId: '',
  flowerVarietyId: '',
  recommendOnly: false,
  salesType: '',
  stockStatus: 'all',
  priceMin: '',
  priceMax: '',
  nameKeyword: '',
  nameKeywordExact: false,
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

function matchCategory(item: Goods, categoryId: string): boolean {
  const id = categoryId.trim()
  if (!id) return true
  if (id === '__none__') return !item.categoryId
  return item.categoryId === id
}

function matchFlowerKind(item: Goods, flowerKindId: string): boolean {
  const id = flowerKindId.trim()
  if (!id) return true
  return item.flowerKindId === id
}

function matchFlowerVariety(item: Goods, flowerVarietyId: string): boolean {
  const id = flowerVarietyId.trim()
  if (!id) return true
  return item.flowerVarietyId === id
}

function matchStockStatus(item: Goods, stockStatus: MerchantStockStatus): boolean {
  if (stockStatus === 'inStock') return item.stock > 0
  if (stockStatus === 'soldOut') return item.stock <= 0
  return true
}

function matchSalesType(item: Goods, salesType: GoodsSalesType | ''): boolean {
  if (!salesType) return true
  return inferSalesType(item) === salesType
}

function matchPriceRange(item: Goods, priceMin: string, priceMax: string): boolean {
  const min = parsePriceBound(priceMin)
  const max = parsePriceBound(priceMax)
  const price = Number(item.price) || 0
  if (min != null && price < min) return false
  if (max != null && price > max) return false
  return true
}

/** 商家端：传统多维组合筛选（客户端，各维度 AND） */
export function filterMerchantGoodsView(
  list: Goods[],
  filter: MerchantGoodsFilterState,
): Goods[] {
  return list.filter((item) => {
    if (!matchGoodsNameKeyword(item, filter.nameKeyword, filter.nameKeywordExact)) return false
    if (!matchShelfStatus(item, filter.shelfStatus)) return false
    if (!matchCategory(item, filter.categoryId)) return false
    if (!matchFlowerKind(item, filter.flowerKindId)) return false
    if (!matchFlowerVariety(item, filter.flowerVarietyId)) return false
    if (!matchStockStatus(item, filter.stockStatus)) return false
    if (filter.recommendOnly && !item.recommend) return false
    if (!matchSalesType(item, filter.salesType)) return false
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

export function collectFlowerVarietyOptions(list: Goods[], flowerKindId = ''): FlowerVarietyOption[] {
  const kindId = flowerKindId.trim()
  const map = new Map<string, FlowerVarietyOption>()
  for (const item of list) {
    if (kindId && item.flowerKindId !== kindId) continue
    const id = item.flowerVarietyId?.trim()
    if (!id) continue
    map.set(id, {
      id,
      name: item.flowerVarietyName?.trim() || id,
      kindId: item.flowerKindId || '',
    })
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
}

/** 花材种类是否仍存在于当前可选列表 */
export function isFlowerKindInOptions(
  flowerKindId: string,
  options: FlowerKindOption[],
): boolean {
  const id = flowerKindId.trim()
  if (!id) return true
  return options.some((item) => item.id === id)
}

/** 顾客端：在售商品（含售罄）按分类筛选；下架商品不展示 */
export function filterPublicGoodsList(list: Goods[], categoryId = ''): Goods[] {
  const onSale = list.filter((item) => item.onSale !== false)
  const id = categoryId.trim()
  if (!id) return onSale
  return onSale.filter((item) => item.categoryId === id)
}
