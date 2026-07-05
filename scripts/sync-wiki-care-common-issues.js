/**
 * 将 wiki-care-common-issues.js 写入 blocks.json 各 care.*.vase_base
 * 用法：node scripts/sync-wiki-care-common-issues.js
 */
const fs = require('fs')
const path = require('path')
const ISSUES = require('./wiki-care-common-issues')

const BLOCKS_PATH = path.join(__dirname, '../src/data/wiki/blocks.json')
const blocks = JSON.parse(fs.readFileSync(BLOCKS_PATH, 'utf8'))

let patched = 0
for (const [ref, issues] of Object.entries(ISSUES)) {
  if (!blocks[ref]) {
    console.warn(`跳过未知块：${ref}`)
    continue
  }
  blocks[ref].commonIssues = issues
  patched += 1
  console.log(`commonIssues → ${ref}（${issues.length} 条）`)
}

fs.writeFileSync(BLOCKS_PATH, `${JSON.stringify(blocks, null, 2)}\n`, 'utf8')
console.log(`\n完成：${patched} 个养护底稿`)
