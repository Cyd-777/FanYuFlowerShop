/**
 * 人员管理模块 · 公开 API
 * @see docs/人员管理模块-API.md
 */

export type {
  MerchantSelf,
  PendingStaffInvite,
  StaffInviteAcceptResult,
  StaffInviteCreated,
  StaffInvitePreview,
  StaffInviteStatus,
  StaffMember,
} from './types'

export {
  PENDING_STAFF_INVITE_CODE_PREFIX,
  acceptStaffInvite,
  acceptStaffInviteByCode,
  buildPendingStaffInviteCode,
  createStaffInvite,
  getMerchantSelf,
  isStaffInviteCode,
  listStaff,
  normalizeStaffInviteCode,
  parsePendingStaffInvite,
  previewStaffInvite,
  previewStaffInviteByCode,
  removeStaff,
  updateStaffName,
  updateStaffRole,
} from './client'
