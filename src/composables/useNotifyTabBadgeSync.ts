import { useDidShow } from '@tarojs/taro'
import { useNotificationStore } from '@/stores/notification'

/** Tab 页 onShow 时同步商家通知未读角标 */
export function useNotifyTabBadgeSync() {
  const store = useNotificationStore()

  function sync() {
    void store.refreshBadge({ silent: true })
  }

  useDidShow(sync)
}
