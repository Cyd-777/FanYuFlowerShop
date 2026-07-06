import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { initCloud } from './services/cloud'
import { fetchCacheVersions } from './utils/cache/meta'
import { useCartStore } from './stores/cart'
import { useNotificationStore } from './stores/notification'
import { useUserStore } from './stores/user'
import { hasToken, refreshSessionAccess } from './services/auth'
import { cacheSyncScheduler } from './data'
import { prefetchHomeFirstScreen } from './data/prefetch/homeFirstScreen'
import { notifyAppResume } from './utils/goodsImage'

import './app.less'

const pinia = createPinia()

const App = createApp({
  onLaunch() {
    try {
      initCloud()
      void import('@/modules/notify').then((m) => m.prefetchSubscribeTmplIds())
      void fetchCacheVersions().catch((err) => {
        console.warn('[cache] launch meta prefetch failed:', err)
      })
      // 推迟到首帧之后，避免阻塞 AppService 启动导致 devtools timeout
      setTimeout(() => {
        prefetchHomeFirstScreen()
      }, 0)
    } catch (err) {
      console.error('[cloud] init failed:', err)
    }
  },
  onError(err: string) {
    console.error('[app] onError:', err)
  },
  onUnhandledRejection(res: { reason?: unknown }) {
    console.error('[app] unhandled rejection:', res?.reason)
  },
  onShow() {
    notifyAppResume()
    useCartStore().refreshBadge()
    useNotificationStore().refreshBadge({ silent: true })
    cacheSyncScheduler.onAppShow()
    if (hasToken()) {
      void refreshSessionAccess({ forceExitMerchant: true }).then((session) => {
        if (session) useUserStore().syncSession(session)
      })
    }
  },
  onHide() {
    cacheSyncScheduler.onAppHide()
  },
})

App.use(pinia)

export default App
