/**
 * 方案 A：构建后检查主包体积，防止 NutUI 误入主包导致超限
 */
const fs = require('fs')
const path = require('path')

const DIST = path.join(__dirname, '../dist')
const MAIN_LIMIT_KB = 2048
const WARN_KB = 1600
const VENDORS_WARN_BYTES = 200 * 1024

const SUBPACKAGE_DIRS = new Set(['pagesCustomer', 'pagesMerchant'])
const CODE_EXT = /\.(js|wxss|wxml|json|png|wxs)$/

function walkMainBytes(dir, rel = '') {
  let total = 0
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = fs.statSync(full)
    if (st.isDirectory()) {
      if (!rel && SUBPACKAGE_DIRS.has(name)) continue
      total += walkMainBytes(full, rel ? path.join(rel, name) : name)
    } else if (CODE_EXT.test(name) && !name.endsWith('.map') && !name.endsWith('.LICENSE.txt')) {
      total += st.size
    }
  }
  return total
}

function main() {
  if (!fs.existsSync(DIST)) {
    console.warn('[check-main] dist/ 不存在，跳过检查')
    return
  }

  const mainKb = Math.round(walkMainBytes(DIST) / 1024)
  const vendorsPath = path.join(DIST, 'vendors.js')
  const vendorsBytes = fs.existsSync(vendorsPath) ? fs.statSync(vendorsPath).size : 0
  const vendorsKb = Math.round(vendorsBytes / 1024)

  console.log(`[check-main] 主包约 ${mainKb}KB（上限 ${MAIN_LIMIT_KB}KB），vendors.js ${vendorsKb}KB`)

  if (vendorsBytes > VENDORS_WARN_BYTES) {
    console.warn(
      '[check-main] ⚠️ vendors.js 偏大，主包可能引用了 NutUI。请检查 src/pages/ 下是否使用 nut-* 组件。',
    )
  }

  if (mainKb > MAIN_LIMIT_KB) {
    console.error('[check-main] ❌ 主包超过微信 2048KB 限制，真机上传会失败。')
    process.exit(1)
  }

  if (mainKb > WARN_KB) {
    console.warn('[check-main] ⚠️ 主包已接近上限，请避免在主包新增 NutUI 或大资源。')
  }
}

main()
