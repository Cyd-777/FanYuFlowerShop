import { getCloud, getCloudCallConfig, parseCloudResult } from './cloud'
import { resolveImageDisplayPath } from '@/utils/goodsImage'
import { getCachedUserProfile, writeCachedUserProfile } from '@/services/auth'
import { STORAGE_KEYS } from '@/utils/constants'
import { assertLocalImageWithinLimit } from '@/utils/uploadImageLimit'
import type { UserAccount } from '@/types/account'

interface ProfileCloudResult {
  success: boolean
  errMsg?: string
  profile?: Partial<UserAccount>
}

async function callLogin<T = ProfileCloudResult>(data: Record<string, unknown>): Promise<T> {
  const res = await getCloud().callFunction({
    name: 'login',
    data,
    ...(getCloudCallConfig() ? { config: getCloudCallConfig()! } : {}),
  })
  const result = parseCloudResult<T & ProfileCloudResult>(res.result)
  if (!result || typeof result !== 'object') {
    throw new Error('云函数返回格式异常')
  }
  return result as T
}

function normalizeCloudProfile(p: Partial<UserAccount> = {}): UserAccount {
  return {
    userId: p.userId || '',
    nickName: p.nickName || '',
    avatarUrl: p.avatarUrl || '',
    phone: p.phone || '',
  }
}

/** 云端优先，空字段回落本地缓存 */
export function mergeUserProfile(cloud: UserAccount, local: UserAccount | null): UserAccount {
  if (!local) return cloud
  return {
    userId: cloud.userId || local.userId || '',
    nickName: cloud.nickName.trim() || local.nickName.trim(),
    avatarUrl: cloud.avatarUrl.trim() || local.avatarUrl.trim(),
    phone: cloud.phone?.trim() || local.phone?.trim() || '',
  }
}

export async function fetchUserProfile(): Promise<UserAccount> {
  const result = await callLogin({ action: 'getProfile' })
  if (result.success !== true) {
    throw new Error(result.errMsg || '获取资料失败')
  }
  const cloud = normalizeCloudProfile(result.profile)
  const merged = mergeUserProfile(cloud, getCachedUserProfile())
  writeCachedUserProfile(merged)
  return merged
}

export async function saveUserProfile(input: {
  nickName: string
  avatarUrl?: string
}) {
  let avatarFileId = input.avatarUrl || ''

  if (avatarFileId && !avatarFileId.startsWith('cloud://') && !/^https?:\/\//.test(avatarFileId)) {
    await assertLocalImageWithinLimit(avatarFileId)
    const ext = avatarFileId.includes('.') ? avatarFileId.slice(avatarFileId.lastIndexOf('.')) : '.jpg'
    const cloudPath = `avatars/${Date.now()}${ext}`
    const upload = await getCloud().uploadFile({
      cloudPath,
      filePath: avatarFileId,
    })
    avatarFileId = upload.fileID
  }

  const result = await callLogin({
    action: 'saveProfile',
    profile: {
      nickName: input.nickName.trim(),
      avatarUrl: avatarFileId,
    },
  })

  if (result.success !== true) {
    throw new Error(result.errMsg || '保存资料失败')
  }

  const cloud = normalizeCloudProfile(result.profile)
  const profile: UserAccount = {
    userId: cloud.userId || wx.getStorageSync(STORAGE_KEYS.UserId) || '',
    nickName: input.nickName.trim(),
    avatarUrl: avatarFileId,
    phone: cloud.phone || getCachedUserProfile()?.phone || '',
  }

  writeCachedUserProfile(profile)
  return profile
}

/** 头像展示路径（cloud:// 换本地/HTTPS） */
export async function resolveAvatarDisplayPath(raw: string) {
  const trimmed = (raw || '').trim()
  if (!trimmed) return ''
  if (/^(https?:\/\/|wxfile:|\/)/.test(trimmed)) return trimmed
  return (await resolveImageDisplayPath(trimmed)) || trimmed
}

/** 订单/活动通知模板 — 未配置模板 ID 时静默跳过 */
export async function requestOrderNotifySubscribe() {
  const tmplIds = (process.env.TARO_APP_SUBSCRIBE_TMPL_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (!tmplIds.length) {
    console.info('[subscribe] no template ids configured')
    return
  }

  await new Promise<void>((resolve, reject) => {
    wx.requestSubscribeMessage({
      tmplIds,
      success: () => resolve(),
      fail: (err) => reject(err),
    })
  })
}
