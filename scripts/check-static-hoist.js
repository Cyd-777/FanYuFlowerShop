/**
 * 构建后扫描：Vue 静态节点优化在微信小程序会导致白屏
 */
const fs = require('fs')
const path = require('path')

const DIST = path.join(__dirname, '../dist')
const PATTERNS = [
  /\buE\(/,
  /createStaticVNode/,
  /createStaticNode/,
]

function walkJs(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = fs.statSync(full)
    if (st.isDirectory()) walkJs(full, acc)
    else if (name.endsWith('.js') && name !== 'vendors.js' && name !== 'taro.js') acc.push(full)
  }
  return acc
}

function main() {
  if (!fs.existsSync(DIST)) {
    console.warn('[check-static] dist/ 不存在，跳过')
    return
  }

  const hits = []
  for (const file of walkJs(DIST)) {
    const src = fs.readFileSync(file, 'utf8')
    for (const pattern of PATTERNS) {
      if (pattern.test(src)) {
        hits.push(`${path.relative(DIST, file)} (${pattern})`)
        break
      }
    }
  }

  if (hits.length) {
    console.error('[check-static] ❌ 发现静态节点优化产物，真机可能白屏：')
    hits.forEach((f) => console.error(`  - ${f}`))
    process.exit(1)
  }

  console.log('[check-static] 页面 bundle 无 uE / createStaticVNode / createStaticNode')
}

main()
