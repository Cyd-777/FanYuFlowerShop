import { getCloud, getCloudCallConfig, parseCloudResult, formatCloudError } from './cloud'
import type { WarehouseLedgerFilter, WarehouseLedgerRecord } from '@/types/stockOut'

interface WarehouseCloudResult {
  success: boolean
  errMsg?: string
  list?: WarehouseLedgerRecord[]
}

async function callWarehouse<T = WarehouseCloudResult>(data: Record<string, unknown>): Promise<T> {
  const cloud = getCloud()
  const config = getCloudCallConfig()

  let res: WechatMiniprogram.Cloud.CallFunctionResult
  try {
    res = await cloud.callFunction({
      name: 'goods',
      data,
      ...(config ? { config } : {}),
    })
  } catch (err) {
    throw new Error(formatCloudError(err))
  }

  return parseCloudResult<T>(res.result)
}

export async function listWarehouseLedger(options?: {
  type?: WarehouseLedgerFilter
  limit?: number
  skip?: number
}): Promise<WarehouseLedgerRecord[]> {
  const result = await callWarehouse({
    action: 'listWarehouseLedger',
    type: options?.type || '',
    limit: options?.limit ?? 50,
    skip: options?.skip ?? 0,
  })
  if (!result.success) {
    throw new Error(result.errMsg || '加载仓储历史失败')
  }
  return result.list || []
}
