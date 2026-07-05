/**
 * 批量生成玫瑰 L1 overlay JSON（bloom.vase + careBaseRef + 品种摘要）
 * 已存在 L2/L1 专文（弗洛伊德/卡罗拉/艾莎）的跳过。
 */
const fs = require('fs')
const path = require('path')
const { CUT_FLOWER_CATALOG } = require('../cloudfunctions/common/flowerCatalogCut')

const VARIETIES_DIR = path.join(__dirname, '../src/data/wiki/varieties')
const SKIP = new Set(['弗洛伊德', '卡罗拉', '艾莎'])

/** variety → 文件名 slug（不含 rose- 前缀） */
const SLUG_BY_VARIETY = {
  戴安娜: 'diana',
  粉雪山: 'pink-avalanche',
  蜜桃雪山: 'peach-avalanche',
  白雪山: 'white-avalanche',
  粉红雪山: 'sweet-avalanche',
  香槟玫瑰: 'champagne',
  金枝玉叶: 'golden-leaf',
  金辉: 'jin-hui',
  闪耀: 'shan-yao',
  橙芭比: 'orange-barbie',
  果汁泡泡: 'juice-bubble',
  狂欢泡泡: 'carnival-bubble',
  迷雾泡泡: 'misty-bubble',
  巧克力泡泡: 'chocolate-bubble',
  猪小姐: 'miss-piggy',
  朱丽叶: 'juliet',
  卡布奇诺: 'cappuccino',
  太妃糖: 'toffee',
  曼塔: 'menta',
  流沙: 'quicksand',
  火灵鸟: 'firebird',
  弗洛伊德: 'pink-floyd',
  卡罗拉: 'carola',
  艾莎: 'aisha',
}

function buildCareSummary(variety, color, features) {
  const f = features || []
  if (f.includes('多头')) {
    return `${variety}为多头发散状切花，分枝多需预留瓶口空间，勤换水可延长整体观赏期。`
  }
  if (f.includes('复色') || f.includes('复色条纹')) {
    return `${color}复色玫瑰，避直射可减缓边色褪色，日常勤换水、斜剪根。`
  }
  if (f.includes('奥斯汀花型')) {
    return `${variety}为奥斯汀杯状花型，收到后充分醒花再插瓶，避免挤压花头。`
  }
  if (f.includes('会变色')) {
    return `${variety}开放过程中色调会变化，阴凉通风、勤换水可稳定观赏期。`
  }
  if (f.includes('丝绒感') || f.includes('丝绒质感')) {
    return `${color}丝绒质感玫瑰，忌触碰挤压花瓣，勤换水可保持花型。`
  }
  if (variety.includes('雪山')) {
    return `${variety}花头大、瓣层多，醒花建议不少于 4 小时，勤换水可延长瓶插期。`
  }
  return `${color}切花玫瑰，勤换水、斜剪根、避直射与乙烯，可稳定保持观赏期。`
}

function buildCareTips(variety, features) {
  const f = features || []
  const tips = []
  if (f.includes('多头')) {
    tips.push('多头发散，勿过度捆扎茎部影响吸水')
    tips.push('枯谢小头及时剪除，可延长整体观赏')
  }
  if (f.includes('奥斯汀花型')) {
    tips.push('重瓣开放度大，运输后先深水醒花再插瓶')
  }
  if (f.includes('会变色')) {
    tips.push('开放后期色调会变浅，属正常现象')
  }
  if (f.includes('低饱和') || f.includes('莫兰迪色系')) {
    tips.push('低饱和色系避强光，可减缓褪色')
  }
  if (variety === '香槟玫瑰') {
    tips.push('香槟色系对水质敏感，建议每日换水')
  }
  return tips.length ? tips.slice(0, 2) : undefined
}

function buildOverlay(entry) {
  const { variety, color, features } = entry
  const summary = buildCareSummary(variety, color, features)
  const tips = buildCareTips(variety, features)
  const careVaseOverride = { summary }
  if (tips?.length) careVaseOverride.tips = tips

  return {
    bloom: {
      vase: '约 7—10 天',
      vaseNote: '勤换水、斜剪根可稳定观赏期',
    },
    careBaseRef: 'care.rose.vase_base',
    careVaseOverride,
  }
}

function toImportVar(slug) {
  return `rose${slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')}`
}

function main() {
  const roses = CUT_FLOWER_CATALOG.filter((item) => item.kind === '玫瑰')
  let created = 0
  let skipped = 0

  for (const entry of roses) {
    const slug = SLUG_BY_VARIETY[entry.variety]
    if (!slug) {
      console.warn(`缺少 slug：${entry.variety}`)
      continue
    }
    const fileName = `rose-${slug}.json`
    const filePath = path.join(VARIETIES_DIR, fileName)
    if (SKIP.has(entry.variety)) {
      skipped += 1
      continue
    }
    if (fs.existsSync(filePath)) {
      console.log(`已存在，跳过：${fileName}`)
      skipped += 1
      continue
    }
    fs.writeFileSync(filePath, `${JSON.stringify(buildOverlay(entry), null, 2)}\n`, 'utf8')
    console.log(`生成：${fileName}`)
    created += 1
  }

  const indexLines = [
    "import type { WikiVarietyOverlay } from '@/types/wikiBlocks'",
    "import { wikiEntryIdentityKey } from '@/types/wiki'",
  ]
  const overlayEntries = []

  for (const entry of roses) {
    const slug = SLUG_BY_VARIETY[entry.variety]
    const importVar = toImportVar(slug)
    indexLines.push(`import ${importVar} from './rose-${slug}.json'`)
    overlayEntries.push(`  '玫瑰::${entry.variety}': ${importVar} as WikiVarietyOverlay,`)
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
  console.log(`\nindex.ts 已更新（${roses.length} 品种）`)
  console.log(`新建 ${created} 个 · 跳过 ${skipped} 个`)
}

main()
