import { getCloud, getCloudCallConfig, parseCloudResult } from '@/services/cloud'
import Taro from '@tarojs/taro'

const IMAGE_URL_STORAGE_PREFIX = 'fyfs:img:cache:v2:'
/** @deprecated 旧版缓存，读取时迁移 */
const IMAGE_URL_LEGACY_STORAGE_PREFIX = 'fyfs:img:base:v1:'
/** 云临时链接有效期约 2h，本地缓存略短以便后台刷新 */
const IMAGE_URL_TTL_MS = 100 * 60 * 1000
/** 全局计数器：每次 App onShow 递增，通知组件刷新过期链接 */
let appResumeCount = 0

/** 获取当前 App 激活计数（用于组件判断是否需要刷新） */
export function getAppResumeCount() {
  return appResumeCount
}

/** App 切前台时调一次，通知 GoodsImage 重新检查链接有效性 */
export function notifyAppResume() {
  appResumeCount += 1
}
const FILE_URL_BATCH_SIZE = 50

interface ResolveFileUrlsResult {
  success: boolean
  urls?: Record<string, string>
  versions?: unknown
  errMsg?: string
}

interface ImageUrlCacheEntry {
  url: string
  cachedAt: number
}

export function isCloudFileId(value: string) {
  return /^cloud:\/\//.test(value)
}

function imageUrlStorageKey(fileId: string) {
  return `${IMAGE_URL_STORAGE_PREFIX}${encodeURIComponent(fileId)}`
}

function legacyStorageKey(fileId: string) {
  return `${IMAGE_URL_LEGACY_STORAGE_PREFIX}${encodeURIComponent(fileId)}`
}

/** 读取 fileId 的本地缓存 HTTPS URL */
export function readCachedImageUrl(fileId: string): string {
  if (!fileId || !isCloudFileId(fileId)) return ''

  try {
    const raw = wx.getStorageSync(imageUrlStorageKey(fileId)) as ImageUrlCacheEntry | undefined
    if (raw?.url && typeof raw.cachedAt === 'number' && Date.now() - raw.cachedAt <= IMAGE_URL_TTL_MS) {
      return raw.url
    }

    // 旧版缓存迁移
    const legacy = wx.getStorageSync(legacyStorageKey(fileId)) as { url?: string; cachedAt?: number } | undefined
    if (legacy?.url && typeof legacy.cachedAt === 'number' && Date.now() - legacy.cachedAt <= IMAGE_URL_TTL_MS) {
      writeCachedImageUrl(fileId, legacy.url)
      return legacy.url
    }
  } catch {
    return ''
  }

  return ''
}

function writeCachedImageUrl(fileId: string, url: string) {
  if (!fileId || !url || !isCloudFileId(fileId)) return
  try {
    wx.setStorageSync(imageUrlStorageKey(fileId), {
      url,
      cachedAt: Date.now(),
    } satisfies ImageUrlCacheEntry)
  } catch (err) {
    console.warn('[goodsImage] cache url failed:', fileId, err)
  }
}

function isFunctionNotFoundError(err: unknown) {
  const msg = [
    (err as { errMsg?: string })?.errMsg,
    (err as { message?: string })?.message,
    String(err),
  ]
    .filter(Boolean)
    .join(' ')
  return msg.includes('FUNCTION_NOT_FOUND') || msg.includes('-501000')
}

async function callResolveFileUrls(
  functionName: string,
  batch: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const res = await getCloud().callFunction({
    name: functionName,
    data: { action: 'resolveFileUrls', fileList: batch },
    ...(getCloudCallConfig() ? { config: getCloudCallConfig() } : {}),
  })
  const result = parseCloudResult<ResolveFileUrlsResult>(res.result)
  if (!result.success) {
    throw new Error(result.errMsg || `${functionName} resolveFileUrls failed`)
  }
  if (result.versions != null && result.urls == null) {
    throw new Error(`${functionName} 云函数版本过旧，请重新部署以支持 resolveFileUrls`)
  }
  Object.entries(result.urls || {}).forEach(([id, url]) => {
    if (url) map.set(id, url)
  })
  return map
}

async function resolveCloudImageUrlsViaFunction(fileIds: string[]) {
  const map = new Map<string, string>()
  const uniqueIds = [...new Set(fileIds.filter(isCloudFileId))]
  if (!uniqueIds.length) return map

  let useGoodsFallback = false

  for (let i = 0; i < uniqueIds.length; i += FILE_URL_BATCH_SIZE) {
    const batch = uniqueIds.slice(i, i + FILE_URL_BATCH_SIZE)
    const targets = useGoodsFallback ? ['goods'] : ['meta', 'goods']

    let batchResolved = false
    for (const functionName of targets) {
      try {
        const batchMap = await callResolveFileUrls(functionName, batch)
        batchMap.forEach((url, fileId) => map.set(fileId, url))
        batchResolved = true
        if (functionName === 'goods') useGoodsFallback = true
        break
      } catch (err) {
        if (functionName === 'meta' && isFunctionNotFoundError(err)) {
          useGoodsFallback = true
          continue
        }
        console.warn(`[goodsImage] ${functionName} resolveFileUrls failed:`, err)
      }
    }

    if (!batchResolved) {
      console.error('[goodsImage] resolveFileUrls exhausted for batch:', batch.length)
    }
  }

  return map
}

/** 上传者本人可读时的客户端兜底（如云函数未部署） */
async function resolveCloudImageUrlsViaClient(fileIds: string[]) {
  const map = new Map<string, string>()
  const uniqueIds = [...new Set(fileIds.filter(isCloudFileId))]
  if (!uniqueIds.length) return map

  for (let i = 0; i < uniqueIds.length; i += FILE_URL_BATCH_SIZE) {
    const batch = uniqueIds.slice(i, i + FILE_URL_BATCH_SIZE)
    try {
      const res = await getCloud().getTempFileURL({ fileList: batch })
      res.fileList.forEach((item) => {
        if (item.fileID && item.tempFileURL) {
          map.set(item.fileID, item.tempFileURL)
        }
      })
    } catch (err) {
      console.error('[goodsImage] client getTempFileURL failed:', err)
    }
  }

  return map
}

async function fetchCloudImageUrls(fileIds: string[]) {
  const map = await resolveCloudImageUrlsViaFunction(fileIds)
  const missing = fileIds.filter((fileId) => isCloudFileId(fileId) && !map.has(fileId))
  if (!missing.length) return map

  const fallback = await resolveCloudImageUrlsViaClient(missing)
  fallback.forEach((url, fileId) => map.set(fileId, url))
  return map
}

function cacheResolvedUrls(map: Map<string, string>) {
  map.forEach((url, fileId) => writeCachedImageUrl(fileId, url))
}

/** 单个 fileId → HTTPS URL（优先本地缓存） */
export async function resolveCloudImageUrl(fileId: string): Promise<string> {
  if (!fileId) return ''
  if (!isCloudFileId(fileId)) return fileId

  const cached = readCachedImageUrl(fileId)
  if (cached) return cached

  const map = await fetchCloudImageUrls([fileId])
  const url = map.get(fileId) || ''
  if (url) writeCachedImageUrl(fileId, url)
  return url
}

/** 批量 fileId → HTTPS URL 映射 */
export async function resolveCloudImageMap(fileIds: string[]) {
  const uniqueIds = [...new Set(fileIds.filter(isCloudFileId))]
  const map = new Map<string, string>()
  const needFetch: string[] = []

  for (const fileId of uniqueIds) {
    const cached = readCachedImageUrl(fileId)
    if (cached) {
      map.set(fileId, cached)
    } else {
      needFetch.push(fileId)
    }
  }

  if (needFetch.length) {
    const fetched = await fetchCloudImageUrls(needFetch)
    cacheResolvedUrls(fetched)
    fetched.forEach((url, fileId) => map.set(fileId, url))
  }

  return map
}

/** 从标准 HTTPS URL 推导 160px 缩略图 URL（imageMogr2 参数） */
export function derivePreviewUrl(standardUrl: string): string {
  const url = (standardUrl || '').trim()
  if (!url || !/^https?:\/\//.test(url)) return ''
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}imageMogr2/thumbnail/160x/quality/25/format/webp`
}

/** 顾客端公开数据：云函数已换链的封面 HTTPS（同一资源） */
export function pickPublicCoverUrl(item: {
  coverImage?: string
  coverImageUrl?: string
  standardImageUrl?: string
  previewImageUrl?: string
  images?: string[]
  imageUrls?: string[]
}) {
  return item.standardImageUrl || item.coverImageUrl || item.imageUrls?.[0] || ''
}

/** 顾客端缩略图 HTTPS */
export function pickPublicPreviewUrl(item: {
  previewImageUrl?: string
  coverImageUrl?: string
  imageUrls?: string[]
}): string {
  return item.previewImageUrl || derivePreviewUrl(item.coverImageUrl || item.imageUrls?.[0] || '')
}

/** 顾客端展示 URL：优先云端 HTTPS，其次 cloud:// */
export function pickDisplayImageForGoods(item: {
  coverImage?: string
  coverImageUrl?: string
  standardImageUrl?: string
  images?: string[]
  imageUrls?: string[]
}) {
  const https = pickPublicCoverUrl(item)
  if (https) return https
  const fileId = pickCoverFileId(item)
  if (isCloudFileId(fileId)) return fileId
  if (/^https?:\/\//.test(fileId)) return fileId
  return ''
}

export function pickPublicImageUrls(item: {
  coverImage?: string
  coverImageUrl?: string
  images?: string[]
  imageUrls?: string[]
}) {
  if (item.imageUrls?.length) {
    return item.imageUrls.filter(Boolean)
  }
  const cover = pickDisplayImageForGoods(item)
  return cover ? [cover] : []
}

export function pickCoverFileId(item: { coverImage?: string; images?: string[] }) {
  return item.coverImage || item.images?.[0] || ''
}

/** 同步从本地缓存还原封面 URL，供有业务缓存时首屏直出 */
export function attachGoodsCoverImagesFromCache<
  T extends { coverImage?: string; coverImageUrl?: string; images?: string[]; imageUrls?: string[]; previewImageUrl?: string; standardImageUrl?: string },
>(list: T[]): Array<T & { imageUrl: string; previewUrl: string }> {
  return list.map((item) => {
    const url = pickPublicCoverUrl(item) || item.coverImageUrl || pickCoverFileId(item)
    const prevUrl = pickPublicPreviewUrl(item) || derivePreviewUrl(url)
    return {
      ...item,
      imageUrl: url,
      previewUrl: prevUrl,
    }
  })
}

/** 异步解决列表封面 URL：优先 item 自带的 coverImageUrl/imageUrls，不足时批量换链 */
export async function attachGoodsCoverImages<
  T extends {
    _id?: string
    coverImage?: string
    coverImageUrl?: string
    images?: string[]
    imageUrls?: string[]
    previewImageUrl?: string
    standardImageUrl?: string
  },
>(
  list: T[],
  previous?: Array<T & { imageUrl?: string }>,
): Promise<Array<T & { imageUrl: string; previewUrl: string }>> {
  const prevById = new Map(
    (previous || [])
      .filter((item) => item._id)
      .map((item) => [item._id as string, item]),
  )

  const needResolve = list.filter((item) => !pickDisplayImageForGoods(item))
  let imageMap = new Map<string, string>()

  if (needResolve.length) {
    try {
      imageMap = await Promise.race([
        resolveCloudImageMap(needResolve.map(pickCoverFileId)),
        new Promise<Map<string, string>>((resolve) => {
          setTimeout(() => resolve(new Map()), 8000)
        }),
      ])
    } catch (err) {
      console.error('[goodsImage] resolve failed:', err)
    }
  }

  return list.map((item) => {
    const publicUrl = pickDisplayImageForGoods(item)
    const fileId = pickCoverFileId(item)
    const prev = item._id ? prevById.get(item._id) : undefined
    const prevFileId = prev ? pickCoverFileId(prev) : ''
    let imageUrl = publicUrl || imageMap.get(fileId) || ''

    if (!imageUrl && prev && fileId === prevFileId && prev.imageUrl) {
      imageUrl = prev.imageUrl
    }

    const prevUrl = item.previewImageUrl || derivePreviewUrl(imageUrl)

    return { ...item, imageUrl, previewUrl: prevUrl }
  })
}

/** 商品列表项是否缺乏云端已换链的 coverImageUrl */
export function goodsListMissingPublicImageUrls(list: Array<{
  coverImage?: string
  coverImageUrl?: string
  images?: string[]
  imageUrls?: string[]
}>) {
  return list.some((item) => !item.coverImageUrl && !item.imageUrls?.length)
}

/**
 * 任意 cloud:// 文件 → 本地可展示路径。
 * 仅作为头像等兜底使用；商品图应走 resolveCloudImageUrl 换链。
 */
export async function resolveImageDisplayPath(raw: string): Promise<string> {
  const trimmed = (raw || '').trim()
  if (!trimmed || !isCloudFileId(trimmed)) return ''
  try {
    const { tempFilePath } = await Taro.downloadFile({ url: trimmed })
    return tempFilePath
  } catch {
    return ''
  }
}
