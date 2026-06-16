import { UserRole, STORAGE_KEYS } from '@/utils/constants'
import { getCloud } from './cloud'

interface AuthResult {
  openid: string
  role: UserRole
}

/**
 * 微信登录 → 获取 openid → 判断身份
 * 全程无感，用户不需要额外操作
 */
export async function login(): Promise<AuthResult> {
  const cloud = getCloud()

  // 1. wx.login 获取 code
  const { code } = await wx.login()

  // 2. 云函数：code 换 openid + 判断身份
  const res: any = await cloud.callFunction({
    name: 'login',
    data: { code },
  })

  const { openid, isMerchant } = res.result
  const role = isMerchant ? UserRole.Merchant : UserRole.Customer

  // 3. 缓存登录态
  wx.setStorageSync(STORAGE_KEYS.Token, openid)
  wx.setStorageSync(STORAGE_KEYS.Role, role)

  return { openid, role }
}

/**
 * 检查是否有登录态
 */
export function hasToken(): boolean {
  return !!wx.getStorageSync(STORAGE_KEYS.Token)
}

/**
 * 获取缓存的角色
 */
export function getCachedRole(): UserRole | null {
  return wx.getStorageSync(STORAGE_KEYS.Role) || null
}

/**
 * 退出登录（清缓存）
 */
export function logout() {
  wx.removeStorageSync(STORAGE_KEYS.Token)
  wx.removeStorageSync(STORAGE_KEYS.Role)
  wx.removeStorageSync(STORAGE_KEYS.UserInfo)
}

/**
 * 检查当前角色，跳转到不同首页
 */
export function navigateToHome(role: UserRole) {
  if (role === UserRole.Merchant) {
    wx.reLaunch({ url: '/pagesMerchant/dashboard/index' })
  } else {
    wx.reLaunch({ url: '/pages/home/index' })
  }
}
