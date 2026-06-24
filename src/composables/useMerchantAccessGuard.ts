import { useDidShow } from '@tarojs/taro'
import { refreshSessionAccess, isMerchantRoute } from '@/services/auth'

/** 商家页 onShow：服务端校验权限，撤销后立即退出 B 端 */
export function useMerchantAccessGuard() {
  useDidShow(() => {
    void (async () => {
      const pages = getCurrentPages()
      const current = pages[pages.length - 1]
      const route = current?.route || ''
      if (!isMerchantRoute(route)) return
      await refreshSessionAccess({ forceExitMerchant: true })
    })()
  })
}
