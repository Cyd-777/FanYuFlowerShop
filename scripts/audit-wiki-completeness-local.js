/**
 * 本地审计：智库词条完整度（弗洛伊德范文 = L2）
 * - L0：瓶插天数 + 玫瑰养护底稿齐备
 * - L1：有前端 overlay（care override 或富内容）
 * - L2：overlay 含 atlas.intro + language.meaning + bloom.vase
 */
const fs = require('fs')
const path = require('path')
const { CUT_FLOWER_CATALOG } = require('../cloudfunctions/common/flowerCatalogCut')
const {
  ROSE_KIND_NAME,
  assessRoseCareComplete,
  getRoseCareForVariety,
  ROSE_VARIETY_CARE,
} = require('../cloudfunctions/wiki/wikiRoseCare')

const VARIETIES_DIR = path.join(__dirname, '../src/data/wiki/varieties')

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
    overlay.careBaseRef || overlay.careVaseOverride || Object.keys(overlay.careVaseOverride || {}).length

  if (intro?.identity && lang.meaning && bloom.vase && (lang.paragraphs?.length || lang.summary)) {
    return { level: 'L2', missing: missing.length ? missing.join(', ') : '-' }
  }
  if (hasCare || overlay.careVaseOverride) {
    return { level: 'L1', missing: missing.length ? missing.join(', ') : '-' }
  }
  return { level: 'L0', missing: missing.join(', ') || '仅云库预期' }
}

function main() {
  const overlays = loadOverlays()
  const roseVarieties = [
    ...new Set(
      CUT_FLOWER_CATALOG.filter((item) => item.kind === ROSE_KIND_NAME).map((item) => item.variety),
    ),
  ].sort()

  console.log('=== 前端 overlay 注册 ===')
  const overlayKeys = [...overlays.keys()]
  console.log(overlayKeys.length ? overlayKeys.join('\n') : '（无）')
  console.log('')

  console.log('=== 玫瑰 · 养护 L0（种类底稿 + override）===')
  let careOk = 0
  const careRows = roseVarieties.map((variety) => {
    const care = getRoseCareForVariety(variety)
    const check = assessRoseCareComplete(care)
    if (check.complete) careOk += 1
    const overlayKey = `${ROSE_KIND_NAME}::${variety}`
    const ol = overlays.get(overlayKey)
    const olLevel = assessOverlayLevel(ol)
    return {
      variety,
      careL0: check.complete ? '✓' : '✗',
      careMissing: check.missing.join(', ') || '-',
      cloudPilot: ROSE_VARIETY_CARE[variety] ? '✓' : '-',
      appOverlay: ol ? '✓' : '-',
      contentLevel: olLevel.level,
      overlayGap: olLevel.missing,
    }
  })
  console.table(careRows)
  console.log(`养护 L0 齐备：${careOk}/${roseVarieties.length}`)
  console.log('')

  const l2 = careRows.filter((r) => r.contentLevel === 'L2').length
  const l1 = careRows.filter((r) => r.contentLevel === 'L1').length
  const withOverlay = careRows.filter((r) => r.appOverlay === '✓').length

  console.log('=== 摘要 ===')
  console.log(`前端 overlay：${withOverlay}/${roseVarieties.length} 品种`)
  console.log(`内容 L2（弗洛伊德档）：${l2} · L1：${l1}`)
  console.log('')
  console.log('下一步：为标杆品种添加 src/data/wiki/varieties/*.json 并在 index.ts 注册')
  console.log('  npm run audit:wiki-completeness')

  if (careOk !== roseVarieties.length) {
    process.exitCode = 1
  }
}

main()
