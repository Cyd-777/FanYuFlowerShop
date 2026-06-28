import { goodsRepository, wikiRepository, categoriesRepository } from '@/data/repository'
import { cacheSyncScheduler } from '@/data/scheduler/CacheSyncScheduler'
import { pickCoverFileId, readCachedImageUrl, resolveCloudImageMap } from '@/utils/goodsImage'

let aggressiveRunning = false

/**
 * P0 完成后拉满预取：全量索引、百科 detail 队列、商品 detail 队列、cover URL batch 换链。
 * 重复调用安全（Repository SWR + scheduler manifest 去重）。
 */
export function startAggressivePrefetch() {
  if (aggressiveRunning) return
  aggressiveRunning = true

  void (async () => {
    try {
      const [goodsRes, wikiRes] = await Promise.all([
        goodsRepository.ensurePublicList({}),
        wikiRepository.ensurePublicList({}),
      ])

      wikiRepository.afterListLoaded(wikiRes.data)

      const goodsIds = goodsRes.data.map((item) => item._id).filter(Boolean)
      if (goodsIds.length) {
        goodsRepository.scheduleGoodsDetailPrefetch(goodsIds)
      }

      void batchResolveGoodsCoverUrls(goodsRes.data)

      void categoriesRepository.ensurePublicList({}).catch((err) => {
        console.warn('[prefetch] categories warm failed:', err)
      })

      cacheSyncScheduler.kickIdleWorkerNow()
    } catch (err) {
      console.warn('[prefetch] aggressive prefetch failed:', err)
    } finally {
      aggressiveRunning = false
    }
  })()
}

async function batchResolveGoodsCoverUrls(
  list: Array<{ coverImage?: string; images?: string[]; coverImageUrl?: string }>,
) {
  const fileIds = list.map(pickCoverFileId).filter(Boolean)
  const needFetch = fileIds.filter((id) => !readCachedImageUrl(id))

  // 预热已有缓存的图片
  for (const id of fileIds) {
    const cached = readCachedImageUrl(id)
    if (cached) wx.getImageInfo({ src: cached }).catch(() => {/* ignore */})
  }

  if (!needFetch.length) return
  try {
    const map = await resolveCloudImageMap(needFetch)
    map.forEach((url) => {
      if (url) wx.getImageInfo({ src: url }).catch(() => {/* ignore */})
    })
  } catch (err) {
    console.warn('[prefetch] batch cover urls failed:', err)
  }
}
