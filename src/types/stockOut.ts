/** 批量出库会话（storage 传递） */
export const STOCK_OUT_SESSION_KEY = 'merchant:stock-out:session'

export interface StockOutLine {
  lineKey: string
  name: string
  goodsId: string
  /** 本次出库数量 */
  quantity: number
  /** 当前可售数 */
  currentStock: number
  unit?: string
}

export interface StockOutSession {
  lines: StockOutLine[]
}

export interface StockOutSubmitItem {
  goodsId: string
  delta: number
}

/** 仓储流水类型（云库 warehouse_ledger） */
export type WarehouseLedgerType =
  | 'stock_in'
  | 'stock_out'
  | 'order_out'
  | 'order_rollback'

export const WAREHOUSE_LEDGER_TYPE_LABELS: Record<WarehouseLedgerType, string> = {
  stock_in: '手动入库',
  stock_out: '手动出库',
  order_out: '订单出库',
  order_rollback: '订单回滚',
}

export type WarehouseLedgerFilter = '' | 'stock_in' | 'stock_out'

export interface WarehouseLedgerRecord {
  _id?: string
  type: WarehouseLedgerType
  goodsId: string
  goodsName: string
  unit?: string
  delta: number
  stockBefore: number
  stockAfter: number
  operatorOpenid: string
  operatorUserId?: string
  operatorName: string
  createdAt?: string | number
  /** 关联订单（订单出库/回滚时） */
  orderId?: string
  orderNo?: string
}
