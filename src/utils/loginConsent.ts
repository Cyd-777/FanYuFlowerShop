import { LEGAL_AGREEMENT_VERSION } from '@/config/legal'
import type { UserAccount } from '@/types/account'

const AGREEMENT_STORAGE_KEY = 'login_agreement_version'
const PROFILE_GUIDE_STORAGE_KEY = 'login_profile_guide_v1'

export const DEFAULT_PROFILE_NICKNAME = '花友'

interface ProfileGuideRecord {
  userId: string
  skipped?: boolean
  completedAt: number
}

export function hasAcceptedCurrentAgreement(): boolean {
  return wx.getStorageSync(AGREEMENT_STORAGE_KEY) === LEGAL_AGREEMENT_VERSION
}

export function recordAgreementAccepted() {
  wx.setStorageSync(AGREEMENT_STORAGE_KEY, LEGAL_AGREEMENT_VERSION)
}

export function isProfileIncomplete(profile?: Partial<UserAccount> | null): boolean {
  if (!profile) return true
  const nick = (profile.nickName || '').trim()
  const avatar = (profile.avatarUrl || '').trim()
  if (!avatar) return true
  if (!nick || nick === DEFAULT_PROFILE_NICKNAME) return true
  return false
}

export function hasCompletedProfileGuide(userId: string): boolean {
  if (!userId) return false
  const raw = wx.getStorageSync(PROFILE_GUIDE_STORAGE_KEY) as ProfileGuideRecord | undefined
  return raw?.userId === userId
}

export function markProfileGuideDone(userId: string, options?: { skipped?: boolean }) {
  if (!userId) return
  const record: ProfileGuideRecord = {
    userId,
    skipped: options?.skipped === true,
    completedAt: Date.now(),
  }
  wx.setStorageSync(PROFILE_GUIDE_STORAGE_KEY, record)
}

export function shouldShowProfileGuide(userId: string, profile?: Partial<UserAccount> | null): boolean {
  if (!userId) return false
  if (hasCompletedProfileGuide(userId)) return false
  return isProfileIncomplete(profile)
}
