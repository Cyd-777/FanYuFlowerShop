import { defineStore } from 'pinia'
import { ref } from 'vue'
import { UserRole } from '@/utils/constants'
import {
  getCachedRole,
  getCachedUserId,
  getCachedUserProfile,
  hasToken,
  loginWithWechat,
  loginWithPhone,
  type AuthResult,
} from '@/services/auth'
import type { UserAccount } from '@/types/account'

export const useUserStore = defineStore('user', () => {
  const userId = ref(getCachedUserId())
  const profile = ref<UserAccount | null>(getCachedUserProfile())
  const role = ref<UserRole | null>(getCachedRole())
  const isLoggedIn = ref(hasToken())

  function syncSession(session: AuthResult) {
    userId.value = session.userId
    profile.value = session.profile
    role.value = session.role
    isLoggedIn.value = true
  }

  async function doLoginWechat() {
    const result = await loginWithWechat()
    syncSession(result)
    return result
  }

  async function doLoginPhone(phone: string, code: string) {
    const result = await loginWithPhone(phone, code)
    syncSession(result)
    return result
  }

  function isMerchant(): boolean {
    return role.value === UserRole.Merchant
  }

  return {
    profile,
    doLoginWechat,
    doLoginPhone,
    syncSession,
    isMerchant,
  }
})
