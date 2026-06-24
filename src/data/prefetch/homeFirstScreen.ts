import { STORAGE_KEYS } from '@/utils/constants'
import { readCachedImageUrl, resolveCloudImageUrl } from '@/utils/goodsImage'
import { resolveActiveTheme } from '@/types/shopTheme'
import type { ShopSettings } from '@/types/shop'
import { shopRepository } from '@/data/repository/shopRepository'
import { goodsRepository } from '@/data/repository/goodsRepository'
import { categoriesRepository } from '@/data/repository/categoriesRepository'

function readLocalShopSettings(): ShopSettings | null {
  try {
    const cached = wx.getStorageSync(STORAGE_KEYS.ShopSettings) as ShopSettings | undefined
    return cached || null
  } catch {
    return null
  }
}

/** 启动时预热首页首屏数据：用户切到首页时尽量已有缓存，避免骨架/空白 */
export function prefetchHomeFirstScreen() {
  const local = readLocalShopSettings()
  if (local?.decoration) {
    const bannerIds = resolveActiveTheme(local.decoration).bannerImages
    for (const bannerId of bannerIds) {
      if (bannerId && !readCachedImageUrl(bannerId)) {
        void resolveCloudImageUrl(bannerId).catch((err) => {
          console.warn('[prefetch] banner url failed:', err)
        })
      }
    }
  }

  void shopRepository.ensureSettings({}).catch((err) => {
    console.warn('[prefetch] shop settings failed:', err)
  })

  void categoriesRepository.ensurePublicList({}).catch((err) => {
    console.warn('[prefetch] categories failed:', err)
  })

  void goodsRepository.ensureRecommendList({}).catch((err) => {
    console.warn('[prefetch] recommend list failed:', err)
  })
}

/** 同步读取本地主题 Banner 可展示 URL 列表 */
export function readCachedHomeBannerUrls(): string[] {
  const local = readLocalShopSettings()
  const fromList = local?.bannerImageUrls?.filter(Boolean)
  if (fromList?.length) return fromList
  if (local?.bannerImageUrl) return [local.bannerImageUrl]
  if (!local?.decoration) return []
  const fileIds = resolveActiveTheme(local.decoration).bannerImages
  if (!fileIds.length) return []
  return fileIds
    .map((id) => readCachedImageUrl(id))
    .filter(Boolean) as string[]
}

/** @deprecated 使用 readCachedHomeBannerUrls */
export function readCachedHomeBannerUrl(): string {
  return readCachedHomeBannerUrls()[0] || ''
}
