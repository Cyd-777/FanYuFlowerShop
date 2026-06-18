import type { Goods } from '@/types/goods'

type GoodsAvailability = Pick<Goods, 'onSale' | 'stock'>

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

/** 当前可加购/购买 */
export function isGoodsPurchasable(goods: GoodsAvailability, inCartCount = 0) {
  if (isGoodsOffSale(goods)) return false
  if (goods.stock <= 0) return false
  return goods.stock - inCartCount > 0
}

export function getGoodsStatusLabel(goods: GoodsAvailability) {
  if (isGoodsOffSale(goods)) return '已下架'
  if (isGoodsSoldOut(goods)) return '售罄'
  return ''
}
