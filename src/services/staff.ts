import { getCloud, getCloudCallConfig } from './cloud'

export interface StaffMember {
  _id: string
  openid: string
  name: string
  role: string
  createdAt?: string
}

interface StaffCloudResult {
  success: boolean
  errMsg?: string
  list?: StaffMember[]
}

async function callStaff<T = StaffCloudResult>(data: Record<string, unknown>): Promise<T> {
  const cloud = getCloud()
  const config = getCloudCallConfig()

  const res = await cloud.callFunction({
    name: 'staff',
    data,
    ...(config ? { config } : {}),
  })

  return res.result as T
}

export async function listStaff(): Promise<StaffMember[]> {
  const result = await callStaff({ action: 'list' })
  if (!result.success) {
    throw new Error(result.errMsg || '获取工作人员列表失败')
  }
  return result.list || []
}

export async function addStaff(targetOpenid: string, name: string): Promise<void> {
  const result = await callStaff({
    action: 'add',
    targetOpenid,
    name,
  })
  if (!result.success) {
    throw new Error(result.errMsg || '添加工作人员失败')
  }
}

export async function removeStaff(targetOpenid: string): Promise<void> {
  const result = await callStaff({
    action: 'remove',
    targetOpenid,
  })
  if (!result.success) {
    throw new Error(result.errMsg || '移除工作人员失败')
  }
}
