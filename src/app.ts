import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { initCloud } from './services/cloud'

import './app.less'

// 初始化云开发
initCloud()

const App = createApp({
  onShow(options) {
  },
})

App.use(createPinia())

export default App
