import { defineStore } from 'pinia'
import { ref } from 'vue'
import { UserRole } from '@/utils/constants'
import { getCachedRole, hasToken, login as authLogin } from '@/services/auth'

export const useUserStore = defineStore('user', () => {
  const openid = ref('')
  const role = ref<UserRole | null>(getCachedRole())
  const isLoggedIn = ref(hasToken())

  /** 执行登录 */
  async function doLogin() {
    const result = await authLogin()
    openid.value = result.openid
    role.value = result.role
    isLoggedIn.value = true
    return result
  }

  /** 判断是否为商家 */
  function isMerchant(): boolean {
    return role.value === UserRole.Merchant
  }

  /** 判断是否为顾客 */
  function isCustomer(): boolean {
    return role.value === UserRole.Customer
  }

  return {
    openid,
    role,
    isLoggedIn,
    doLogin,
    isMerchant,
    isCustomer,
  }
})
