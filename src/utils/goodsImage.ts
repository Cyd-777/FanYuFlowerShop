import { getCloud, getCloudCallConfig, parseCloudResult } from '@/services/cloud'
import type { Goods } from '@/types/goods'

const IMAGE_URL_STORAGE_PREFIX = 'fyfs:img:v1:'
/** 云临时链接有效期约 2h，本地缓存略短以便后台刷新 */
const IMAGE_URL_TTL_MS = 90 * 60 * 1000
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

export function readCachedImageUrl(fileId: string): string {
  if (!fileId) return ''
  if (!isCloudFileId(fileId)) return fileId

  try {
    const raw = wx.getStorageSync(imageUrlStorageKey(fileId)) as ImageUrlCacheEntry | undefined
    if (!raw?.url || typeof raw.cachedAt !== 'number') return ''
    if (Date.now() - raw.cachedAt > IMAGE_URL_TTL_MS) return ''
    return raw.url
  } catch {
    return ''
  }
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
  // 云端 meta 未重新部署时，带 action 仍会走旧逻辑只返回 versions
  if (result.versions != null && result.urls == null) {
    throw new Error(`${functionName} 云函数版本过旧，请重新部署以支持 resolveFileUrls`)
  }
  Object.entries(result.urls || {}).forEach(([fileId, url]) => {
    if (url) map.set(fileId, url)
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
    fetched.forEach((url, fileId) => map.set(fileId, url))
    cacheResolvedUrls(fetched)
  }

  return map
}

export function pickDisplayImage(fileId: string, map: Map<string, string>) {
  if (!fileId) return ''
  if (!isCloudFileId(fileId)) return fileId
  return map.get(fileId) || readCachedImageUrl(fileId) || ''
}

export function pickCoverFileId(item: { coverImage?: string; images?: string[] }) {
  return item.coverImage || item.images?.[0] || ''
}

/** 顾客端公开数据优先用云函数已换好的 HTTPS */
export function pickPublicCoverUrl(item: {
  coverImage?: string
  coverImageUrl?: string
  images?: string[]
  imageUrls?: string[]
}) {
  if (item.coverImageUrl) return item.coverImageUrl
  if (item.imageUrls?.length) return item.imageUrls[0]
  return ''
}

/** 顾客端展示 URL：优先云端 HTTPS，其次 cloud://（需存储「所有用户可读」） */
export function pickDisplayImageForGoods(item: {
  coverImage?: string
  coverImageUrl?: string
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

function resolveCoverImageUrlSync(
  item: { coverImage?: string; images?: string[] },
  map: Map<string, string>,
) {
  const fileId = pickCoverFileId(item)
  return pickDisplayImage(fileId, map)
}

/** 同步从本地缓存还原封面 URL，供有业务缓存时首屏直出 */
export function attachGoodsCoverImagesFromCache<
  T extends { coverImage?: string; coverImageUrl?: string; images?: string[]; imageUrls?: string[] },
>(list: T[]): Array<T & { imageUrl: string }> {
  const map = new Map<string, string>()
  return list.map((item) => ({
    ...item,
    imageUrl: pickDisplayImageForGoods(item) || resolveCoverImageUrlSync(item, map),
  }))
}

export async function attachGoodsCoverImages<
  T extends {
    _id?: string
    coverImage?: string
    coverImageUrl?: string
    images?: string[]
    imageUrls?: string[]
  },
>(
  list: T[],
  previous?: Array<T & { imageUrl?: string }>,
): Promise<Array<T & { imageUrl: string }>> {
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
    let imageUrl = publicUrl || pickDisplayImage(fileId, imageMap)

    if (!imageUrl && prev && fileId === prevFileId && prev.imageUrl) {
      imageUrl = prev.imageUrl
    }

    return {
      ...item,
      imageUrl: imageUrl || publicUrl,
    }
  })
}

/** 旧缓存只有 cloud://、没有 coverImageUrl 时需要重新拉公开列表 */
export function goodsListMissingPublicImageUrls(
  list: Array<Pick<Goods, 'coverImage' | 'coverImageUrl' | 'images'>>,
) {
  if (!Array.isArray(list) || !list.length) return false
  return list.some((item) => {
    const fileId = pickCoverFileId(item)
    if (!isCloudFileId(fileId)) return false
    return !pickPublicCoverUrl(item)
  })
}

const displayPathCache = new Map<string, string>()
const proxyLocalPathCache = new Map<string, string>()

function fileExtFromCloudId(fileId: string) {
  const lower = fileId.toLowerCase()
  if (lower.endsWith('.png')) return 'png'
  if (lower.endsWith('.webp')) return 'webp'
  if (lower.endsWith('.gif')) return 'gif'
  return 'jpg'
}

/** 代理图本地文件名：必须用完整 fileId 哈希，截断前缀在同一云环境下会撞名导致图片污染 */
function proxyLocalFileName(fileId: string, ext: string) {
  let hash = 5381
  for (let i = 0; i < fileId.length; i += 1) {
    hash = ((hash << 5) + hash) ^ fileId.charCodeAt(i)
  }
  return `fyfs-proxy-${(hash >>> 0).toString(36)}.${ext}`
}

interface PublicImageResult {
  success: boolean
  mime?: string
  base64?: string
  errMsg?: string
}

/** 云函数管理员权限读取「仅创建者可读」存储，写入本地临时文件供 image 展示 */
export async function fetchPublicImageLocalPath(fileId: string): Promise<string> {
  if (!isCloudFileId(fileId)) return ''

  const cached = proxyLocalPathCache.get(fileId)
  if (cached) return cached

  try {
    const res = await getCloud().callFunction({
      name: 'goods',
      data: { action: 'publicImage', fileId },
      ...(getCloudCallConfig() ? { config: getCloudCallConfig() } : {}),
    })
    const result = parseCloudResult<PublicImageResult>(res.result)
    if (!result.success || !result.base64) {
      console.warn('[goodsImage] publicImage failed:', result.errMsg || fileId.slice(0, 80))
      return ''
    }

    const ext = fileExtFromCloudId(fileId)
    const filePath = `${wx.env.USER_DATA_PATH}/${proxyLocalFileName(fileId, ext)}`

    await new Promise<void>((resolve, reject) => {
      wx.getFileSystemManager().writeFile({
        filePath,
        data: result.base64 as string,
        encoding: 'base64',
        success: () => resolve(),
        fail: (err) => reject(err),
      })
    })

    proxyLocalPathCache.set(fileId, filePath)
    displayPathCache.set(fileId, filePath)
    return filePath
  } catch (err) {
    console.warn('[goodsImage] publicImage call failed:', err)
    return ''
  }
}

function isLocalDisplayPath(value: string) {
  return (
    value.startsWith('wxfile://')
    || value.startsWith('http://usr/')
    || value.startsWith('https://usr/')
  )
}

/** 真机展示：HTTPS / cloud:// 先 download 到本地路径，避免部分环境下直连失败 */
export function resolveImageDisplayPath(src: string): Promise<string> {
  const trimmed = src.trim()
  if (!trimmed) return Promise.resolve('')
  if (isLocalDisplayPath(trimmed)) return Promise.resolve(trimmed)

  const cached = displayPathCache.get(trimmed)
  if (cached) return Promise.resolve(cached)

  if (isCloudFileId(trimmed)) {
    return new Promise((resolve) => {
      wx.cloud.downloadFile({
        fileID: trimmed,
        success: (res) => {
          if (res.tempFilePath) displayPathCache.set(trimmed, res.tempFilePath)
          resolve(res.tempFilePath || '')
        },
        fail: (err) => {
          console.warn('[goodsImage] cloud.downloadFile failed:', err.errMsg || err)
          void fetchPublicImageLocalPath(trimmed).then(resolve)
        },
      })
    })
  }

  if (/^https?:\/\//.test(trimmed)) {
    return new Promise((resolve) => {
      wx.downloadFile({
        url: trimmed,
        success: (res) => {
          const path = res.statusCode === 200 ? res.tempFilePath : ''
          if (path) displayPathCache.set(trimmed, path)
          if (!path) {
            console.warn('[goodsImage] downloadFile bad status:', res.statusCode, trimmed.slice(0, 100))
          }
          resolve(path)
        },
        fail: (err) => {
          console.warn('[goodsImage] downloadFile failed:', err.errMsg || err, trimmed.slice(0, 100))
          const cloudId = isCloudFileId(trimmed) ? trimmed : ''
          if (cloudId) {
            void fetchPublicImageLocalPath(cloudId).then(resolve)
            return
          }
          resolve('')
        },
      })
    })
  }

  return Promise.resolve(trimmed)
}
