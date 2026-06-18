import { getCloud } from '@/services/cloud'

export function isCloudFileId(value: string) {
  return /^cloud:\/\//.test(value)
}

export async function resolveCloudImageUrl(fileId: string): Promise<string> {
  if (!fileId) return ''
  if (!isCloudFileId(fileId)) return fileId

  const res = await getCloud().getTempFileURL({ fileList: [fileId] })
  return res.fileList[0]?.tempFileURL || ''
}

export async function resolveCloudImageMap(fileIds: string[]) {
  const uniqueIds = [...new Set(fileIds.filter(isCloudFileId))]
  const map = new Map<string, string>()

  if (!uniqueIds.length) return map

  const res = await getCloud().getTempFileURL({ fileList: uniqueIds })
  res.fileList.forEach((item) => {
    if (item.fileID && item.tempFileURL) {
      map.set(item.fileID, item.tempFileURL)
    }
  })

  return map
}

export function pickDisplayImage(fileId: string, map: Map<string, string>) {
  if (!fileId) return ''
  if (!isCloudFileId(fileId)) return fileId
  return map.get(fileId) || ''
}

export function pickCoverFileId(item: { coverImage?: string; images?: string[] }) {
  return item.coverImage || item.images?.[0] || ''
}

export async function attachGoodsCoverImages<T extends { coverImage?: string; images?: string[] }>(
  list: T[],
): Promise<(T & { imageUrl: string })[]> {
  const base = list.map((item) => ({
    ...item,
    imageUrl: '',
  }))

  let imageMap = new Map<string, string>()
  try {
    imageMap = await Promise.race([
      resolveCloudImageMap(list.map(pickCoverFileId)),
      new Promise<Map<string, string>>((resolve) => {
        setTimeout(() => resolve(new Map()), 8000)
      }),
    ])
  } catch (err) {
    console.error('[goodsImage] resolve failed:', err)
  }

  return base.map((item, index) => ({
    ...item,
    imageUrl: pickDisplayImage(pickCoverFileId(list[index]), imageMap),
  }))
}
