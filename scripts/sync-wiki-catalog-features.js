/**
 * 从 flowerCatalogCut 生成 src/data/wiki/varietyCatalogFeatures.ts
 */
const fs = require('fs')
const path = require('path')
const { CUT_FLOWER_CATALOG } = require('../cloudfunctions/common/flowerCatalogCut')

const outPath = path.join(__dirname, '../src/data/wiki/varietyCatalogFeatures.ts')
const lines = [
  '/** 由 flowerCatalogCut 生成，供卡片 tag 回退 · npm run sync:wiki-catalog-features */',
  'export const WIKI_CATALOG_FEATURES: Record<string, string[]> = {',
]
for (const e of CUT_FLOWER_CATALOG) {
  lines.push(`  '${e.kind}::${e.variety}': ${JSON.stringify(e.features || [])},`)
}
lines.push('}', '')
fs.writeFileSync(outPath, lines.join('\n'))
console.log(`写入 ${CUT_FLOWER_CATALOG.length} 条 → ${outPath}`)
