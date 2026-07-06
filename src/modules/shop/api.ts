/**
 * 店铺设置模块 · 公开 API
 * @see docs/店铺设置模块-API.md
 */

export type { ShopDecoration, ShopSettings, ShopThemeConfig, ThemeDiscountRule } from '@/types/shop'

export {
  fetchShopSettings,
  fetchShopSettingsCached,
  saveShopSettings,
  saveThemeConfig,
  setActiveTheme,
} from './client'
