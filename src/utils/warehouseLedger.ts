import type { WarehouseLedgerRecord, WarehouseLedgerType } from '@/types/stockOut'

const ORDER_LEDGER_TYPES = new Set<WarehouseLedgerType>(['order_out', 'order_rollback'])

export function isOrderWarehouseLedger(type: string) {
  return ORDER_LEDGER_TYPES.has(type as WarehouseLedgerType)
}

export function formatWarehouseLedgerTime(value: WarehouseLedgerRecord['createdAt']) {
  if (!value) return '—'
  const date =
    typeof value === 'object' && value !== null && 'toDate' in value
      ? (value as { toDate: () => Date }).toDate()
      : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 手动入/出库显示操作人；订单相关显示订单号 */
export function formatWarehouseLedgerActor(item: WarehouseLedgerRecord) {
  if (isOrderWarehouseLedger(item.type)) {
    return item.orderNo ? `订单 ${item.orderNo}` : '订单'
  }
  return item.operatorName ? `操作人 ${item.operatorName}` : '操作人 —'
}
