import { getCloud, getCloudCallConfig, parseCloudResult, formatCloudError } from './cloud'
import type { WarehouseLedgerBatch, WarehouseLedgerFilter } from '@/types/stockOut'

interface WarehouseListResult {
  success: boolean
  errMsg?: string
  list?: WarehouseLedgerBatch[]
}

async function callWarehouse<T = WarehouseListResult>(data: Record<string, unknown>): Promise<T> {
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
}): Promise<WarehouseLedgerBatch[]> {
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

/** 生成测试数据 */
export async function seedWarehouseTestData(): Promise<{ count: number }> {
  const result = await callWarehouse<{ success: boolean; count?: number }>({
    action: 'seedWarehouseTestData',
  })
  if (!result.success) throw new Error(result.err_msg || '生成测试数据失败')
  return { count: result.count || 0 }
}

/** 清理测试数据 */
export async function cleanupWarehouseTestData(): Promise<{ deleted: number }> {
  const result = await callWarehouse<{ success: boolean; deleted?: number }>({
    action: 'cleanupWarehouseTestData',
  })
  if (!result.success) throw new Error(result.err_msg || '清理测试数据失败')
  return { deleted: result.deleted || 0 }
}
