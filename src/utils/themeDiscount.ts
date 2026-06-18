import type { ShopDecoration } from '@/types/shop'

/** 获取商品在当前激活主题下的折扣率（无折扣返回 null） */
export function getThemeDiscountRate(
  goodsId: string,
  decoration: ShopDecoration,
): number | null {
  const config = decoration.themeConfigs[decoration.activeThemeId]
  if (!config?.discounts?.length) return null

  for (const rule of config.discounts) {
    if (rule.goodsIds.includes(goodsId)) {
      return rule.rate
    }
  }
  return null
}

export function applyDiscountPrice(price: number, rate: number): number {
  return Math.round(price * rate * 100) / 100
}
