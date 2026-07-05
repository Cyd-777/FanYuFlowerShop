/** 商品销售方式 / 商品类 */
export type GoodsSalesType = 'stem' | 'group' | 'bouquet' | 'other'

export type GoodsUnit = '支' | '组' | '束' | '件'

interface GoodsUnitOption {
  value: GoodsUnit
  /** 表单/卡片展示文案（支 → 枝） */
  label: string
}

export const GOODS_UNIT_OPTIONS: GoodsUnitOption[] = [
  { value: '支', label: '枝' },
  { value: '组', label: '组' },
  { value: '束', label: '束' },
  { value: '件', label: '件' },
]

export interface GoodsSalesTypeOption {
  value: GoodsSalesType
  label: string
  unit: GoodsUnit
  needsFlowerPick: boolean
}

export const GOODS_SALES_TYPE_OPTIONS: GoodsSalesTypeOption[] = [
  { value: 'stem', label: '单支售卖', unit: '支', needsFlowerPick: true },
  { value: 'group', label: '成组售卖', unit: '组', needsFlowerPick: true },
  { value: 'bouquet', label: '捆扎成束', unit: '束', needsFlowerPick: false },
  { value: 'other', label: '其他商品', unit: '件', needsFlowerPick: false },
]

/** 商品图最多张数（含主图） */
export const MAX_GOODS_IMAGES = 9

export interface Goods {
  _id: string
  name: string
  price: number
  unit: GoodsUnit
  salesType: GoodsSalesType
  stock: number
  description: string
  categoryId: string
  categoryName: string
  flowerKindId?: string
  flowerKindName?: string
  flowerVarietyId?: string
  flowerVarietyName?: string
  coverImage: string
  images: string[]
  /** 新版缩略图 fileID（160px webp） */
  previewFileId?: string
  /** 新版标准图 fileID（750px webp） */
  standardFileId?: string
  /** @deprecated 与 coverImage 同源，仅兼容旧响应；不做商家双上传 */
  coverThumb?: string
  /** @deprecated 等同 coverImageUrl */
  coverThumbUrl?: string
  /** 顾客端公开接口：云函数侧已换链的封面 HTTPS */
  coverImageUrl?: string
  /** 顾客端公开接口：云函数侧已换链的 160px 缩略图 HTTPS */
  previewImageUrl?: string
  /** 顾客端公开接口：云函数侧已换链的 750px 标准图 HTTPS */
  standardImageUrl?: string
  /** 顾客端公开接口：云函数侧已换链的多图 HTTPS */
  imageUrls?: string[]
  onSale: boolean
  recommend: boolean
  sort: number
  /** 最近一次上架时间（新建上架或下架后再上架时更新） */
  listedAt?: string
  /** 成组售卖时，每组包含的数量（如 10 支/组） */
  unitsPerGroup?: number
  createdAt?: string
  updatedAt?: string
}

export interface GoodsForm {
  name: string
  price: string
  salesType: GoodsSalesType
  unit: GoodsUnit
  stock: string
  description: string
  categoryId: string
  flowerKindId: string
  flowerKindName: string
  flowerVarietyId: string
  flowerVarietyName: string
  coverImage: string
  images: string[]
  previewFileId?: string
  standardFileId?: string
  onSale: boolean
  recommend: boolean
  sort: string
  unitsPerGroup: string
}

export type GoodsListFilter = 'all' | 'onSale' | 'offSale'

export function getSalesTypeOption(type: GoodsSalesType): GoodsSalesTypeOption {
  return GOODS_SALES_TYPE_OPTIONS.find((item) => item.value === type) || GOODS_SALES_TYPE_OPTIONS[2]
}

export function unitFromSalesType(type: GoodsSalesType): GoodsUnit {
  return getSalesTypeOption(type).unit
}

export function salesTypeFromUnit(unit: GoodsUnit): GoodsSalesType {
  if (unit === '支') return 'stem'
  if (unit === '组') return 'group'
  if (unit === '件') return 'other'
  return 'bouquet'
}

export function needsFlowerPickForUnit(unit: GoodsUnit): boolean {
  return unit === '支' || unit === '组'
}

/** 顾客端/表单展示用单位文案 */
export function getGoodsUnitLabel(unit: GoodsUnit | string | undefined | null): string {
  const opt = GOODS_UNIT_OPTIONS.find((item) => item.value === unit)
  if (opt) return opt.label
  if (unit === '支') return '枝'
  return typeof unit === 'string' && unit.trim() ? unit : '束'
}

/** 旧数据无 salesType 时按 unit / 花卉信息推断 */
export function inferSalesType(
  goods: Pick<Goods, 'salesType' | 'unit' | 'flowerVarietyId' | 'flowerKindId'>,
): GoodsSalesType {
  if (goods.salesType && GOODS_SALES_TYPE_OPTIONS.some((item) => item.value === goods.salesType)) {
    return goods.salesType
  }
  if (goods.unit === '支') return 'stem'
  if (goods.unit === '组') return 'group'
  if (goods.unit === '件') return 'other'
  if (goods.flowerVarietyId || goods.flowerKindId) return 'stem'
  return 'bouquet'
}
