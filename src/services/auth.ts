import { UserRole, STORAGE_KEYS } from '@/utils/constants'
import { getCloud, getCloudCallConfig } from './cloud'

interface AuthResult {
  openid: string
  role: UserRole
}

interface LoginCloudResult {
  success?: boolean
  errMsg?: string
  openid?: string
  isMerchant?: boolean
}

function parseLoginResult(result: LoginCloudResult | null | undefined): LoginCloudResult {
  if (!result) {
    throw new Error('云函数返回为空，请确认 login 云函数已部署')
  }

  if (result.success === false) {
    throw new Error(result.errMsg || '云函数 login 执行失败')
  }

  if (!result.openid) {
    throw new Error(result.errMsg || '未获取到 openid，请检查云开发环境')
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

/**
 * 微信登录 → 云函数获取 openid → 判断身份
 */
export async function login(): Promise<AuthResult> {
  const cloud = getCloud()
  const config = getCloudCallConfig()

  let res: WechatMiniprogram.Cloud.CallFunctionResult

  try {
    res = await cloud.callFunction({
      name: 'login',
      data: {},
      ...(config ? { config } : {}),
    })
  } catch (err) {
    throw new Error(`云函数调用失败: ${formatCloudError(err)}`)
  }

  const result = parseLoginResult(res.result as LoginCloudResult)
  const role = result.isMerchant ? UserRole.Merchant : UserRole.Customer

  wx.setStorageSync(STORAGE_KEYS.Token, result.openid!)
  wx.setStorageSync(STORAGE_KEYS.Role, role)

  return { openid: result.openid!, role }
}

export function hasToken(): boolean {
  return !!wx.getStorageSync(STORAGE_KEYS.Token)
}

export function getCachedRole(): UserRole | null {
  return wx.getStorageSync(STORAGE_KEYS.Role) || null
}

export function logout() {
  wx.removeStorageSync(STORAGE_KEYS.Token)
  wx.removeStorageSync(STORAGE_KEYS.Role)
  wx.removeStorageSync(STORAGE_KEYS.UserInfo)
}

export function navigateToHome(role: UserRole) {
  if (role === UserRole.Merchant) {
    wx.reLaunch({ url: '/pagesMerchant/dashboard/index' })
  } else {
    wx.reLaunch({ url: '/pages/home/index' })
  }
}
