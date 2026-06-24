import { pickCoverFileId } from '@/utils/goodsImage'
import type { Goods } from '@/types/goods'

/** 参与「是否与云端对齐」比较的展示 / 业务字段 */
function scalarFieldsEqual(a: unknown, b: unknown) {
  if (a === b) return true
  if (a == null && b == null) return true
  return String(a ?? '') === String(b ?? '')
}

/** 云端与本地卡片是否存在差异（有差异才需要 patch） */
export function hasGoodsLiveDiff(
  local: Goods,
  remote: Goods,
): boolean {
  if (Number(local.price) !== Number(remote.price)) return true
  if (Number(local.stock) !== Number(remote.stock)) return true
  if (local.onSale !== remote.onSale) return true
  if (local.recommend !== remote.recommend) return true
  if (!scalarFieldsEqual(local.name, remote.name)) return true
  if (!scalarFieldsEqual(local.listedAt, remote.listedAt)) return true
  if (!scalarFieldsEqual(local.createdAt, remote.createdAt)) return true
  if (!scalarFieldsEqual(local.categoryName, remote.categoryName)) return true
  if (!scalarFieldsEqual(local.flowerKindName, remote.flowerKindName)) return true
  if (!scalarFieldsEqual(local.flowerVarietyName, remote.flowerVarietyName)) return true
  if (local.salesType !== remote.salesType) return true
  if (local.unit !== remote.unit) return true
  if (pickCoverFileId(local) !== pickCoverFileId(remote)) return true
  return false
}

/**
 * 将云端 patch 合并进本地卡片：只写入有变化的字段，封面 fileId 不变则保留 imageUrl。
 */
export function mergeGoodsLivePatch<T extends Goods & { imageUrl?: string }>(
  local: T,
  remote: Goods & { imageUrl?: string },
): { item: T; changed: boolean } {
  if (!hasGoodsLiveDiff(local, remote)) {
    return { item: local, changed: false }
  }

  const next: T = { ...local }
  let changed = false

  const assign = <K extends keyof T>(key: K, value: T[K]) => {
    if (next[key] !== value) {
      next[key] = value
      changed = true
    }
  }

  if (local.name !== remote.name) assign('name', remote.name as T['name'])
  if (Number(local.price) !== Number(remote.price)) assign('price', remote.price as T['price'])
  if (Number(local.stock) !== Number(remote.stock)) assign('stock', remote.stock as T['stock'])
  if (local.onSale !== remote.onSale) assign('onSale', remote.onSale as T['onSale'])
  if (local.recommend !== remote.recommend) assign('recommend', remote.recommend as T['recommend'])
  if ((local.listedAt || '') !== (remote.listedAt || '')) assign('listedAt', remote.listedAt as T['listedAt'])
  if ((local.createdAt || '') !== (remote.createdAt || '')) assign('createdAt', remote.createdAt as T['createdAt'])
  if ((local.categoryName || '') !== (remote.categoryName || '')) {
    assign('categoryName', remote.categoryName as T['categoryName'])
  }
  if ((local.flowerKindName || '') !== (remote.flowerKindName || '')) {
    assign('flowerKindName', remote.flowerKindName as T['flowerKindName'])
  }
  if ((local.flowerVarietyName || '') !== (remote.flowerVarietyName || '')) {
    assign('flowerVarietyName', remote.flowerVarietyName as T['flowerVarietyName'])
  }
  if (local.salesType !== remote.salesType) assign('salesType', remote.salesType as T['salesType'])
  if (local.unit !== remote.unit) assign('unit', remote.unit as T['unit'])

  const localCover = pickCoverFileId(local)
  const remoteCover = pickCoverFileId(remote)
  if (localCover !== remoteCover) {
    next.coverImage = remote.coverImage
    next.images = remote.images
    next.coverImageUrl = remote.coverImageUrl
    if (remote.imageUrl) next.imageUrl = remote.imageUrl
    changed = true
  } else if (remote.imageUrl && remote.imageUrl !== local.imageUrl) {
    next.imageUrl = remote.imageUrl
    changed = true
  }

  return { item: changed ? next : local, changed }
}

/** 从 patch 结果中筛出相对本地确有差异的条目 */
export function filterChangedGoodsPatches<T extends Goods>(
  current: T[],
  patches: Goods[],
): Goods[] {
  const byId = new Map(current.map((item) => [item._id, item]))
  return patches.filter((remote) => {
    const local = byId.get(remote._id)
    if (!local) return true
    return hasGoodsLiveDiff(local, remote)
  })
}
