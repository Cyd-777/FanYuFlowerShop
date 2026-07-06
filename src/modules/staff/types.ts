import type { StaffRole } from '@/utils/constants'

export interface StaffMember {
  _id: string
  userId: string
  name: string
  nickName?: string
  avatarUrl?: string
  role: StaffRole
  roleLabel?: string
  createdAt?: string
}

export interface MerchantSelf {
  userId: string
  name: string
  nickName: string
  avatarUrl: string
  role: StaffRole
  roleLabel: string
}

export type StaffInviteStatus = 'pending' | 'used' | 'expired' | 'invalid'

export interface StaffInvitePreview {
  name: string
  role: StaffRole
  roleLabel: string
  expiresAt: number
  status: StaffInviteStatus
  code?: string
}

export interface StaffInviteCreated {
  token: string
  code: string
  expiresAt: number
  sharePath: string
  roleLabel: string
}

export interface StaffInviteAcceptResult {
  role: StaffRole
  roleLabel: string
  name: string
}

export type PendingStaffInvite =
  | { type: 'code'; value: string }
  | { type: 'token'; value: string }
