/**
 * 微信上传云函数时通常只打包单个函数目录，../common 在云端不可用。
 * 将 common/cacheMeta.js 同步到各云函数 ./common/ 后再部署。
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '../cloudfunctions')
const srcDir = path.join(root, 'common')
const commonFiles = ['cacheMeta.js', 'fileUrls.js', 'accessControl.js', 'authIdentifier.js', 'account.js', 'db.js', 'flowerCatalogCut.js', 'flowerCatalogMerge.js', 'flowerSeed.js', 'ensureFlowerCatalog.js', 'wikiExcluded.js', 'wikiKindMatch.js']
const targets = [
  'goods',
  'category',
  'shop',
  'meta',
  'flower',
  'wiki',
  'seedDemo',
  'order',
  'favorite',
  'login',
  'staff',
]

for (const file of commonFiles) {
  const src = path.join(srcDir, file)
  if (!fs.existsSync(src)) {
    console.error('[sync-cloud-common] missing', src)
    process.exit(1)
  }
}

for (const name of targets) {
  const dir = path.join(root, name, 'common')
  fs.mkdirSync(dir, { recursive: true })
  for (const file of commonFiles) {
    fs.copyFileSync(path.join(srcDir, file), path.join(dir, file))
    console.log('[sync-cloud-common]', name, '← common/' + file)
  }
}
