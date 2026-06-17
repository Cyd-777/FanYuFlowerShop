import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { initCloud } from './services/cloud'

import './app.less'

const pinia = createPinia()

const App = createApp({
  onLaunch() {
    try {
      initCloud()
    } catch (err) {
      console.error('[cloud] init failed:', err)
    }
  },
  onShow() {},
})

App.use(pinia)

export default App
