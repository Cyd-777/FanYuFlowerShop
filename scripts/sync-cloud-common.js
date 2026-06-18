/**
 * 微信上传云函数时通常只打包单个函数目录，../common 在云端不可用。
 * 将 common/cacheMeta.js 同步到各云函数 ./common/ 后再部署。
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '../cloudfunctions')
const src = path.join(root, 'common/cacheMeta.js')
const targets = ['goods', 'category', 'shop', 'meta', 'flower', 'wiki', 'seedDemo']

if (!fs.existsSync(src)) {
  console.error('[sync-cloud-common] missing', src)
  process.exit(1)
}

for (const name of targets) {
  const dir = path.join(root, name, 'common')
  fs.mkdirSync(dir, { recursive: true })
  fs.copyFileSync(src, path.join(dir, 'cacheMeta.js'))
  console.log('[sync-cloud-common]', name, '← common/cacheMeta.js')
}
