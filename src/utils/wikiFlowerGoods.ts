import type { Category } from '@/types/category'
import { MALL_NAV_PARENT_IDS } from '@/types/category'
import type { Goods } from '@/types/goods'
import { inferSalesType } from '@/types/goods'
import { mergeProfileAliasesIntoMap } from '@/data/wikiKindCommonNames'

export function isWikiCategoryId(categoryId: string | undefined | null): boolean {
  return (categoryId || '').trim().startsWith('wiki:')
}

export function wikiKindNameFromCategoryId(categoryId: string): string {
  const id = categoryId.trim()
  if (!id.startsWith('wiki:')) return ''
  return id.slice(5).trim()
}

/** 支/组花材（智库衍生） */
export function isWikiStemOrGroupGoods(goods: Goods): boolean {
  const salesType = inferSalesType(goods)
  if (salesType !== 'stem' && salesType !== 'group') return false
  if (isWikiCategoryId(goods.categoryId)) return true
  return !!(goods.flowerKindName?.trim() || goods.flowerKindId?.trim())
}

export type WikiKindAliasSource = {
  kindName: string
  aliases?: string[]
  icon?: string
  sort?: number
}

/** 别名 → 百科 canonical 种类名（如 紫阳花 → 绣球） */
export function buildWikiKindAliasMap(
  wikiCategories: Category[],
  wikiList: WikiKindAliasSource[] = [],
): Map<string, string> {
  const map = new Map<string, string>()
  mergeProfileAliasesIntoMap(map)
  for (const cat of wikiCategories) {
    const canonical = cat.name.trim()
    if (canonical) map.set(canonical, canonical)
  }
  for (const item of wikiList) {
    const canonical = item.kindName.trim()
    if (!canonical) continue
    map.set(canonical, canonical)
    for (const alias of item.aliases || []) {
      const key = alias.trim()
      if (key) map.set(key, canonical)
    }
  }
  return map
}

function resolveCanonicalKindName(
  raw: string,
  wikiCategoryNames: Set<string>,
  aliasToCanonical?: Map<string, string>,
): string {
  const name = raw.trim()
  if (!name) return ''
  if (wikiCategoryNames.has(name)) return name
  const canonical = aliasToCanonical?.get(name)
  if (canonical && wikiCategoryNames.has(canonical)) return canonical
  if (canonical) return canonical
  return name
}

function wikiCategoryFromListItem(item: WikiKindAliasSource): Category {
  return {
    _id: `wiki:${item.kindName}`,
    name: item.kindName,
    icon: item.icon || '🌸',
    sort: Number(item.sort) || 0,
    enabled: true,
    categoryType: '',
    _source: 'wiki',
    navTier: 'secondary',
    parentId: MALL_NAV_PARENT_IDS.flower,
  }
}

/**
 * 商城「鲜花」Tab 统一导航上下文：
 * 二阶胶囊 / 分组 / 别名归一共用同一套 wiki 分类与 alias 表。
 */
export function buildWikiFlowerMallNav(
  publicCategories: Category[],
  wikiList: WikiKindAliasSource[],
  goods: Goods[] = [],
): {
  aliasToCanonical: Map<string, string>
  wikiCategories: Category[]
  wikiCategoriesByName: Map<string, Category>
  wikiCategoryIds: Set<string>
  wikiCategoryNames: Set<string>
} {
  const publicWiki = publicCategories.filter((c) => c._source === 'wiki')
  const wikiCategoriesByName = new Map<string, Category>()

  for (const item of wikiList) {
    const name = item.kindName.trim()
    if (!name || name === '混搭花束') continue
    const fromPublic = publicWiki.find((c) => c.name === name)
    wikiCategoriesByName.set(
      name,
      fromPublic
        ? { ...wikiCategoryFromListItem(item), ...fromPublic, _id: `wiki:${name}` }
        : wikiCategoryFromListItem(item),
    )
  }

  for (const cat of publicWiki) {
    if (!wikiCategoriesByName.has(cat.name)) {
      wikiCategoriesByName.set(cat.name, cat)
    }
  }

  let wikiCategories = [...wikiCategoriesByName.values()]
  let aliasToCanonical = buildWikiKindAliasMap(wikiCategories, wikiList)
  let wikiCategoryNames = new Set(wikiCategories.map((c) => c.name))

  for (const g of goods) {
    if (!isWikiStemOrGroupGoods(g)) continue
    if (!isPublicWikiFlowerGoods(g, new Set(), wikiCategoryNames, aliasToCanonical)) continue
    const kind = resolveWikiFlowerKindName(
      g,
      wikiCategoriesByName,
      aliasToCanonical,
      wikiCategoryNames,
    )
    if (!kind || wikiCategoriesByName.has(kind)) continue
    wikiCategoriesByName.set(kind, wikiCategoryFromListItem({ kindName: kind }))
  }

  wikiCategories = [...wikiCategoriesByName.values()].sort((a, b) =>
    a.name.localeCompare(b.name, 'zh-CN'),
  )
  aliasToCanonical = buildWikiKindAliasMap(wikiCategories, wikiList)
  const wikiCategoryIds = new Set(wikiCategories.map((c) => c._id))
  wikiCategoryNames = new Set(wikiCategories.map((c) => c.name))

  return {
    aliasToCanonical,
    wikiCategories,
    wikiCategoriesByName,
    wikiCategoryIds,
    wikiCategoryNames,
  }
}

/** 商城「鲜花」Tab 应展示的在售花材 */
export function isPublicWikiFlowerGoods(
  goods: Goods,
  wikiCategoryIds: Set<string>,
  wikiCategoryNames: Set<string>,
  aliasToCanonical?: Map<string, string>,
): boolean {
  if (!isWikiStemOrGroupGoods(goods)) return false
  const categoryId = goods.categoryId?.trim() || ''
  if (categoryId.startsWith('wiki:')) {
    if (wikiCategoryIds.has(categoryId)) return true
    const kindFromId = wikiKindNameFromCategoryId(categoryId)
    if (wikiCategoryNames.has(kindFromId)) return true
    const canonical = aliasToCanonical?.get(kindFromId)
    if (canonical && wikiCategoryNames.has(canonical)) return true
    if (canonical) return true
  }
  if (wikiCategoryIds.has(categoryId)) return true
  const kindName = goods.flowerKindName?.trim() || ''
  if (kindName === '') return false
  if (wikiCategoryNames.has(kindName)) return true
  const canonical = aliasToCanonical?.get(kindName)
  if (canonical && wikiCategoryNames.has(canonical)) return true
  return canonical !== undefined
}

/** 分组/胶囊标签用品种名：wiki:categoryId → canonical；flowerKindName 经别名归一 */
export function resolveWikiFlowerKindName(
  goods: Goods,
  wikiCategoriesByName: Map<string, Category>,
  aliasToCanonical?: Map<string, string>,
  wikiCategoryNames?: Set<string>,
): string {
  const names = wikiCategoryNames || new Set(wikiCategoriesByName.keys())
  const fromCategoryId = wikiKindNameFromCategoryId(goods.categoryId || '')
  if (fromCategoryId) {
    return resolveCanonicalKindName(fromCategoryId, names, aliasToCanonical)
  }
  const fromField = goods.flowerKindName?.trim()
  if (fromField) {
    return resolveCanonicalKindName(fromField, names, aliasToCanonical)
  }
  const categoryName = goods.categoryName?.trim()
  if (categoryName) {
    return resolveCanonicalKindName(categoryName, names, aliasToCanonical)
  }
  return ''
}

export function resolveWikiFlowerKindIcon(
  kindName: string,
  wikiCategoriesByName: Map<string, Category>,
): string {
  return wikiCategoriesByName.get(kindName)?.icon || '🌸'
}

/** 顾客端按 wiki 衍生分类筛商品（含别名） */
export function goodsMatchesWikiCategory(
  goods: Goods,
  wikiCategoryId: string,
  aliasToCanonical?: Map<string, string>,
): boolean {
  const canonical = wikiCategoryId.slice(5).trim()
  if (!canonical) return false
  const cid = goods.categoryId?.trim() || ''
  if (cid === wikiCategoryId) return true
  const itemKind = goods.flowerKindName?.trim() || ''
  if (itemKind === canonical) return true
  if (cid.startsWith('wiki:')) {
    const fromId = wikiKindNameFromCategoryId(cid)
    if (fromId === canonical) return true
    if (aliasToCanonical?.get(fromId) === canonical) return true
  }
  return aliasToCanonical?.get(itemKind) === canonical
}

export type WikiFlowerMallNav = ReturnType<typeof buildWikiFlowerMallNav>
