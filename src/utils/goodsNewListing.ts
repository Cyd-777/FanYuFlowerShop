import type { Goods } from '@/types/goods'

/** 上架后多少天内显示「新上架」 */
export const NEW_LISTING_DAYS = 7

const NEW_LISTING_MS = NEW_LISTING_DAYS * 24 * 60 * 60 * 1000

function parseTime(value?: string) {
  if (!value) return NaN
  const ts = new Date(value).getTime()
  return Number.isNaN(ts) ? NaN : ts
}

/** 是否展示「新上架」（需上架中） */
export function isNewListing(
  goods: Pick<Goods, 'onSale' | 'listedAt' | 'createdAt'>,
  now = Date.now(),
) {
  if (goods.onSale === false) return false
  const ts = parseTime(goods.listedAt) || parseTime(goods.createdAt)
  if (Number.isNaN(ts)) return false
  return now - ts <= NEW_LISTING_MS
}
