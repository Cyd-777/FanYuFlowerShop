import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { initCloud } from './services/cloud'
import { fetchCacheVersions } from './utils/cache/meta'
import { useCartStore } from './stores/cart'
import { useUserStore } from './stores/user'
import { hasToken, refreshSessionAccess } from './services/auth'
import { cacheSyncScheduler } from './data'
import { prefetchHomeFirstScreen } from './data/prefetch/homeFirstScreen'

import './app.less'

const pinia = createPinia()

const App = createApp({
  onLaunch() {
    try {
      initCloud()
      void fetchCacheVersions().catch((err) => {
        console.warn('[cache] launch meta prefetch failed:', err)
      })
      prefetchHomeFirstScreen()
    } catch (err) {
      console.error('[cloud] init failed:', err)
    }
  },
  onShow() {
    useCartStore().refreshBadge()
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
