/**
 * 会员体系模块 · 公开 API
 * @see docs/会员体系模块-API.md
 *
 * 当前实现：均为本地 mock 数据（0.3.0 目标版本）。
 * 待云函数就绪后，在本模块内替换 client.ts 实现，对外 API 签名不变。
 */

export type { MemberLevel, MemberLevelId } from '@/types/member'
export {
  MEMBER_LEVELS,
  MEMBER_LEVEL_BENEFITS,
  calcLevelProgress,
  formatMemberDiscount,
  resolveMemberLevel,
  resolveMemberLevelIndex,
} from '@/types/member'
