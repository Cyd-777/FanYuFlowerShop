import type { Goods } from '@/types/goods'
import type { StockInLine, StockInSession } from '@/types/stockIn'
import { STOCK_IN_SESSION_KEY } from '@/types/stockIn'

export function createLineKey(prefix = 'line') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function applyGoodsToLine(line: StockInLine, goods: Goods) {
  line.goodsId = goods._id
  line.name = goods.name
  line.currentStock = Number(goods.stock) || 0
  line.unit = goods.unit || '件'
}

export function readStockInSession(): StockInSession | null {
  try {
    const raw = wx.getStorageSync(STOCK_IN_SESSION_KEY) as StockInSession | ''
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.lines)) return null
    return raw
  } catch {
    return null
  }
}

export function writeStockInSession(session: StockInSession) {
  wx.setStorageSync(STOCK_IN_SESSION_KEY, session)
}

export function clearStockInSession() {
  wx.removeStorageSync(STOCK_IN_SESSION_KEY)
}

export function buildSelectStockInSession(goodsIds: string[], catalog: Goods[]): StockInSession {
  const map = new Map(catalog.map((item) => [item._id, item]))
  const lines: StockInLine[] = []

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

  return { mode: 'select', lines }
}

export function linkStockInLineGoods(
  lineKey: string,
  goodsId: string,
  goods?: Pick<Goods, 'name' | 'stock' | 'unit'>,
) {
  const session = readStockInSession()
  if (!session) return
  const line = session.lines.find((item) => item.lineKey === lineKey)
  if (!line) return
  line.goodsId = goodsId
  if (goods) {
    line.name = goods.name
    line.currentStock = Number(goods.stock) || 0
    line.unit = goods.unit || '件'
  }
  writeStockInSession(session)
}

export function refreshStockInLinesFromCatalog(catalog: Goods[]): StockInSession | null {
  const session = readStockInSession()
  if (!session) return null

  for (const line of session.lines) {
    if (line.goodsId) {
      const goods = catalog.find((item) => item._id === line.goodsId)
      if (goods) applyGoodsToLine(line, goods)
      continue
    }
    const matched = matchGoodsForStockInLine(line, catalog)
    if (matched) applyGoodsToLine(line, matched)
  }

  writeStockInSession(session)
  return session
}

export function matchGoodsForStockInLine(line: StockInLine, catalog: Goods[]): Goods | null {
  const name = line.name.trim()
  if (!name) return null

  const color = line.colorHint?.trim()
  const exact = catalog.filter((item) => item.name.trim() === name)
  if (exact.length === 1) return exact[0]
  if (exact.length > 1 && color) {
    const byColor = exact.find(
      (item) =>
        item.flowerVarietyName?.includes(color) ||
        item.flowerKindName?.includes(color) ||
        item.description?.includes(color),
    )
    if (byColor) return byColor
    return exact[0]
  }
  if (exact.length > 1) return exact[0]

  const lower = name.toLowerCase()
  const fuzzy = catalog.filter((item) => item.name.toLowerCase().includes(lower))
  if (fuzzy.length === 1) return fuzzy[0]
  return null
}

/** 解析进货单文本，每行：名称,数量 或 名称,花色,数量 或 名称 x 数量 */
export function parsePurchaseOrderText(text: string): Array<{
  name: string
  colorHint?: string
  quantity: number
}> {
  const rows: Array<{ name: string; colorHint?: string; quantity: number }> = []

  for (const rawLine of text.split(/\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    let name = ''
    let colorHint: string | undefined
    let quantity = 0

    const commaParts = line.split(/[,，]/).map((part) => part.trim()).filter(Boolean)
    if (commaParts.length >= 2) {
      const last = commaParts[commaParts.length - 1]
      const qty = parseInt(last, 10)
      if (!Number.isNaN(qty) && qty > 0) {
        quantity = qty
        if (commaParts.length >= 3) {
          name = commaParts[0]
          colorHint = commaParts.slice(1, -1).join(' ')
        } else {
          name = commaParts.slice(0, -1).join(' ')
        }
      }
    }

    if (!quantity) {
      const multiply = line.match(/^(.+?)\s*[xX×]\s*(\d+)\s*$/)
      if (multiply) {
        name = multiply[1].trim()
        quantity = parseInt(multiply[2], 10)
      }
    }

    if (!quantity) {
      const tailNum = line.match(/^(.+?)\s+(\d+)\s*$/)
      if (tailNum) {
        name = tailNum[1].trim()
        quantity = parseInt(tailNum[2], 10)
      }
    }

    if (!name || !quantity || quantity <= 0) continue
    rows.push({ name, colorHint, quantity })
  }

  return rows
}

export function buildImportStockInSession(
  parsed: Array<{ name: string; colorHint?: string; quantity: number }>,
  catalog: Goods[],
): StockInSession {
  const lines: StockInLine[] = parsed.map((row) => {
    const draft: StockInLine = {
      lineKey: createLineKey('import'),
      name: row.name,
      colorHint: row.colorHint,
      quantity: row.quantity,
    }
    const matched = matchGoodsForStockInLine(draft, catalog)
    if (matched) applyGoodsToLine(draft, matched)
    return draft
  })

  return { mode: 'import', lines }
}
