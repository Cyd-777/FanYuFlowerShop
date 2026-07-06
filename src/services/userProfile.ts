import { getCloud, getCloudCallConfig, parseCloudResult } from './cloud'
import { resolveImageDisplayPath } from '@/utils/goodsImage'
import { getCachedUserProfile, writeCachedUserProfile } from '@/services/auth'
import { STORAGE_KEYS } from '@/utils/constants'
import { assertLocalImageWithinLimit } from '@/utils/uploadImageLimit'
import type { UserAccount } from '@/types/account'
import { getBizNotifySubscribeTmplIds } from '@/config/subscribe'
import { recordBizNotifySubscribe, invokeBizNotifySubscribe } from '@/modules/notify'

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

/** @deprecated 请用 requestBizNotifySubscribe */
export async function requestOrderNotifySubscribe() {
  return requestBizNotifySubscribe()
}

/** 业务通知 · 请求微信服务通知授权（须在用户点击回调中同步调用） */
export function requestBizNotifySubscribe(tmplIds?: string[]): Promise<string[]> {
  return invokeBizNotifySubscribe(tmplIds?.length ? tmplIds : getBizNotifySubscribeTmplIds()).then(
    async (accepted) => {
      if (accepted.length) {
        await recordBizNotifySubscribe(accepted).catch((err) => {
          console.warn('[subscribe] record failed:', err)
        })
      }
      return accepted
    },
  )
}
