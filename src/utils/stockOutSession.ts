import type { Goods } from '@/types/goods'
import type { StockOutLine, StockOutSession } from '@/types/stockOut'
import { STOCK_OUT_SESSION_KEY } from '@/types/stockOut'
import { createLineKey } from '@/utils/stockInSession'

export function readStockOutSession(): StockOutSession | null {
  try {
    const raw = wx.getStorageSync(STOCK_OUT_SESSION_KEY) as StockOutSession | ''
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.lines)) return null
    return raw
  } catch {
    return null
  }
}

export function writeStockOutSession(session: StockOutSession) {
  wx.setStorageSync(STOCK_OUT_SESSION_KEY, session)
}

export function clearStockOutSession() {
  wx.removeStorageSync(STOCK_OUT_SESSION_KEY)
}

export function buildSelectStockOutSession(goodsIds: string[], catalog: Goods[]): StockOutSession {
  const map = new Map(catalog.map((item) => [item._id, item]))
  const lines: StockOutLine[] = []

  for (const goodsId of goodsIds) {
    const goods = map.get(goodsId)
    if (!goods) continue
    lines.push({
      lineKey: createLineKey(goodsId),
      name: goods.name,
      goodsId: goods._id,
      quantity: 0,
      currentStock: Number(goods.stock) || 0,
      unit: goods.unit || '件',
    })
  }

  return { lines }
}

export function refreshStockOutLinesFromCatalog(catalog: Goods[]): StockOutSession | null {
  const session = readStockOutSession()
  if (!session) return null

  const map = new Map(catalog.map((item) => [item._id, item]))
  for (const line of session.lines) {
    const goods = map.get(line.goodsId)
    if (!goods) continue
    line.name = goods.name
    line.currentStock = Number(goods.stock) || 0
    line.unit = goods.unit || '件'
    if (line.quantity > line.currentStock) {
      line.quantity = line.currentStock
    }
  }

  writeStockOutSession(session)
  return session
}
