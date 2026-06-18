const fs = require('fs')
const path = require('path')

const TAB_NAMES = ['home', 'category', 'wiki', 'cart', 'mine']
const SRC_DIR = path.join(__dirname, '../src/images/tab')
const DIST_DIR = path.join(__dirname, '../dist/images/tab')

function copyTabIcons() {
  if (!fs.existsSync(SRC_DIR)) {
    console.warn('[tab-icons] missing src/images/tab, run npm run generate:tab-icons')
    return false
  }

  fs.mkdirSync(DIST_DIR, { recursive: true })
  let ok = true

  for (const name of TAB_NAMES) {
    for (const suffix of ['', '-active']) {
      const file = `${name}${suffix}.png`
      const src = path.join(SRC_DIR, file)
      const dest = path.join(DIST_DIR, file)
      if (!fs.existsSync(src)) {
        console.warn(`[tab-icons] missing ${src}`)
        ok = false
        continue
      }
      fs.copyFileSync(src, dest)
      const size = fs.statSync(dest).size
      if (size < 100) {
        console.warn(`[tab-icons] suspicious size ${file}: ${size} bytes`)
        ok = false
      }
    }
  }

  if (ok) {
    console.log('[tab-icons] dist/images/tab ready (10 icons)')
  }
  return ok
}

module.exports = { copyTabIcons }

if (require.main === module) {
  copyTabIcons()
}
