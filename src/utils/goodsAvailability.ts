import type { Goods } from '@/types/goods'

type GoodsAvailability = Pick<Goods, 'onSale' | 'stock'>

/** 顾客端「即将售罄」：在售且库存低于等于该阈值 */
export const LOW_STOCK_THRESHOLD = 5

export type GoodsImageOverlayKind = 'offSale' | 'soldOut' | 'lowStock'

export interface GoodsImageOverlay {
  kind: GoodsImageOverlayKind
  label: string
}

/** 商家仍上架（含售罄） */
export function isGoodsOnSale(goods: GoodsAvailability) {
  return goods.onSale !== false
}

/** 已下架：顾客端不展示、不可购买 */
export function isGoodsOffSale(goods: GoodsAvailability) {
  return goods.onSale === false
}

/** 上架但库存为 0：仍展示，标注售罄，暂不可购买 */
export function isGoodsSoldOut(goods: GoodsAvailability) {
  return isGoodsOnSale(goods) && goods.stock <= 0
}

/** 在售且库存偏少（顾客端展示「即将售罄」） */
export function isGoodsLowStock(goods: GoodsAvailability) {
  return isGoodsOnSale(goods) && goods.stock > 0 && goods.stock <= LOW_STOCK_THRESHOLD
}

/** 当前可加购/购买 */
export function isGoodsPurchasable(goods: GoodsAvailability, inCartCount = 0) {
  if (isGoodsOffSale(goods)) return false
  if (goods.stock <= 0) return false
  return goods.stock - inCartCount > 0
}

/** 顾客端图片角标：售罄 > 即将售罄 */
export function getCustomerGoodsImageOverlay(goods: GoodsAvailability): GoodsImageOverlay | null {
  if (isGoodsSoldOut(goods)) return { kind: 'soldOut', label: '售罄' }
  if (isGoodsLowStock(goods)) return { kind: 'lowStock', label: '即将售罄' }
  return null
}

/** 商家端图片角标：下架 > 售罄（不展示即将售罄） */
export function getMerchantGoodsImageOverlay(goods: GoodsAvailability): GoodsImageOverlay | null {
  if (isGoodsOffSale(goods)) return { kind: 'offSale', label: '下架商品' }
  if (isGoodsSoldOut(goods)) return { kind: 'soldOut', label: '售罄商品' }
  return null
}

export function getGoodsStatusLabel(goods: GoodsAvailability) {
  return getMerchantGoodsImageOverlay(goods)?.label || ''
}
