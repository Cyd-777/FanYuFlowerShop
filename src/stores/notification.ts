import { defineStore } from 'pinia'
import { ref } from 'vue'
import { hasToken } from '@/services/auth'
import { fetchNotifyUnreadCount } from '@/modules/notify'
import { updateNotifyTabBadge } from '@/utils/notifyTabBadge'

export const useNotificationStore = defineStore('notification', () => {
  const unread = ref(0)
  const isMerchant = ref(false)
  const loading = ref(false)

  async function refreshBadge(options?: { silent?: boolean }) {
    if (!hasToken()) {
      unread.value = 0
      isMerchant.value = false
      updateNotifyTabBadge(0, false)
      return
    }

    if (!options?.silent) loading.value = true
    try {
      const result = await fetchNotifyUnreadCount()
      unread.value = result.unread
      isMerchant.value = result.isMerchant
      updateNotifyTabBadge(result.unread, result.isMerchant)
    } catch (err) {
      console.warn('[notify] refresh badge failed:', err)
    } finally {
      loading.value = false
    }
  }

  function setUnread(count: number) {
    unread.value = Math.max(0, Number(count) || 0)
    updateNotifyTabBadge(unread.value, isMerchant.value)
  }

  return {
    unread,
    isMerchant,
    loading,
    refreshBadge,
    setUnread,
  }
})
