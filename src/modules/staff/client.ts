import { getCloud, getCloudCallConfig, parseCloudResult, formatCloudError } from '@/services/cloud'
import type { StaffRole } from '@/utils/constants'
import type {
  MerchantSelf,
  StaffInviteAcceptResult,
  StaffInviteCreated,
  StaffInvitePreview,
  StaffMember,
  PendingStaffInvite,
} from './types'

interface StaffCloudResult {
  success: boolean
  errMsg?: string
  list?: StaffMember[]
  self?: MerchantSelf
  invite?: StaffInvitePreview
  token?: string
  code?: string
  expiresAt?: number
  sharePath?: string
  roleLabel?: string
  role?: StaffRole
  name?: string
}

async function callStaff<T = StaffCloudResult>(data: Record<string, unknown>): Promise<T> {
  const cloud = getCloud()
  const config = getCloudCallConfig()

  try {
    const res = await cloud.callFunction({
      name: 'staff',
      data,
      ...(config ? { config } : {}),
    })

    const result = parseCloudResult<T & StaffCloudResult>(res.result)
    if (!result || typeof result !== 'object') {
      throw new Error('云函数 staff 返回格式异常，请确认已部署最新 staff 云函数')
    }
    return result as T
  } catch (err) {
    throw new Error(`云函数 staff 调用失败: ${formatCloudError(err)}`)
  }
}

const STAFF_INVITE_CODE_PATTERN = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/

export const PENDING_STAFF_INVITE_CODE_PREFIX = 'code:'

export function normalizeStaffInviteCode(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase()
    .replace(/[^23456789ABCDEFGHJKLMNPQRSTUVWXYZ]/g, '')
    .slice(0, 6)
}

export function isStaffInviteCode(value: string): boolean {
  return STAFF_INVITE_CODE_PATTERN.test(normalizeStaffInviteCode(value))
}

export function buildPendingStaffInviteCode(code: string): string {
  return `${PENDING_STAFF_INVITE_CODE_PREFIX}${normalizeStaffInviteCode(code)}`
}

export function parsePendingStaffInvite(raw: unknown): PendingStaffInvite | null {
  const text = String(raw || '').trim()
  if (!text) return null
  if (text.startsWith(PENDING_STAFF_INVITE_CODE_PREFIX)) {
    const code = normalizeStaffInviteCode(text.slice(PENDING_STAFF_INVITE_CODE_PREFIX.length))
    return code.length === 6 ? { type: 'code', value: code } : null
  }
  const token = text.replace(/[^a-f0-9]/gi, '').slice(0, 64)
  return token.length >= 16 ? { type: 'token', value: token } : null
}

export async function listStaff(): Promise<StaffMember[]> {
  const result = await callStaff({ action: 'list' })
  if (!result.success) {
    throw new Error(result.errMsg || '获取工作人员列表失败')
  }
  return result.list || []
}

export async function getMerchantSelf(): Promise<MerchantSelf> {
  const result = await callStaff({ action: 'getSelf' })
  if (!result.success || !result.self) {
    throw new Error(result.errMsg || '获取商家资料失败')
  }
  return result.self
}

export async function createStaffInvite(name: string, role: StaffRole): Promise<StaffInviteCreated> {
  const result = await callStaff({
    action: 'createInvite',
    name: name.trim(),
    role,
  })
  if (result.success === false && result.errMsg === '未知操作') {
    throw new Error('staff 云函数未更新，请执行 npm run deploy:cloud -- --only staff')
  }
  if (!result.success || !result.token || !result.code || !result.sharePath || !result.expiresAt) {
    throw new Error(result.errMsg || '创建邀请失败')
  }
  return {
    token: result.token,
    code: result.code,
    expiresAt: result.expiresAt,
    sharePath: result.sharePath,
    roleLabel: result.roleLabel || '',
  }
}

export async function previewStaffInvite(token: string): Promise<StaffInvitePreview> {
  const result = await callStaff({ action: 'previewInvite', token })
  if (!result.success || !result.invite) {
    throw new Error(result.errMsg || '邀请无效')
  }
  return result.invite
}

export async function previewStaffInviteByCode(code: string): Promise<StaffInvitePreview> {
  const normalized = normalizeStaffInviteCode(code)
  if (!isStaffInviteCode(normalized)) {
    throw new Error('请输入 6 位邀请码')
  }
  const result = await callStaff({ action: 'previewInvite', code: normalized })
  if (!result.success || !result.invite) {
    throw new Error(result.errMsg || '邀请码无效')
  }
  return result.invite
}

export async function acceptStaffInvite(token: string): Promise<StaffInviteAcceptResult> {
  const result = await callStaff({ action: 'acceptInvite', token })
  if (!result.success) {
    throw new Error(result.errMsg || '接受邀请失败')
  }
  return {
    role: result.role || 'staff',
    roleLabel: result.roleLabel || '',
    name: result.name || '',
  }
}

export async function acceptStaffInviteByCode(code: string): Promise<StaffInviteAcceptResult> {
  const normalized = normalizeStaffInviteCode(code)
  if (!isStaffInviteCode(normalized)) {
    throw new Error('请输入 6 位邀请码')
  }
  const result = await callStaff({ action: 'acceptInvite', code: normalized })
  if (!result.success) {
    throw new Error(result.errMsg || '接受邀请失败')
  }
  return {
    role: result.role || 'staff',
    roleLabel: result.roleLabel || '',
    name: result.name || '',
  }
}

export async function updateStaffRole(targetUserId: string, role: StaffRole): Promise<void> {
  const result = await callStaff({
    action: 'updateRole',
    targetUserId,
    role,
  })
  if (!result.success) {
    throw new Error(result.errMsg || '修改身份失败')
  }
}

export async function updateStaffName(targetUserId: string, name: string): Promise<void> {
  const result = await callStaff({
    action: 'updateName',
    targetUserId,
    name: name.trim(),
  })
  if (!result.success) {
    throw new Error(result.errMsg || '修改姓名失败')
  }
}

export async function removeStaff(targetUserId: string): Promise<void> {
  const result = await callStaff({
    action: 'remove',
    targetUserId,
  })
  if (!result.success) {
    throw new Error(result.errMsg || '移除工作人员失败')
  }
}
