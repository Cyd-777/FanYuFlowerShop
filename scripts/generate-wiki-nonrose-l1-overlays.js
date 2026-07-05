/**
 * 非玫瑰 79 品种 · L1 overlay（bloom + careBaseRef + 品种摘要）
 * 并重生成 varieties/index.ts（含玫瑰 24 + 非玫瑰 79 = 103）
 */
const fs = require('fs')
const path = require('path')
const { CUT_FLOWER_CATALOG } = require('../cloudfunctions/common/flowerCatalogCut')
const { WIKI_KIND_PROFILES } = require('../cloudfunctions/wiki/wikiKindProfiles')
const { careBlockId, kindFilePrefix } = require('./wiki-kind-care-slugs')

const VARIETIES_DIR = path.join(__dirname, '../src/data/wiki/varieties')
const ROSE_KIND = '玫瑰'

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
  const varietyPart = alias ? aliasToSlug(alias) : aliasToSlug(entry.variety)
  return `${prefix}-${varietyPart || 'variety'}`
}

function buildCareSummary(entry) {
  const { kind, variety, color, features } = entry
  const f = features || []

  if (kind === '配叶') {
    return `${variety}为常用配叶，保持清洁水质与通风，部分品种可倒挂制干花。`
  }
  if (kind === '盆栽') {
    return `${variety}以盆栽观赏为主，见干见湿、明亮散射光、忌积水。`
  }
  if (f.includes('多头') || f.includes('花量大')) {
    return `${variety}为多头发散或花量大的${kind}，预留瓶口空间，勤换水可延长观赏。`
  }
  if (f.includes('浓香') && kind === '百合') {
    return `${variety}浓香，去除花蕊可减少花粉污染；勤换水、通风。`
  }
  if (f.includes('无香') && kind === '百合') {
    return `${variety}几乎无香，适合花香敏感者；勤换水、斜剪根即可。`
  }
  if (kind === '郁金香') {
    return `${variety}郁金香喜冷凉，浅水养护，花茎会继续生长可每日微调。`
  }
  if (kind === '绣球') {
    return `${variety}绣球喜湿润，切花需充足吸水，可喷雾保湿，茎部可十字剪。`
  }
  if (kind === '芍药' || f.includes('变色')) {
    return `${variety}开放过程色调可能变化，阴凉通风、浅水养护可稳定观赏期。`
  }
  if (kind === '洋桔梗') {
    return `${variety}洋桔梗花瓣娇嫩，轻拿轻放，清洁水质、避免挤压折瓣。`
  }
  if (kind === '马蹄莲') {
    return `${variety}马蹄莲佛焰苞易损，浅水养护，避免触碰挤压。`
  }
  if (kind === '向日葵') {
    return `${variety}向日葵花盘较重，需高瓶支撑，勤换水保证吸水。`
  }
  if (f.includes('可制干花') || f.includes('干花')) {
    return `${variety}耐插也适合制干花，保持通风、避免潮湿闷热。`
  }
  return `${variety}，勤换水、斜剪根、避直射与乙烯，可稳定保持观赏期。`
}

function buildCareTips(entry) {
  const { kind, variety, features } = entry
  const f = features || []
  const tips = []

  if (kind === '百合' && f.includes('浓香')) {
    tips.push('可摘除花蕊减少花粉沾染')
  }
  if (kind === '百合' && (variety === '铁炮百合' || f.includes('喇叭形'))) {
    tips.push('喇叭形百合花头较大，醒花建议 4 小时以上')
  }
  if (kind === '郁金香') {
    tips.push('花茎会继续伸长，可每日修剪高度')
    tips.push('避免与成熟水果同放')
  }
  if (kind === '绣球') {
    tips.push('吸水不足时可十字剪或烫茎急救')
  }
  if (kind === '康乃馨' && f.includes('多头')) {
    tips.push('枯谢小头及时剪除')
  }
  if (kind === '菊花' && variety === '非洲菊') {
    tips.push('花茎中空，宜高瓶支撑')
  }
  if (kind === '配叶' && variety === '尤加利') {
    tips.push('可倒挂风干制干花')
  }
  if (kind === '盆栽') {
    tips.push('忌叶心长期积水（如蝴蝶兰）')
    tips.push('礼品包装注意底部通风')
  }
  if (f.includes('变色')) {
    tips.push('开放后期色调变化属正常现象')
  }

  return tips.length ? tips.slice(0, 2) : undefined
}

function buildBloom(entry) {
  const profile = WIKI_KIND_PROFILES[entry.kind]
  const vase = profile?.bloom?.vase || '约 5—10 天'
  let vaseNote = '勤换水、斜剪根可稳定观赏期'
  if (entry.kind === '盆栽') {
    vaseNote = '盆栽观赏为主，养护见 care 说明'
  }
  if (entry.kind === '配叶') {
    vaseNote = '叶材保持清洁水质与通风'
  }
  return { vase, vaseNote }
}

function buildOverlay(entry) {
  const careRef = careBlockId(entry.kind)
  if (!careRef) return null

  const summary = buildCareSummary(entry)
  const tips = buildCareTips(entry)
  const careVaseOverride = { summary }
  if (tips?.length) careVaseOverride.tips = tips

  return {
    bloom: buildBloom(entry),
    careBaseRef: careRef,
    careVaseOverride,
  }
}

function toImportVar(fileSlug) {
  return `v${fileSlug.replace(/-/g, '_')}`
}

function main() {
  const roses = CUT_FLOWER_CATALOG.filter((e) => e.kind === ROSE_KIND)
  const nonRoses = CUT_FLOWER_CATALOG.filter((e) => e.kind !== ROSE_KIND)

  const slugByKey = new Map()
  for (const entry of CUT_FLOWER_CATALOG) {
    slugByKey.set(`${entry.kind}::${entry.variety}`, entryFileSlug(entry))
  }

  let written = 0
  let skipped = 0

  for (const entry of nonRoses) {
    const fileSlug = slugByKey.get(`${entry.kind}::${entry.variety}`)
    const fileName = `${fileSlug}.json`
    const filePath = path.join(VARIETIES_DIR, fileName)
    const overlay = buildOverlay(entry)
    if (!overlay) {
      console.warn(`跳过：${entry.kind}::${entry.variety}`)
      skipped += 1
      continue
    }
    fs.writeFileSync(filePath, `${JSON.stringify(overlay, null, 2)}\n`, 'utf8')
    console.log(`生成 L1：${fileName}`)
    written += 1
  }

  const indexLines = [
    "import type { WikiVarietyOverlay } from '@/types/wikiBlocks'",
    "import { wikiEntryIdentityKey } from '@/types/wiki'",
  ]
  const overlayEntries = []

  for (const entry of CUT_FLOWER_CATALOG) {
    const fileSlug = slugByKey.get(`${entry.kind}::${entry.variety}`)
    const importVar = toImportVar(fileSlug)
    indexLines.push(`import ${importVar} from './${fileSlug}.json'`)
    overlayEntries.push(`  '${entry.kind}::${entry.variety}': ${importVar} as WikiVarietyOverlay,`)
  }

  indexLines.push(
    '',
    'const OVERLAYS: Record<string, WikiVarietyOverlay> = {',
    ...overlayEntries,
    '}',
    '',
    'export function getWikiVarietyOverlay(',
    '  kindName: string,',
    '  varietyName: string,',
    '): WikiVarietyOverlay | null {',
    '  const key = wikiEntryIdentityKey({ kindName, varietyName })',
    '  return OVERLAYS[key] || null',
    '}',
    '',
  )

  fs.writeFileSync(path.join(VARIETIES_DIR, 'index.ts'), indexLines.join('\n'), 'utf8')

  console.log(`\n非玫瑰 L1：新建/覆盖 ${written} · 跳过 ${skipped}`)
  console.log(`index.ts：${CUT_FLOWER_CATALOG.length} 品种（玫瑰 ${roses.length} + 非玫瑰 ${nonRoses.length}）`)
}

main()
