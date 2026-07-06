/**
 * 店铺设置模块 · 公开 API（读路径）
 * @see docs/店铺设置模块-API.md
 */

export type { ShopDecoration, ShopSettings, ShopThemeConfig, ThemeDiscountRule } from '@/types/shop'

export { fetchShopSettings, fetchShopSettingsCached } from './client'
