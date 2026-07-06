/**
 * 销售策略模块 · 公开 API
 * @see docs/销售策略模块-API.md
 */

// 主题预设类型（来自 shopTheme 常量模块）
export type { ShopThemeId } from '@/types/shopTheme'
export { SHOP_THEME_PRESETS, getShopThemePreset, resolveActiveTheme } from '@/types/shopTheme'

// 促销折扣类型（来自 shop 配置）
export type { ShopThemeConfig, ThemeDiscountRule } from '@/types/shop'

// 主题保存操作（经 shop 模块）
export { saveThemeConfig, setActiveTheme } from '@/modules/shop'
