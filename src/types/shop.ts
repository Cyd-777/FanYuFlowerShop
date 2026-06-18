import type { ShopThemeId } from './shopTheme'

export interface ThemeDiscountRule {
  id: string
  /** 折扣率，0.85 表示 8.5 折 */
  rate: number
  goodsIds: string[]
}

export interface ShopThemeConfig {
  primaryColor?: string
  headerGradient?: [string, string]
  homeSubtitle?: string
  promoTag?: string
  bannerImage?: string
  discounts?: ThemeDiscountRule[]
}

export interface ShopDecoration {
  activeThemeId: ShopThemeId
  themeConfigs: Partial<Record<ShopThemeId, ShopThemeConfig>>
}

export interface ShopSettings {
  shopName: string
  phone: string
  openTime: string
  closeTime: string
  deliveryNote: string
  decoration: ShopDecoration
}

export const DEFAULT_SHOP_DECORATION: ShopDecoration = {
  activeThemeId: 'default',
  themeConfigs: {},
}
