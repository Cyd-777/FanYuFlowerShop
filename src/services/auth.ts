import { showToast } from '@/utils/feedback'
import { UserRole, STORAGE_KEYS } from '@/utils/constants'
import { isUserId, sanitizeUserId } from '@/utils/userId'
import { getCloud, getCloudCallConfig } from './cloud'
import type { UserAccount } from '@/types/account'

export interface AuthResult {
  userId: string
  role: UserRole
  accessEpoch: number
  profile: UserAccount
}

interface LoginCloudResult {
  success?: boolean
  errMsg?: string
  userId?: string
  isMerchant?: boolean
  accessEpoch?: number
  profile?: Partial<UserAccount>
  devCode?: string
}

function parseLoginResult(result: LoginCloudResult | null | undefined): LoginCloudResult {
  if (!result) {
    throw new Error('云函数返回为空，请确认 login 云函数已部署')
  }

  if (result.success === false) {
    throw new Error(result.errMsg || '云函数 login 执行失败')
  }

  const userId = result.userId || result.profile?.userId || ''
  if (!userId) {
    throw new Error(result.errMsg || '未获取到用户身份，请检查云开发环境')
  }

  return result
}

function formatCloudError(err: unknown): string {
  if (!err) return '未知错误'

  const anyErr = err as { errMsg?: string; message?: string; errCode?: number }
  const parts = [
    anyErr.errMsg,
    anyErr.message,
    anyErr.errCode != null ? `errCode: ${anyErr.errCode}` : '',
  ].filter(Boolean)

  return parts.join(' | ') || String(err)
}

async function callLogin(data: Record<string, unknown> = {}): Promise<LoginCloudResult> {
  const cloud = getCloud()
  const config = getCloudCallConfig()

  try {
    const res = await cloud.callFunction({
      name: 'login',
      data,
      ...(config ? { config } : {}),
    })
    return parseLoginResult(res.result as LoginCloudResult)
  } catch (err) {
    throw new Error(`云函数调用失败: ${formatCloudError(err)}`)
  }
}

function normalizeProfile(result: LoginCloudResult): UserAccount {
  const p = result.profile || {}
  return {
    userId: result.userId || p.userId || '',
    nickName: p.nickName || '',
    avatarUrl: p.avatarUrl || '',
    phone: p.phone || '',
  }
}

/** 登录拉云端资料；校验权限时保留本地已编辑资料 */
function mergeStoredProfile(cloud: UserAccount, preferCloud: boolean): UserAccount {
  const local = getCachedUserProfile()
  if (!local) return cloud

  const pick = (cloudVal: string, localVal: string) => {
    const c = cloudVal.trim()
    const l = localVal.trim()
    if (preferCloud) return c || l
    return l || c
  }

  return {
    userId: cloud.userId || local.userId || '',
    nickName: pick(cloud.nickName, local.nickName),
    avatarUrl: pick(cloud.avatarUrl, local.avatarUrl),
    phone: pick(cloud.phone || '', local.phone || ''),
  }
}

function persistSession(result: LoginCloudResult, options?: { updateProfile?: boolean }): AuthResult {
  const role = result.isMerchant ? UserRole.Merchant : UserRole.Customer
  const preferCloud = options?.updateProfile !== false
  const profile = mergeStoredProfile(normalizeProfile(result), preferCloud)
  const userId = profile.userId || result.userId || ''
  if (!userId || !isUserId(userId)) {
    throw new Error('登录成功但未获取到有效 userId，请确认 login 云函数已部署')
  }

  wx.setStorageSync(STORAGE_KEYS.UserId, userId)
  wx.setStorageSync(STORAGE_KEYS.Role, role)
  wx.setStorageSync(STORAGE_KEYS.AccessEpoch, Number(result.accessEpoch) || 0)
  wx.setStorageSync(STORAGE_KEYS.UserInfo, profile)

  return {
    userId,
    role,
    accessEpoch: Number(result.accessEpoch) || 0,
    profile,
  }
}

/** 微信登录（云端 wxContext 鉴权） */
export async function loginWithWechat(): Promise<AuthResult> {
  const result = await callLogin({ action: 'loginWechat' })
  return persistSession(result)
}

/** @deprecated 使用 loginWithWechat */
export async function login(): Promise<AuthResult> {
  return loginWithWechat()
}

export async function sendPhoneLoginCode(phone: string): Promise<{ devCode?: string }> {
  const cloud = getCloud()
  const config = getCloudCallConfig()
  const res = await cloud.callFunction({
    name: 'login',
    data: { action: 'sendSmsCode', phone },
    ...(config ? { config } : {}),
  })
  const result = res.result as LoginCloudResult
  if (result?.success === false) {
    throw new Error(result.errMsg || '发送验证码失败')
  }
  return { devCode: result?.devCode }
}

export async function loginWithPhone(phone: string, code: string): Promise<AuthResult> {
  const result = await callLogin({ action: 'loginPhone', phone, code })
  return persistSession(result)
}

/** 服务端校验当前权限版本（staff 变更后立即生效；不覆盖本地资料缓存） */
export async function checkAccess(): Promise<AuthResult> {
  const result = await callLogin({ action: 'checkAccess' })
  return persistSession(result, { updateProfile: false })
}

export function getCachedUserId(): string {
  const fromStorage = sanitizeUserId(String(wx.getStorageSync(STORAGE_KEYS.UserId) || ''))
  if (fromStorage) return fromStorage
  return sanitizeUserId(getCachedUserProfile()?.userId || '')
}

export function getCachedUserProfile(): UserAccount | null {
  const raw = wx.getStorageSync(STORAGE_KEYS.UserInfo)
  return raw && typeof raw === 'object' ? (raw as UserAccount) : null
}

export function writeCachedUserProfile(profile: UserAccount) {
  wx.setStorageSync(STORAGE_KEYS.UserInfo, profile)
}

export function getCachedAccessEpoch(): number {
  return Number(wx.getStorageSync(STORAGE_KEYS.AccessEpoch)) || 0
}

export function isMerchantRoute(route: string) {
  return route.startsWith('pagesMerchant/')
}

export async function refreshSessionAccess(options?: { forceExitMerchant?: boolean }) {
  if (!hasToken()) return null

  const prevRole = getCachedRole()
  const prevEpoch = getCachedAccessEpoch()

  try {
    const session = await checkAccess()
    const revoked = prevRole === UserRole.Merchant && session.role === UserRole.Customer
    const epochChanged = prevEpoch !== session.accessEpoch

    if (revoked || (epochChanged && session.role !== prevRole)) {
      if (options?.forceExitMerchant && revoked) {
        showToast({ title: '商家权限已更新', icon: 'none' })
        const pages = getCurrentPages()
        const route = pages[pages.length - 1]?.route || ''
        if (isMerchantRoute(route)) {
          wx.reLaunch({ url: '/pages/home/index' })
        }
      }
    }

    return session
  } catch (err) {
    console.warn('[auth] refreshSessionAccess failed:', err)
    return null
  }
}

export function hasToken(): boolean {
  return !!getCachedUserId()
}

export function getCachedRole(): UserRole | null {
  return wx.getStorageSync(STORAGE_KEYS.Role) || null
}

export function logout() {
  wx.removeStorageSync(STORAGE_KEYS.UserId)
  wx.removeStorageSync(STORAGE_KEYS.Role)
  wx.removeStorageSync(STORAGE_KEYS.AccessEpoch)
  wx.removeStorageSync(STORAGE_KEYS.UserInfo)
}

export function navigateToHome(role: UserRole) {
  if (role === UserRole.Merchant) {
    wx.reLaunch({ url: '/pagesMerchant/dashboard/index' })
  } else {
    wx.reLaunch({ url: '/pages/home/index' })
  }
}
