import type { Goods } from '@/types/goods'

/** 首次入库后展示「新上架」的天数（鲜花保鲜期短，取 3–4 天上限） */
export const NEW_LISTING_DAYS = 4

const NEW_LISTING_MS = NEW_LISTING_DAYS * 24 * 60 * 60 * 1000

function parseTime(value?: string) {
  if (!value) return NaN
  const ts = new Date(value).getTime()
  return Number.isNaN(ts) ? NaN : ts
}

/**
 * 是否展示「新上架」：商品库首次创建、当前仍上架，且在有效期内。
 * 下架后再上架不重复展示（仅看 createdAt，不看 listedAt）。
 */
export function isNewListing(
  goods: Pick<Goods, 'onSale' | 'createdAt'>,
  now = Date.now(),
) {
  if (goods.onSale === false) return false
  const ts = parseTime(goods.createdAt)
  if (Number.isNaN(ts)) return false
  return now - ts <= NEW_LISTING_MS
}
