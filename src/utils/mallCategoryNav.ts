import type { Category } from '@/types/category'
import { MALL_NAV_PARENT_IDS } from '@/types/category'
import type { Goods } from '@/types/goods'
import { inferSalesType } from '@/types/goods'
import {
  buildWikiFlowerMallNav,
  isPublicWikiFlowerGoods,
  resolveWikiFlowerKindIcon,
  resolveWikiFlowerKindName,
  type WikiFlowerMallNav,
  type WikiKindAliasSource,
} from '@/utils/wikiFlowerGoods'

/** 商城左侧一阶导航（固定；商户自定义一阶后续接 navTier=primary） */
export const MALL_PRIMARY_NAV = [
  { key: 'flower', name: '鲜花', icon: '🌸' },
  { key: 'bouquet', name: '花束', icon: '💐' },
  { key: 'material', name: '物料', icon: '🎀' },
] as const

export type MallPrimaryNavKey = (typeof MALL_PRIMARY_NAV)[number]['key']

export interface MallGoodsGroup {
  title: string
  icon: string
  anchorId: string
  items: Goods[]
  /** 无二阶导航时平铺列表，不展示分组锚点标题 */
  hideAnchor?: boolean
}

/** 商城连续列表中的一阶分区 */
export interface MallPrimarySection {
  tabKey: string
  tabIndex: number
  name: string
  icon: string
  primaryAnchorId: string
  /** 有二阶商品分组种数（仅含当前有商品的分组） */
  secondaryCategoryCount: number
  /** 有二阶商品分组且 ≥2 种时显示胶囊栏 */
  showSecondaryPillBar: boolean
  groups: MallGoodsGroup[]
  /** 无任何商品分组；花束因「自选花束」入口恒为 false */
  isEmpty: boolean
}

export function isBuiltinMallNavKey(key: string): key is MallPrimaryNavKey {
  return MALL_PRIMARY_NAV.some((item) => item.key === key)
}

function buildPrimaryAnchorId(tabKey: string, tabIndex: number): string {
  const safe = tabKey.replace(/[^a-zA-Z0-9_-]/g, '')
  return `cat-l1-${tabIndex}-${safe || 'tab'}`
}

export interface BuildMallSectionsOptions {
  wikiList?: WikiKindAliasSource[]
}

interface MallNavContext {
  wikiFlowerNav: WikiFlowerMallNav
}

function goodsGroupsForSideTab(
  tab: { key: string; name: string; icon?: string },
  goods: Goods[],
  categories: Category[],
  navCtx: MallNavContext,
): MallGoodsGroup[] {
  if (isBuiltinMallNavKey(tab.key)) {
    return mallGoodsGroupsForPrimary(tab.key, goods, categories, navCtx)
  }
  const primary = categories.find((c) => c._id === tab.key)
  if (!primary) return []
  return buildCustomPrimaryGoodsGroups(primary, goods, categories)
}

/** 按左侧 tab 顺序拼接一阶分区（右侧连续滚动，一阶标题为锚点） */
export function buildMallUnifiedSections(
  tabs: Array<{ key: string; name: string; icon?: string }>,
  goods: Goods[],
  categories: Category[],
  options: BuildMallSectionsOptions = {},
): MallPrimarySection[] {
  const seenGoodIds = new Set<string>()
  const wikiFlowerNav = buildWikiFlowerMallNav(categories, options.wikiList ?? [], goods)
  const navCtx: MallNavContext = { wikiFlowerNav }

  const sections = tabs.map((tab, tabIndex) => {
    const secondaryCategories = mallSecondaryCategoriesForPrimary(tab.key, categories, navCtx)

    const rawGroups = goodsGroupsForSideTab(tab, goods, categories, navCtx)
    let groups = rawGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (seenGoodIds.has(item._id)) return false
          seenGoodIds.add(item._id)
          return true
        }),
      }))
      .filter((group) => group.items.length > 0)

    if (secondaryCategories.length >= 2) {
      groups = alignGroupsToSecondaryCategories(
        tab.key,
        secondaryCategories,
        groups,
        navCtx.wikiFlowerNav.aliasToCanonical,
      )
      groups = groups.filter((group) => group.items.length > 0)
    }

    const namedSecondaryGroups = groups.filter((g) => !g.hideAnchor && g.title)
    const showSecondaryPillBar = namedSecondaryGroups.length >= 2
    const secondaryCategoryCount = namedSecondaryGroups.length

    const hasItemGroups = groups.some((g) => g.items.length > 0)
    /** 花束分区固定有「自选花束」入口，逻辑上等同一件特殊商品，不算空分区 */
    const isEmpty = tab.key === 'bouquet' ? false : !hasItemGroups

    return {
      tabKey: tab.key,
      tabIndex,
      name: tab.name,
      icon: tab.icon || '',
      primaryAnchorId: buildPrimaryAnchorId(tab.key, tabIndex),
      secondaryCategoryCount,
      showSecondaryPillBar,
      groups,
      isEmpty,
    }
  })

  /** 一阶：无商品的分区不展示（花束除外） */
  return sections
    .filter((section) => !section.isEmpty)
    .map((section, tabIndex) => ({
      ...section,
      tabIndex,
      primaryAnchorId: buildPrimaryAnchorId(section.tabKey, tabIndex),
    }))
}

export function buildMallGroupAnchorId(prefix: string, index: number): string {
  return `cat-${prefix}-${index}`
}

function buildFlatGoodsGroup(items: Goods[], prefix: string): MallGoodsGroup[] {
  if (!items.length) return []
  return [
    {
      title: '',
      icon: '',
      anchorId: buildMallGroupAnchorId(prefix, 0),
      items,
      hideAnchor: true,
    },
  ]
}

/** 花束二阶：挂在 nav:bouquet 下，排除已升级的一阶 */
export function listBouquetSecondaryCategories(categories: Category[]): Category[] {
  return categories.filter((c) => {
    if (c.categoryType !== 'bouquet') return false
    if (c.navTier === 'primary') return false
    return c.parentId === MALL_NAV_PARENT_IDS.bouquet
  })
}

/** 物料二阶：挂在 nav:material 下，排除已升级的一阶 */
export function listMaterialSecondaryCategories(categories: Category[]): Category[] {
  return categories.filter((c) => {
    if (c.categoryType !== 'material') return false
    if (c.navTier === 'primary') return false
    return c.parentId === MALL_NAV_PARENT_IDS.material
  })
}

/** 指定一阶 tab 下的二阶分类定义（与是否有商品无关） */
export function mallSecondaryCategoriesForPrimary(
  key: MallPrimaryNavKey | string,
  categories: Category[],
  navCtx?: MallNavContext,
): Category[] {
  if (key === 'flower') {
    return navCtx?.wikiFlowerNav.wikiCategories ?? categories.filter((c) => c._source === 'wiki')
  }
  if (key === 'bouquet') {
    return listBouquetSecondaryCategories(categories)
  }
  if (key === 'material') {
    return listMaterialSecondaryCategories(categories)
  }
  return categories.filter(
    (c) => c.navTier !== 'primary' && c.parentId === key,
  )
}

/** 一阶 tab 下配置的二阶分类种数 */
export function countMallSecondaryCategories(
  key: MallPrimaryNavKey | string,
  categories: Category[],
): number {
  return mallSecondaryCategoriesForPrimary(key, categories).length
}

/** 二阶分类一种以上（≥2 种）才显示胶囊栏 */
export function shouldShowMallSecondaryPillBar(
  key: MallPrimaryNavKey | string,
  categories: Category[],
): boolean {
  return countMallSecondaryCategories(key, categories) >= 2
}

/** @deprecated 使用 shouldShowMallSecondaryPillBar */
export function hasMallSecondaryNav(
  key: MallPrimaryNavKey | string,
  categories: Category[],
): boolean {
  return shouldShowMallSecondaryPillBar(key, categories)
}

function secondaryGroupPrefix(tabKey: string): string {
  if (tabKey === 'flower') return 'f'
  if (tabKey === 'bouquet') return 'b'
  if (tabKey === 'material') return 'm'
  return 'p'
}

function orderSecondaryCategories(tabKey: string, categories: Category[]): Category[] {
  if (tabKey === 'flower') {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  }
  return [...categories].sort((a, b) => (b.sort || 0) - (a.sort || 0))
}

/**
 * 胶囊栏按「配置的二阶分类」对齐锚点；调用方须过滤 items 为空的分组（无商品不展示）。
 */
function canonicalGroupTitle(title: string, aliasToCanonical: Map<string, string>): string {
  const trimmed = title.trim()
  if (!trimmed) return trimmed
  return aliasToCanonical.get(trimmed) || trimmed
}

function collectItemsForSecondaryCategory(
  cat: Category,
  itemGroups: MallGoodsGroup[],
  aliasToCanonical: Map<string, string>,
): Goods[] {
  const byTitle = itemGroups.find((g) => !g.hideAnchor && g.title === cat.name)
  if (byTitle?.items.length) return byTitle.items

  const byCanonicalTitle = itemGroups.find(
    (g) => !g.hideAnchor && canonicalGroupTitle(g.title, aliasToCanonical) === cat.name,
  )
  if (byCanonicalTitle?.items.length) return byCanonicalTitle.items

  const items: Goods[] = []
  for (const group of itemGroups) {
    if (group.hideAnchor) continue
    for (const item of group.items) {
      const cid = item.categoryId?.trim() || ''
      if (cid === cat._id) {
        items.push(item)
        continue
      }
      if (cat._id.startsWith('wiki:')) {
        const kindFromId = cid.startsWith('wiki:') ? cid.slice(5).trim() : ''
        const itemKind = item.flowerKindName?.trim() || ''
        if (kindFromId === cat.name || itemKind === cat.name) {
          items.push(item)
          continue
        }
        if (
          aliasToCanonical.get(kindFromId) === cat.name
          || aliasToCanonical.get(itemKind) === cat.name
        ) {
          items.push(item)
        }
      }
    }
  }
  return items
}

function alignGroupsToSecondaryCategories(
  tabKey: string,
  secondaryCategories: Category[],
  itemGroups: MallGoodsGroup[],
  aliasToCanonical: Map<string, string>,
): MallGoodsGroup[] {
  if (secondaryCategories.length < 2) return itemGroups

  const prefix = secondaryGroupPrefix(tabKey)
  const ordered = orderSecondaryCategories(tabKey, secondaryCategories)
  const flatGroups = itemGroups.filter((g) => g.hideAnchor)

  const aligned = ordered.map((cat, index) => {
    const title = cat.name
    const matched = itemGroups.find(
      (g) =>
        !g.hideAnchor
        && (g.title === title || canonicalGroupTitle(g.title, aliasToCanonical) === title),
    )
    const items = collectItemsForSecondaryCategory(cat, itemGroups, aliasToCanonical)
    return {
      title,
      icon: matched?.icon || cat.icon || '',
      anchorId: buildMallGroupAnchorId(prefix, index),
      items: items.length ? items : (matched?.items || []),
    }
  })

  return [...aligned, ...flatGroups]
}

export function buildFlowerGoodsGroups(
  goods: Goods[],
  wikiFlowerNav: WikiFlowerMallNav,
): MallGoodsGroup[] {
  const {
    aliasToCanonical,
    wikiCategories,
    wikiCategoriesByName,
    wikiCategoryIds,
    wikiCategoryNames,
  } = wikiFlowerNav

  const flowerGoods = goods.filter((g) =>
    isPublicWikiFlowerGoods(g, wikiCategoryIds, wikiCategoryNames, aliasToCanonical),
  )

  if (!wikiCategories.length) {
    return buildFlatGoodsGroup(flowerGoods, 'f-flat')
  }

  const map = new Map<string, Goods[]>()
  for (const g of flowerGoods) {
    const kind = resolveWikiFlowerKindName(
      g,
      wikiCategoriesByName,
      aliasToCanonical,
      wikiCategoryNames,
    )
    if (!kind) continue
    if (!map.has(kind)) map.set(kind, [])
    map.get(kind)!.push(g)
  }

  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0], 'zh-CN'))
    .map(([title, items], index) => ({
      title,
      icon: resolveWikiFlowerKindIcon(title, wikiCategoriesByName),
      anchorId: buildMallGroupAnchorId('f', index),
      items,
    }))
}

export function buildBouquetGoodsGroups(
  goods: Goods[],
  bouquetCategories: Category[],
): MallGoodsGroup[] {
  if (!bouquetCategories.length) {
    return buildFlatGoodsGroup(
      goods.filter((g) => inferSalesType(g) === 'bouquet'),
      'b-flat',
    )
  }

  const sceneIds = new Set(bouquetCategories.map((c) => c._id))
  const sceneGoods = goods.filter((g) => sceneIds.has(g.categoryId))

  const map = new Map<string, { icon: string; items: Goods[] }>()
  for (const cat of bouquetCategories) {
    map.set(cat.name, { icon: cat.icon, items: [] })
  }
  for (const g of sceneGoods) {
    const cat = bouquetCategories.find((c) => c._id === g.categoryId)
    if (!cat) continue
    const entry = map.get(cat.name)
    if (entry) entry.items.push(g)
  }

  return Array.from(map.entries())
    .filter(([, v]) => v.items.length > 0)
    .map(([title, v], index) => ({
      title,
      icon: v.icon,
      anchorId: buildMallGroupAnchorId('b', index),
      items: v.items,
    }))
}

export function buildMaterialGoodsGroups(
  goods: Goods[],
  materialCategories: Category[],
  allCategories: Category[],
): MallGoodsGroup[] {
  const materialIds = new Set(materialCategories.map((c) => c._id))
  const primaryCategoryIds = new Set(
    allCategories.filter((c) => c.navTier === 'primary').map((c) => c._id),
  )
  const materialGoods = goods.filter((g) => {
    if (inferSalesType(g) !== 'other') return false
    const cid = g.categoryId?.trim()
    if (!cid) return false
    if (primaryCategoryIds.has(cid)) return false
    if (!materialIds.size) return false
    return materialIds.has(cid)
  })

  if (!materialCategories.length) {
    return buildFlatGoodsGroup(materialGoods, 'm-flat')
  }

  const map = new Map<string, { icon: string; items: Goods[] }>()
  for (const cat of materialCategories) {
    map.set(cat.name, { icon: cat.icon, items: [] })
  }
  for (const g of materialGoods) {
    const cat = materialCategories.find((c) => c._id === g.categoryId)
    const title = cat?.name || g.categoryName?.trim() || '其他物料'
    const icon = cat?.icon || '🎀'
    if (!map.has(title)) map.set(title, { icon, items: [] })
    map.get(title)!.items.push(g)
  }

  return Array.from(map.entries())
    .filter(([, v]) => v.items.length > 0)
    .map(([title, v], index) => ({
      title,
      icon: v.icon,
      anchorId: buildMallGroupAnchorId('m', index),
      items: v.items,
    }))
}

export function buildCustomPrimaryGoodsGroups(
  primaryCategory: Category,
  goods: Goods[],
  allCategories: Category[],
): MallGoodsGroup[] {
  const secondaries = mallSecondaryCategoriesForPrimary(
    primaryCategory._id,
    allCategories,
  ).sort((a, b) => (b.sort || 0) - (a.sort || 0))

  if (!secondaries.length) {
    return buildFlatGoodsGroup(
      goods.filter((g) => g.categoryId === primaryCategory._id),
      'p-flat',
    )
  }

  const secondaryIds = new Set(secondaries.map((c) => c._id))
  const scopedGoods = goods.filter((g) => {
    const cid = g.categoryId?.trim()
    if (!cid) return false
    if (cid === primaryCategory._id) return true
    return secondaryIds.has(cid)
  })

  const groups: MallGoodsGroup[] = []
  let index = 0

  const directGoods = scopedGoods.filter((g) => g.categoryId === primaryCategory._id)
  if (directGoods.length) {
    groups.push({
      title: primaryCategory.name,
      icon: primaryCategory.icon || '📦',
      anchorId: buildMallGroupAnchorId('p', index),
      items: directGoods,
    })
    index += 1
  }

  for (const cat of secondaries) {
    const items = scopedGoods.filter((g) => g.categoryId === cat._id)
    if (!items.length) continue
    groups.push({
      title: cat.name,
      icon: cat.icon || '📦',
      anchorId: buildMallGroupAnchorId('p', index),
      items,
    })
    index += 1
  }

  return groups
}

export function mallGoodsGroupsForPrimary(
  key: MallPrimaryNavKey,
  goods: Goods[],
  categories: Category[],
  navCtx: MallNavContext,
): MallGoodsGroup[] {
  const bouquetCategories = listBouquetSecondaryCategories(categories)
  const materialCategories = listMaterialSecondaryCategories(categories)

  if (key === 'flower') {
    return buildFlowerGoodsGroups(goods, navCtx.wikiFlowerNav)
  }
  if (key === 'bouquet') return buildBouquetGoodsGroups(goods, bouquetCategories)
  return buildMaterialGoodsGroups(goods, materialCategories, categories)
}
