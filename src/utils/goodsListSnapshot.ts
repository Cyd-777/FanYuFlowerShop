import { pickCoverFileId } from '@/utils/goodsImage'
import { mergeGoodsLivePatch } from '@/utils/goodsLiveMerge'
import type { Goods } from '@/types/goods'

export type GoodsCardSnapshot = {
  _id: string
  name?: string
  price?: number
  stock?: number
  onSale?: boolean
  recommend?: boolean
  listedAt?: string
  coverImage?: string
  coverImageUrl?: string
  images?: string[]
  imageUrl?: string
}

/** 单张商品卡片展示字段是否一致 */
export function isSameGoodsCardSnapshot<T extends GoodsCardSnapshot>(next: T, current: T) {
  return (
    next._id === current._id
    && next.name === current.name
    && next.price === current.price
    && next.stock === current.stock
    && next.onSale === current.onSale
    && next.recommend === current.recommend
    && (next.listedAt || '') === (current.listedAt || '')
    && (next.coverImageUrl || '') === (current.coverImageUrl || '')
    && pickCoverFileId(next) === pickCoverFileId(current)
    && (next.imageUrl || '') === (current.imageUrl || '')
  )
}

/** 列表展示层字段未变时跳过整表替换，避免卡片闪动 */
export function isSameGoodsListSnapshot<T extends GoodsCardSnapshot>(next: T[], current: T[]) {
  if (next.length !== current.length) return false
  return next.every((item, index) => {
    const prev = current[index]
    if (!prev) return false
    return isSameGoodsCardSnapshot(item, prev)
  })
}

/** 按 _id 合并补丁，仅替换有变化的卡片 */
export function mergeGoodsListById<T extends Goods & { imageUrl?: string }>(
  current: T[],
  patches: Array<Goods & { imageUrl?: string }>,
  options?: {
    /** 请求了但未返回（如下架）的 id，从列表移除 */
    missingIds?: string[]
  },
): T[] {
  const missing = new Set(options?.missingIds || [])
  const patchMap = new Map(patches.map((item) => [item._id, item]))
  let changed = false

  const next = current
    .filter((item) => {
      if (!missing.has(item._id)) return true
      changed = true
      return false
    })
    .map((item) => {
      const patch = patchMap.get(item._id)
      if (!patch) return item

      const merged = {
        ...item,
        ...patch,
        imageUrl: patch.imageUrl || item.imageUrl,
      } as T

      const { item: patched, changed: fieldChanged } = mergeGoodsLivePatch(item, merged)
      if (!fieldChanged) return item

      changed = true
      return patched
    })

  return changed ? next : current
}

/** 分页索引合并：保留顺序，追加新 id，同 id 则浅合并更新 */
export function appendPublicGoodsIndexPage<T extends Goods>(
  current: T[],
  incoming: T[],
): T[] {
  if (!incoming.length) return current
  if (!current.length) return [...incoming]

  const indexById = new Map(current.map((item, index) => [item._id, index]))
  const next = [...current]

  for (const item of incoming) {
    const idx = indexById.get(item._id)
    if (idx !== undefined) {
      next[idx] = { ...next[idx], ...item }
    } else {
      indexById.set(item._id, next.length)
      next.push(item)
    }
  }

  return next
}
