import { pickCoverFileId } from '@/utils/goodsImage'

/** 列表展示层字段未变时跳过整表替换，避免卡片闪动 */
export function isSameGoodsListSnapshot<
  T extends {
    _id: string
    name?: string
    price?: number
    stock?: number
    onSale?: boolean
    coverImage?: string
    coverImageUrl?: string
    images?: string[]
    imageUrl?: string
  },
>(next: T[], current: T[]) {
  if (next.length !== current.length) return false
  return next.every((item, index) => {
    const prev = current[index]
    if (!prev || item._id !== prev._id) return false
    return (
      item.name === prev.name
      && item.price === prev.price
      && item.stock === prev.stock
      && item.onSale === prev.onSale
      && (item.coverImageUrl || '') === (prev.coverImageUrl || '')
      && pickCoverFileId(item) === pickCoverFileId(prev)
      && (item.imageUrl || '') === (prev.imageUrl || '')
    )
  })
}
