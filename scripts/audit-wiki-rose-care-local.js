/**
 * 本地审计：玫瑰品种养护词条是否齐备（不连云库）
 */
const path = require('path')
const { CUT_FLOWER_CATALOG } = require('../cloudfunctions/common/flowerCatalogCut')
const {
  ROSE_KIND_NAME,
  ROSE_VARIETY_CARE,
  assessRoseCareComplete,
  getRoseCareForVariety,
} = require('../cloudfunctions/wiki/wikiRoseCare')

function main() {
  const roseVarieties = [
    ...new Set(
      CUT_FLOWER_CATALOG.filter((item) => item.kind === ROSE_KIND_NAME).map((item) => item.variety),
    ),
  ].sort()

  console.log(`[audit-wiki-rose-care] 玫瑰品种 ${roseVarieties.length} 个`)
  console.log(`试点 override：${Object.keys(ROSE_VARIETY_CARE).join('、') || '无'}\n`)

  let complete = 0
  const rows = roseVarieties.map((name) => {
    const care = getRoseCareForVariety(name)
    const check = assessRoseCareComplete(care)
    if (check.complete) complete += 1
    return {
      variety: name,
      complete: check.complete,
      missing: check.missing.join(', ') || '-',
      pilot: Boolean(ROSE_VARIETY_CARE[name]),
    }
  })

  console.table(rows)
  console.log(`\n齐备：${complete}/${roseVarieties.length}`)
  if (complete !== roseVarieties.length) {
    process.exitCode = 1
  }
}

main()
