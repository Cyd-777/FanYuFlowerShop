import type { Category } from '@/types/category'
import type { Goods, GoodsForm, GoodsUnit } from '@/types/goods'

export function wikiCategoryIdFromKindName(kindName: string): string {
  const name = String(kindName || '').trim()
  return name ? `wiki:${name}` : ''
}

export function categoryNameFromCategoryId(categoryId: string): string {
  const id = String(categoryId || '').trim()
  if (!id) return ''
  if (id.startsWith('wiki:')) return id.slice(5).trim()
  return ''
}

/** 提交云端前解析分类 ID（支/组强制 wiki:种类名） */
export function resolveGoodsFormCategoryId(
  form: Pick<GoodsForm, 'unit' | 'categoryId' | 'flowerKindName'>,
): string {
  const unit = form.unit
  if (unit === '支' || unit === '组') {
    return wikiCategoryIdFromKindName(form.flowerKindName)
  }
  return String(form.categoryId || '').trim()
}

/** 列表/卡片展示用分类名（兼容库内缺 categoryName 的旧数据） */
export function resolveGoodsCategoryName(
  goods: Pick<Goods, 'categoryId' | 'categoryName' | 'flowerKindName'>,
  categories: Category[] = [],
): string {
  const fromField = String(goods.categoryName || '').trim()
  if (fromField) return fromField

  const fromKind = String(goods.flowerKindName || '').trim()
  if (fromKind) return fromKind

  const fromWiki = categoryNameFromCategoryId(goods.categoryId || '')
  if (fromWiki) return fromWiki

  const categoryId = String(goods.categoryId || '').trim()
  if (!categoryId) return ''

  const cat = categories.find((item) => item._id === categoryId)
  return cat?.name?.trim() || ''
}

export function enrichGoodsCategoryFields<T extends Goods>(
  goods: T,
  categories: Category[] = [],
): T {
  const categoryName = resolveGoodsCategoryName(goods, categories)
  if (!categoryName || categoryName === goods.categoryName) return goods
  return { ...goods, categoryName }
}

export function enrichGoodsListCategoryFields<T extends Goods>(
  list: T[],
  categories: Category[] = [],
): T[] {
  if (!list.length) return list
  return list.map((item) => enrichGoodsCategoryFields(item, categories))
}

export function isMaterialUnit(unit: GoodsUnit): boolean {
  return unit === '件'
}

export function isBouquetUnit(unit: GoodsUnit): boolean {
  return unit === '束'
}
