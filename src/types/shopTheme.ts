export type ShopThemeId =
  | 'default'
  | 'valentine'
  | 'qixi'
  | 'women_day'
  | 'mother_day'
  | 'christmas'

export interface ShopThemePreset {
  id: ShopThemeId
  name: string
  emoji: string
  primaryColor: string
  headerGradient: [string, string]
  homeSubtitle: string
  promoTag: string
}

export const SHOP_THEME_PRESETS: ShopThemePreset[] = [
  {
    id: 'default',
    name: '日常营业',
    emoji: '🌷',
    primaryColor: '#e53935',
    headerGradient: ['#fce4ec', '#f8bbd0'],
    homeSubtitle: '每一束花，都是一次心动',
    promoTag: '',
  },
  {
    id: 'valentine',
    name: '情人节',
    emoji: '💝',
    primaryColor: '#c62828',
    headerGradient: ['#ffebee', '#ef9a9a'],
    homeSubtitle: '用一束花说爱你',
    promoTag: '情人节特惠',
  },
  {
    id: 'qixi',
    name: '七夕',
    emoji: '🎋',
    primaryColor: '#ad1457',
    headerGradient: ['#f3e5f5', '#e1bee7'],
    homeSubtitle: '鹊桥相会，以花传情',
    promoTag: '七夕浪漫季',
  },
  {
    id: 'women_day',
    name: '三八妇女节',
    emoji: '💐',
    primaryColor: '#d81b60',
    headerGradient: ['#fce4ec', '#f48fb1'],
    homeSubtitle: '致敬每一位美好的她',
    promoTag: '女神节献礼',
  },
  {
    id: 'mother_day',
    name: '母亲节',
    emoji: '🌸',
    primaryColor: '#ec407a',
    headerGradient: ['#fff0f3', '#f8bbd0'],
    homeSubtitle: '把温柔与感恩送给妈妈',
    promoTag: '母亲节感恩',
  },
  {
    id: 'christmas',
    name: '圣诞节',
    emoji: '🎄',
    primaryColor: '#2e7d32',
    headerGradient: ['#e8f5e9', '#a5d6a7'],
    homeSubtitle: '圣诞暖意，花礼相伴',
    promoTag: '圣诞花礼',
  },
]

export function getShopThemePreset(id: ShopThemeId): ShopThemePreset {
  return SHOP_THEME_PRESETS.find((item) => item.id === id) || SHOP_THEME_PRESETS[0]
}

export interface ResolvedShopTheme extends ShopThemePreset {
  bannerImage: string
}

/** 合并预设与商家自定义装潢配置 */
export function resolveActiveTheme(decoration: {
  activeThemeId: ShopThemeId
  themeConfigs: Partial<Record<ShopThemeId, import('./shop').ShopThemeConfig>>
}): ResolvedShopTheme {
  const preset = getShopThemePreset(decoration.activeThemeId)
  const override = decoration.themeConfigs[decoration.activeThemeId] || {}

  return {
    ...preset,
    primaryColor: override.primaryColor || preset.primaryColor,
    headerGradient: override.headerGradient || preset.headerGradient,
    homeSubtitle: override.homeSubtitle ?? preset.homeSubtitle,
    promoTag: override.promoTag ?? preset.promoTag,
    bannerImage: override.bannerImage || '',
  }
}
