/**
 * 全库 103 品种 · 完整度审计
 * - L0：有 care 底稿（玫瑰走 wikiRoseCare，其余走 blocks care.*.vase_base）
 * - L1/L2：前端 overlay 层级（同 audit-wiki-completeness-local.js）
 */
const fs = require('fs')
const path = require('path')
const { CUT_FLOWER_CATALOG } = require('../cloudfunctions/common/flowerCatalogCut')
const {
  ROSE_KIND_NAME,
  assessRoseCareComplete,
  getRoseCareForVariety,
} = require('../cloudfunctions/wiki/wikiRoseCare')
const { careBlockId } = require('./wiki-kind-care-slugs')

const VARIETIES_DIR = path.join(__dirname, '../src/data/wiki/varieties')
const BLOCKS_PATH = path.join(__dirname, '../src/data/wiki/blocks.json')

function loadOverlays() {
  const indexPath = path.join(VARIETIES_DIR, 'index.ts')
  const src = fs.readFileSync(indexPath, 'utf8')
  const importByVar = new Map()
  for (const m of src.matchAll(/import (\w+) from '\.\/([^']+)'/g)) {
    importByVar.set(m[1], m[2])
  }
  const overlays = new Map()
  for (const m of src.matchAll(/'([^']+)':\s*(\w+)/g)) {
    const key = m[1]
    const varName = m[2]
    const file = importByVar.get(varName)
    if (!file) continue
    const fullPath = path.join(VARIETIES_DIR, file)
    if (!fs.existsSync(fullPath)) continue
    overlays.set(key, JSON.parse(fs.readFileSync(fullPath, 'utf8')))
  }
  return overlays
}

function assessOverlayLevel(overlay) {
  if (!overlay) return { level: '-', missing: '无 overlay' }
  const missing = []
  const bloom = overlay.bloom || {}
  const atlas = overlay.atlas || {}
  const lang = overlay.language || {}
  const intro = atlas.intro

  if (!bloom.vase) missing.push('bloom.vase')
  if (!intro?.identity) missing.push('atlas.intro.identity')
  if (!lang.meaning) missing.push('language.meaning')
  if (!(lang.paragraphs?.length || lang.summary)) missing.push('language.body')

  const hasCare =
    overlay.careBaseRef || Object.keys(overlay.careVaseOverride || {}).length

  if (intro?.identity && lang.meaning && bloom.vase && (lang.paragraphs?.length || lang.summary)) {
    return { level: 'L2', missing: missing.length ? missing.join(', ') : '-' }
  }
  if (hasCare) {
    return { level: 'L1', missing: missing.length ? missing.join(', ') : '-' }
  }
  return { level: 'L0', missing: missing.join(', ') || '仅云库预期' }
}

function hasKindCareL0(kindName) {
  if (kindName === ROSE_KIND_NAME) return true
  const blocks = JSON.parse(fs.readFileSync(BLOCKS_PATH, 'utf8'))
  const ref = careBlockId(kindName)
  if (!ref) return false
  const block = blocks[ref]
  return Boolean(block?.summary)
}

function main() {
  const overlays = loadOverlays()
  const byKind = {}

  for (const entry of CUT_FLOWER_CATALOG) {
    const key = `${entry.kind}::${entry.variety}`
    const ol = overlays.get(key)
    const olLevel = assessOverlayLevel(ol)
    let careL0 = '?'
    if (entry.kind === ROSE_KIND_NAME) {
      careL0 = assessRoseCareComplete(getRoseCareForVariety(entry.variety)).complete ? '✓' : '✗'
    } else {
      careL0 = hasKindCareL0(entry.kind) ? '✓' : '✗'
    }

    if (!byKind[entry.kind]) {
      byKind[entry.kind] = { total: 0, l0: 0, l1: 0, l2: 0, overlay: 0 }
    }
    const bucket = byKind[entry.kind]
    bucket.total += 1
    if (careL0 === '✓') bucket.l0 += 1
    if (ol) bucket.overlay += 1
    if (olLevel.level === 'L1') bucket.l1 += 1
    if (olLevel.level === 'L2') bucket.l2 += 1
  }

  console.log('=== 全库摘要（103 品种）===')
  const rows = Object.entries(byKind)
    .sort(([a], [b]) => a.localeCompare(b, 'zh'))
    .map(([kind, s]) => ({
      种类: kind,
      品种数: s.total,
      养护L0: s.l0,
      overlay: s.overlay,
      L2: s.l2,
      L1: s.l1,
    }))
  console.table(rows)

  const total = CUT_FLOWER_CATALOG.length
  const overlayCount = [...overlays.keys()].length
  let l2 = 0
  let l1 = 0
  for (const entry of CUT_FLOWER_CATALOG) {
    const lv = assessOverlayLevel(overlays.get(`${entry.kind}::${entry.variety}`)).level
    if (lv === 'L2') l2 += 1
    if (lv === 'L1') l1 += 1
  }

  console.log(`\n前端 overlay：${overlayCount}/${total}`)
  console.log(`内容 L2：${l2} · L1：${l1}`)
  console.log(`\n命令：npm run audit:wiki-catalog`)
}

main()
