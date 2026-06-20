/** 批量入库会话（storage 传递） */
export const STOCK_IN_SESSION_KEY = 'merchant:stock-in:session'

export type StockInMode = 'select' | 'import'

export interface StockInLine {
  lineKey: string
  /** 进货单或商品名称 */
  name: string
  /** 花色等辅助匹配 */
  colorHint?: string
  goodsId?: string
  /** 本次入库数量 */
  quantity: number
  /** 当前在库数量（已在库商品） */
  currentStock?: number
  unit?: string
}

export interface StockInSession {
  mode: StockInMode
  lines: StockInLine[]
}

export interface StockInSubmitItem {
  goodsId: string
  delta: number
}
