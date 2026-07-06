/**
 * 启动与授权模块 · 公开 API
 * @see docs/启动与授权模块-API.md
 */

export type { AuthResult } from './types'

export {
  checkAccess,
  getCachedAccessEpoch,
  getCachedRole,
  getCachedUserId,
  getCachedUserProfile,
  hasToken,
  isMerchantRoute,
  login,
  loginWithPhone,
  loginWithWechat,
  logout,
  navigateToHome,
  refreshSessionAccess,
  sendPhoneLoginCode,
  writeCachedUserProfile,
} from './client'
