import { STORAGE_KEYS } from '@/utils/constants'
import { readCachedImageUrl, resolveCloudImageUrl } from '@/utils/goodsImage'
import { resolveActiveTheme } from '@/types/shopTheme'
import type { ShopSettings } from '@/types/shop'
import { goodsRepository } from '@/data/repository/goodsRepository'
import { categoriesRepository } from '@/data/repository/categoriesRepository'
import { startAggressivePrefetch } from './aggressivePrefetch'

function readLocalShopSettings(): ShopSettings | null {
  try {
    const cached = wx.getStorageSync(STORAGE_KEYS.ShopSettings) as ShopSettings | undefined
    return cached || null
  } catch {
    return null
  }
}

/** 同步读本地 decoration 里的 Banner fileId（用于占位 / 优先换链） */
export function readHomeBannerFileIds(): string[] {
  const local = readLocalShopSettings()
  if (!local?.decoration) return []
  return resolveActiveTheme(local.decoration).bannerImages.filter(Boolean)
}

async function ensureBannerImageUrls(settings: ShopSettings | null, force?: boolean) {
  const decoration = settings?.decoration
  if (!decoration) return

  const fileIds = resolveActiveTheme(decoration).bannerImages.filter(Boolean)
  if (!fileIds.length) return

  // 预热已有缓存的图片
  for (const id of fileIds) {
    const cached = readCachedImageUrl(id)
    if (cached) wx.getImageInfo({ src: cached }).catch(() => {})
  }

  const targets = force
    ? fileIds
    : fileIds.filter((id) => !readCachedImageUrl(id))
  if (!targets.length) return

  const urls = await Promise.all(
    targets.map((id) =>
      resolveCloudImageUrl(id).catch((err) => {
        console.warn('[prefetch] banner url failed:', id, err)
      }),
    ),
  )
  // 新换链的也预热
  for (const url of urls) {
    if (url) wx.getImageInfo({ src: url }).catch(() => {})
  }
}

/**
 * 首页 P0 链：100 shop → 110 banner → 120 categories → 200 recommend（不阻塞 aggressive）。
 */
export async function prefetchHomeP0Chain(options?: { force?: boolean }) {
  const force = options?.force

  const settingsResult = await shopRepository.ensureSettings({ force })
  await ensureBannerImageUrls(settingsResult.data, force)

  await categoriesRepository.ensurePublicList({ force })

  void goodsRepository
    .ensureRecommendList({ force })
    .then(({ data }) => {
      goodsRepository.scheduleGoodsDetailPrefetch(data.map((item) => item._id))
    })
    .catch((err) => {
      console.warn('[prefetch] recommend list failed:', err)
    })
}

/** 启动时：P0 链完成后再延迟拉满预取，避免与 Banner 换链抢带宽 */
export function prefetchHomeFirstScreen() {
  void prefetchHomeP0Chain()
    .catch((err) => {
      console.warn('[prefetch] home P0 chain failed:', err)
    })
    .finally(() => {
      setTimeout(() => {
        startAggressivePrefetch()
      }, 2000)
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
