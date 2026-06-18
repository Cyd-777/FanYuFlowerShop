import type { GoodsUnit } from './goods'

/** 购物车行：加购时写入服务端校验后的快照 */
export interface CartLineItem {
  /** 行唯一键：普通商品用 goodsId，定制花束用 custom: 前缀 */
  lineKey: string
  kind: 'goods' | 'custom'
  goodsId: string
  name: string
  price: number
  unit: GoodsUnit
  /** 加购时库存快照；定制行固定为 1 */
  stock: number
  image: string
  count: number
  checked: boolean
  /** 定制花束摘要（仅 kind=custom） */
  customSummary?: string
}

export const CUSTOM_CART_GOODS_ID = 'custom-bouquet'
