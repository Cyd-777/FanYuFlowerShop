/**
 * 构建前/后扫描：微信小程序不支持的 Vue 模板结构
 * - <text> 内不能直接嵌套 <block> / <view>（真机白屏）
 * - 纯静态中文块未绑定 {{ }}（易触发静态节点优化）
 */
const fs = require('fs')
const path = require('path')

const SRC = path.join(__dirname, '../src')
const TEXT_BLOCK_RE = /<text\b[^>]*>\s*<\s*(block|view)\b/g
const STATIC_CN_TEXT_RE = /<(text|view|button)\b[^>]*>\s*[\u4e00-\u9fff][^<{]{1,80}\s*<\/\1>/g

function walkVue(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = fs.statSync(full)
    if (st.isDirectory()) walkVue(full, acc)
    else if (name.endsWith('.vue')) acc.push(full)
  }
  return acc
}

function checkFile(file) {
  const rel = path.relative(SRC, file)
  const content = fs.readFileSync(file, 'utf8')
  const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/)
  if (!templateMatch) return []
  const template = templateMatch[1]
  const issues = []

  TEXT_BLOCK_RE.lastIndex = 0
  if (TEXT_BLOCK_RE.test(template)) {
    issues.push('text 内嵌 block/view（小程序不支持）')
  }

  STATIC_CN_TEXT_RE.lastIndex = 0
  let staticHit
  while ((staticHit = STATIC_CN_TEXT_RE.exec(template)) !== null) {
    const snippet = staticHit[0].replace(/\s+/g, ' ').slice(0, 60)
    issues.push(`静态中文未绑定: ${snippet}`)
  }

  return issues.map((msg) => ({ rel, msg }))
}

function main() {
  const hits = []
  for (const file of walkVue(SRC)) {
    hits.push(...checkFile(file))
  }

  const critical = hits.filter((item) => item.msg.includes('text 内嵌'))
  const warnings = hits.filter((item) => !item.msg.includes('text 内嵌'))

  if (critical.length) {
    console.error('[check-mp-template] ❌ 发现小程序不兼容模板（会导致白屏）：')
    critical.forEach(({ rel, msg }) => console.error(`  - ${rel}: ${msg}`))
    process.exit(1)
  }

  if (warnings.length) {
    console.warn('[check-mp-template] ⚠️ 静态中文未绑定（建议改为 script 常量 + {{ }}）：')
    warnings.slice(0, 12).forEach(({ rel, msg }) => console.warn(`  - ${rel}: ${msg}`))
    if (warnings.length > 12) {
      console.warn(`  … 另有 ${warnings.length - 12} 处`)
    }
  }

  console.log('[check-mp-template] 无 text 嵌 block/view 致命问题')
}

main()
