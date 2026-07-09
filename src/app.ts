import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { initCloud } from './services/cloud'
import { fetchCacheVersions } from './utils/cache/meta'
import { useCartStore } from './stores/cart'
import { useNotificationStore } from './stores/notification'
import { useUserStore } from './stores/user'
import { hasToken, refreshSessionAccess } from '@/modules/auth'
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
      // 首屏后加载 AI 小文件（词条向量，~1.2MB）
      setTimeout(() => {
        void import('@/utils/wikiVectorSearch').then((m) => {
          m.preloadEmbeddings().catch((err) => {
            console.warn('[app] preload AI embeddings failed:', err)
          })
        })
      }, 100)
      // 空闲时加载 AI 模型（23MB ONNX）
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => {
          void import('@/utils/wikiVectorSearch').then((m) => {
            m.preloadModel().catch((err) => {
              console.warn('[app] idle preload AI model failed:', err)
            })
          })
        }, { timeout: 10000 })
      } else {
        // 不支持 requestIdleCallback 的旧版本，延迟 5s 后加载
        setTimeout(() => {
          void import('@/utils/wikiVectorSearch').then((m) => {
            m.preloadModel().catch(() => {})
          })
        }, 5000)
      }
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
