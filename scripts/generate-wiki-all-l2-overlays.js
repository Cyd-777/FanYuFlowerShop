/**
 * 全库 L2 对齐：保留已有 L2 / 手写标杆，其余从 catalog 模板生成
 *
 * 用法：node scripts/generate-wiki-all-l2-overlays.js [--force]
 */
const fs = require('fs')
const path = require('path')
const { CUT_FLOWER_CATALOG } = require('../cloudfunctions/common/flowerCatalogCut')
const { HANDWRITTEN_L2_CONTENT } = require('./l2-handwritten')
const { buildL2FromCatalog } = require('./wiki-l2-catalog-builder')
const { assessOverlayLevel } = require('./wiki-l2-assess')
const { kindFilePrefix } = require('./wiki-kind-care-slugs')
const VARIETY_CARE_OVERRIDES = require('./wiki-variety-care-overrides')

const VARIETIES_DIR = path.join(__dirname, '../src/data/wiki/varieties')
const HANDWRITTEN = HANDWRITTEN_L2_CONTENT
const force = process.argv.includes('--force')

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

function loadOverlayFile(filePath) {
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function siblingsFor(entry) {
  return CUT_FLOWER_CATALOG.filter((e) => e.kind === entry.kind)
}

function applyVarietyCareOverrides(key, overlay) {
  const issues = VARIETY_CARE_OVERRIDES[key]
  if (!issues?.length) return overlay
  return {
    ...overlay,
    careVaseOverride: {
      ...(overlay.careVaseOverride || {}),
      commonIssues: issues,
    },
  }
}

function main() {
  let handwritten = 0
  let generated = 0
  let skipped = 0
  let missing = 0

  for (const entry of CUT_FLOWER_CATALOG) {
    const key = `${entry.kind}::${entry.variety}`
    const filePath = path.join(VARIETIES_DIR, `${entryFileSlug(entry)}.json`)
    const existing = loadOverlayFile(filePath)
    const existingLevel = assessOverlayLevel(existing).level

    if (HANDWRITTEN[key]) {
      const payload = applyVarietyCareOverrides(key, HANDWRITTEN[key])
      fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
      console.log(`手写 L2：${path.basename(filePath)} (${key})`)
      handwritten += 1
      continue
    }

    if (existingLevel === 'L2' && !force) {
      skipped += 1
      continue
    }

    const overlay = buildL2FromCatalog(entry, siblingsFor(entry))
    if (!overlay) {
      console.warn(`无法生成：${key}`)
      missing += 1
      continue
    }

    fs.writeFileSync(filePath, `${JSON.stringify(overlay, null, 2)}\n`, 'utf8')
    console.log(`模板 L2：${path.basename(filePath)} (${key})`)
    generated += 1
  }

  console.log(`\n完成：手写 ${handwritten} · 模板 ${generated} · 跳过已有 L2 ${skipped} · 失败 ${missing}`)
  if (missing) process.exitCode = 1
}

main()
