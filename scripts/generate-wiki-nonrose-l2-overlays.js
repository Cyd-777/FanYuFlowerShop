/**
 * 写入非玫瑰 L2 标杆 overlay（覆盖对应 L1 JSON）
 */
const fs = require('fs')
const path = require('path')
const { CUT_FLOWER_CATALOG } = require('../cloudfunctions/common/flowerCatalogCut')
const { NONROSE_L2_CONTENT } = require('./nonrose-l2-content')
const { LILY_L2_CONTENT } = require('./lily-l2-content')
const ALL_L2_CONTENT = { ...NONROSE_L2_CONTENT, ...LILY_L2_CONTENT }
const { kindFilePrefix } = require('./wiki-kind-care-slugs')

const VARIETIES_DIR = path.join(__dirname, '../src/data/wiki/varieties')

function aliasToSlug(alias) {
  return String(alias || '')
    .replace(/'/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function entryFileSlug(entry) {
  const prefix = kindFilePrefix(entry.kind)
  const alias = entry.aliases?.[0]
  return `${prefix}-${alias ? aliasToSlug(alias) : aliasToSlug(entry.variety)}`
}

function main() {
  let written = 0
  const missing = []

  for (const [key, content] of Object.entries(ALL_L2_CONTENT)) {
    const [kind, variety] = key.split('::')
    const entry = CUT_FLOWER_CATALOG.find((e) => e.kind === kind && e.variety === variety)
    if (!entry) {
      missing.push(key)
      continue
    }
    const filePath = path.join(VARIETIES_DIR, `${entryFileSlug(entry)}.json`)
    fs.writeFileSync(filePath, `${JSON.stringify(content, null, 2)}\n`, 'utf8')
    console.log(`写入 L2：${path.basename(filePath)} (${key})`)
    written += 1
  }

  console.log(`\n完成：${written} 篇 L2`)
  if (missing.length) {
    console.warn('未找到 catalog 条目：', missing.join(', '))
    process.exitCode = 1
  }
}

main()
