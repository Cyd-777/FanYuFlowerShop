import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { initCloud } from './services/cloud'
import { fetchCacheVersions } from './utils/cache/meta'
import { useCartStore } from './stores/cart'
import { cacheSyncScheduler } from './data'

import './app.less'

const pinia = createPinia()

const App = createApp({
  onLaunch() {
    try {
      initCloud()
      void fetchCacheVersions().catch((err) => {
        console.warn('[cache] launch meta prefetch failed:', err)
      })
    } catch (err) {
      console.error('[cloud] init failed:', err)
    }
  },
  onShow() {
    useCartStore().refreshBadge()
    cacheSyncScheduler.onAppShow()
  },
  onHide() {
    cacheSyncScheduler.onAppHide()
  },
})

App.use(pinia)

export default App
