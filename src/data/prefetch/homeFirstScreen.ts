import { STORAGE_KEYS } from '@/utils/constants'
import { readCachedImageUrl, resolveCloudImageUrl } from '@/utils/goodsImage'
import { resolveActiveTheme } from '@/types/shopTheme'
import type { ShopSettings } from '@/types/shop'
import { shopRepository } from '@/data/repository/shopRepository'
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

async function ensureBannerImageUrls(settings: ShopSettings | null, force?: boolean) {
  const decoration = settings?.decoration
  if (!decoration) return

  const fileIds = resolveActiveTheme(decoration).bannerImages.filter(Boolean)
  if (!fileIds.length) return

  const targets = force
    ? fileIds
    : fileIds.filter((id) => !readCachedImageUrl(id))
  if (!targets.length) return

  await Promise.all(
    targets.map((id) =>
      resolveCloudImageUrl(id).catch((err) => {
        console.warn('[prefetch] banner url failed:', id, err)
      }),
    ),
  )
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

/** 启动时：P0 链完成后立即拉满预取 */
export function prefetchHomeFirstScreen() {
  void prefetchHomeP0Chain()
    .catch((err) => {
      console.warn('[prefetch] home P0 chain failed:', err)
    })
    .finally(() => {
      startAggressivePrefetch()
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
