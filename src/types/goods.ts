/** 商品销售方式 / 商品类 */
export type GoodsSalesType = 'stem' | 'group' | 'bouquet' | 'other'

export type GoodsUnit = '支' | '组' | '束' | '件'

export const GOODS_UNITS: GoodsUnit[] = ['支', '组', '束', '件']

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
  onSale: boolean
  recommend: boolean
  sort: number
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
  onSale: boolean
  recommend: boolean
  sort: string
}

export type GoodsListFilter = 'all' | 'onSale' | 'offSale'

export function getSalesTypeOption(type: GoodsSalesType): GoodsSalesTypeOption {
  return GOODS_SALES_TYPE_OPTIONS.find((item) => item.value === type) || GOODS_SALES_TYPE_OPTIONS[2]
}

export function needsFlowerPickForSalesType(type: GoodsSalesType): boolean {
  return getSalesTypeOption(type).needsFlowerPick
}

export function unitFromSalesType(type: GoodsSalesType): GoodsUnit {
  return getSalesTypeOption(type).unit
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
