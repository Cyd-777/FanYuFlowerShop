import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { DEFAULT_SHOP_NAME, STORAGE_KEYS } from '@/utils/constants'
import {
  saveShopSettings,
  saveThemeConfig,
  setActiveTheme,
} from '@/modules/shop'
import { fetchShopSettingsCached } from '@/modules/shop'
import { CACHE_KEYS } from '@/data/cacheKeys'
import { hasCacheEntry } from '@/utils/cache'
import type { ShopSettings, ShopDecoration, ShopThemeConfig } from '@/types/shop'
import { DEFAULT_SHOP_DECORATION } from '@/types/shop'
import type { ShopThemeId } from '@/types/shopTheme'

export type { ShopSettings } from '@/types/shop'

export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  shopName: DEFAULT_SHOP_NAME,
  phone: '',
  openTime: '09:00',
  closeTime: '21:00',
  deliveryNote: '',
  decoration: { ...DEFAULT_SHOP_DECORATION, themeConfigs: {} },
}

function normalizeDecoration(raw?: Partial<ShopDecoration>): ShopDecoration {
  return {
    activeThemeId: raw?.activeThemeId || DEFAULT_SHOP_DECORATION.activeThemeId,
    themeConfigs: raw?.themeConfigs ? { ...raw.themeConfigs } : {},
  }
}

function readLocalSettings(): ShopSettings {
  const cached = wx.getStorageSync(STORAGE_KEYS.ShopSettings)
  if (!cached) return { ...DEFAULT_SHOP_SETTINGS }
  return {
    ...DEFAULT_SHOP_SETTINGS,
    ...cached,
    decoration: normalizeDecoration(cached.decoration),
  }
}

function writeLocalSettings(settings: ShopSettings) {
  wx.setStorageSync(STORAGE_KEYS.ShopSettings, settings)
}

export const useShopStore = defineStore('shop', () => {
  const settings = ref<ShopSettings>(readLocalSettings())
  const loading = ref(false)

  const shopName = computed(() => settings.value.shopName || DEFAULT_SHOP_NAME)

  async function hydrate(options?: { force?: boolean }) {
    settings.value = readLocalSettings()

    const cacheKey = CACHE_KEYS.shopSettings
    loading.value = options?.force ? true : !hasCacheEntry(cacheKey)
    try {
      const { data } = await fetchShopSettingsCached({
        force: options?.force,
        onUpdate: (remote) => {
          settings.value = {
            ...remote,
            decoration: normalizeDecoration(remote.decoration),
          }
          writeLocalSettings(settings.value)
        },
      })
      settings.value = {
        ...data,
        decoration: normalizeDecoration(data.decoration),
      }
      writeLocalSettings(settings.value)
    } catch (err) {
      console.error('[shop] hydrate failed:', err)
    } finally {
      loading.value = false
    }
  }

  async function updateSettings(partial: Partial<ShopSettings>) {
    const next: ShopSettings = {
      ...settings.value,
      ...partial,
      decoration: normalizeDecoration({
        ...settings.value.decoration,
        ...partial.decoration,
      }),
    }
    const saved = await saveShopSettings(next)
    settings.value = {
      ...saved,
      decoration: normalizeDecoration(saved.decoration),
    }
    writeLocalSettings(settings.value)
    return settings.value
  }

  async function saveTheme(themeId: ShopThemeId, config: ShopThemeConfig) {
    const saved = await saveThemeConfig(themeId, config)
    settings.value = {
      ...saved,
      decoration: normalizeDecoration(saved.decoration),
    }
    writeLocalSettings(settings.value)
    return settings.value
  }

  async function activateTheme(themeId: ShopThemeId) {
    const saved = await setActiveTheme(themeId)
    settings.value = {
      ...saved,
      decoration: normalizeDecoration(saved.decoration),
    }
    writeLocalSettings(settings.value)
    return settings.value
  }

  return {
    settings,
    shopName,
    loading,
    hydrate,
    updateSettings,
    saveTheme,
    activateTheme,
  }
})
