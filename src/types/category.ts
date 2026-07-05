/** 商城导航层级：primary=左侧一阶 tab，secondary=顶部胶囊 */
export type CategoryNavTier = 'primary' | 'secondary'

/** 一阶 tab 固定父级 ID（二阶分类 parentId 可指向此类常量） */
export const MALL_NAV_PARENT_IDS = {
  flower: 'nav:flower',
  bouquet: 'nav:bouquet',
  material: 'nav:material',
} as const

export type MallNavParentId = (typeof MALL_NAV_PARENT_IDS)[keyof typeof MALL_NAV_PARENT_IDS]

export function isMallNavParentId(id: string): id is MallNavParentId {
  return id === MALL_NAV_PARENT_IDS.flower
    || id === MALL_NAV_PARENT_IDS.bouquet
    || id === MALL_NAV_PARENT_IDS.material
}

export function mallNavParentIdForCategoryType(categoryType: CategoryType): MallNavParentId | '' {
  if (categoryType === 'bouquet') return MALL_NAV_PARENT_IDS.bouquet
  if (categoryType === 'material') return MALL_NAV_PARENT_IDS.material
  return ''
}

/** 解析一阶 tab 显示名（固定 tab 或自定义一阶分类） */
export function resolveMallPrimaryTabLabel(
  parentId: string,
  categories: Pick<Category, '_id' | 'name'>[] = [],
): string {
  if (parentId === MALL_NAV_PARENT_IDS.flower) return '鲜花'
  if (parentId === MALL_NAV_PARENT_IDS.bouquet) return '花束'
  if (parentId === MALL_NAV_PARENT_IDS.material) return '物料'
  const custom = categories.find((c) => c._id === parentId)
  return custom?.name || '花束'
}

/** 商品品类类型 */
export type CategoryType = '' | 'bouquet' | 'material'

/** 定制花束选品用途 */
export type CategoryCustomRole = '' | 'flower' | 'packaging' | 'card'

export interface Category {
  _id: string
  name: string
  icon: string
  sort: number
  enabled: boolean
  /** 品类类型：''=普通(鲜花) / 'bouquet'=花束场景 / 'material'=物料品类 */
  categoryType?: CategoryType
  /** 来源：'wiki' 为百科品种自动衍生，'custom' 为商户手动创建 */
  _source?: 'wiki' | 'custom'
  /** 用于定制花束 */
  customRole?: CategoryCustomRole
  /** 此分类下的商品数量（云函数返回时附带） */
  goodsCount?: number
  /** 商城导航：一阶 tab / 二阶胶囊（自定义分类默认 secondary） */
  navTier?: CategoryNavTier
  /** 二阶分类所属一阶：nav:flower | nav:bouquet | nav:material 或一阶分类 _id */
  parentId?: string
  createdAt?: string
  updatedAt?: string
}

export interface CategoryForm {
  name: string
  icon: string
  categoryType: CategoryType
  customRole: CategoryCustomRole
  navTier?: CategoryNavTier
  parentId?: string
}

/** 启用状态：有商品才启用（与云函数 attachGoodsCounts 一致） */
export function resolveCategoryEnabled(cat: Pick<Category, 'goodsCount'>): boolean {
  return (cat.goodsCount ?? 0) > 0
}

export const CATEGORY_TYPE_OPTIONS: Array<{ value: CategoryType; label: string }> = [
  { value: '', label: '鲜花' },
  { value: 'bouquet', label: '花束场景' },
  { value: 'material', label: '物料品类' },
]

export const CATEGORY_CUSTOM_ROLE_OPTIONS: Array<{
  value: CategoryCustomRole
  label: string
}> = [
  { value: '', label: '普通分类' },
  { value: 'flower', label: '定制花材' },
  { value: 'packaging', label: '定制包装' },
  { value: 'card', label: '定制贺卡' },
]

/** 商户端可创建的类型（不含鲜花，鲜花由智库自动衍生） */
export const MERCHANT_CATEGORY_TYPE_OPTIONS = CATEGORY_TYPE_OPTIONS.filter(
  (item) => item.value !== '',
)

/** 物料品类的定制花束用途（不含花材，花材走支单位商品） */
export const MATERIAL_CUSTOM_ROLE_OPTIONS = CATEGORY_CUSTOM_ROLE_OPTIONS.filter(
  (item) => item.value !== 'flower',
)
