import type { UserRole } from '@/utils/constants'
import type { UserAccount } from '@/types/account'

export interface AuthResult {
  userId: string
  role: UserRole
  accessEpoch: number
  profile: UserAccount
}
