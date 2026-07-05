import { getGoodsUnitLabel } from '@/types/goods'

function formatPriceAmount(price: number): string {
  return Number(price).toFixed(2).replace(/\.00$/, '')
}

interface SplitGoodsPrice {
  integer: string
  /** 不含小数点，如 "5" / "50" */
  fraction: string | null
}

export function splitGoodsPrice(price: number): SplitGoodsPrice {
  const amount = formatPriceAmount(price)
  const dotIdx = amount.indexOf('.')
  if (dotIdx < 0) {
    return { integer: amount, fraction: null }
  }
  return {
    integer: amount.slice(0, dotIdx),
    fraction: amount.slice(dotIdx + 1),
  }
}

/** 卡片/列表价格行：168¥/束 */
export function formatGoodsPriceWithUnit(
  price: number,
  unit?: string | null,
  fallbackUnit = '束',
): string {
  const label = getGoodsUnitLabel(unit || fallbackUnit)
  return `${formatPriceAmount(price)}¥/${label}`
}
