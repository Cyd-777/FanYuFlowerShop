import { getCloud, getCloudCallConfig } from './cloud'
import { invalidateCacheModule, loadWithCache } from '@/utils/cache'
import type { LoadWithCacheResult } from '@/utils/cache/loadWithCache'
import type { ShopSettings, ShopThemeConfig } from '@/types/shop'
import type { ShopThemeId } from '@/types/shopTheme'

const SHOP_SETTINGS_CACHE_KEY = 'shop:settings'

interface ShopCloudResult {
  success: boolean
  errMsg?: string
  settings?: ShopSettings
}

async function callShop<T = ShopCloudResult>(data: Record<string, unknown>): Promise<T> {
  const cloud = getCloud()
  const config = getCloudCallConfig()

  const res = await cloud.callFunction({
    name: 'shop',
    data,
    ...(config ? { config } : {}),
  })

  return res.result as T
}

export async function fetchShopSettings(): Promise<ShopSettings> {
  const result = await callShop({ action: 'get' })
  if (!result.success || !result.settings) {
    throw new Error(result.errMsg || '获取店铺设置失败')
  }
  return result.settings
}

export async function fetchShopSettingsCached(options?: {
  force?: boolean
  onUpdate?: (settings: ShopSettings) => void
}): Promise<LoadWithCacheResult<ShopSettings>> {
  return loadWithCache({
    module: 'shop',
    cacheKey: SHOP_SETTINGS_CACHE_KEY,
    fetcher: () => fetchShopSettings(),
    force: options?.force,
    onUpdate: options?.onUpdate,
  })
}

export async function saveShopSettings(settings: ShopSettings): Promise<ShopSettings> {
  const result = await callShop({ action: 'update', settings })
  if (!result.success || !result.settings) {
    throw new Error(result.errMsg || '保存店铺设置失败')
  }
  invalidateCacheModule('shop')
  return result.settings
}

export async function saveThemeConfig(
  themeId: ShopThemeId,
  config: ShopThemeConfig,
): Promise<ShopSettings> {
  const result = await callShop({ action: 'saveThemeConfig', themeId, config })
  if (!result.success || !result.settings) {
    throw new Error(result.errMsg || '保存主题装潢失败')
  }
  invalidateCacheModule('shop')
  return result.settings
}

export async function setActiveTheme(themeId: ShopThemeId): Promise<ShopSettings> {
  const result = await callShop({ action: 'setActiveTheme', themeId })
  if (!result.success || !result.settings) {
    throw new Error(result.errMsg || '切换主题失败')
  }
  invalidateCacheModule('shop')
  return result.settings
}
