/**
 * 将 scripts/rose-l2-content.js 写入 src/data/wiki/varieties/*.json
 * 已手写 L2（弗洛伊德 / 朱丽叶 / 戴安娜 / 卡布奇诺）跳过。
 */
const fs = require('fs')
const path = require('path')
const { CUT_FLOWER_CATALOG } = require('../cloudfunctions/common/flowerCatalogCut')
const { ROSE_L2_CONTENT } = require('./rose-l2-content')

const GROUP_LABEL = {
  'group.hybrid_tea': '杂交茶香月季 Hybrid Tea',
  'group.english_rose': '英国蔷薇 English Rose',
  'group.spray_rose': '多头切花玫瑰',
}

function ensureRoseCultivar(content) {
  const atlas = content?.atlas
  if (!atlas || atlas.cultivar?.horticulturalGroup) return content
  const intro = atlas.intro
  const groupId = intro?.identity?.horticulturalGroup || 'group.hybrid_tea'
  return {
    ...content,
    atlas: {
      ...atlas,
      cultivar: {
        horticulturalGroup: GROUP_LABEL[groupId] || '杂交茶香月季',
        breeder: intro?.identity?.breeder,
        introducedYear: intro?.identity?.introducedYear,
        namingNote: intro?.identity?.namingNote,
      },
    },
  }
}

const DEFAULT_ROSE_BREEDER = '厄瓜多尔 / 荷兰商业切花玫瑰培育'

function ensureRoseBreeder(content) {
  const intro = content?.atlas?.intro
  const identity = intro?.identity
  if (!identity || identity.breeder) return content
  return {
    ...content,
    atlas: {
      ...content.atlas,
      intro: {
        ...intro,
        identity: {
          ...identity,
          breeder: DEFAULT_ROSE_BREEDER,
        },
      },
    },
  }
}

/** 批次 2 · 玫瑰推出年代（年代区间，非精确育种年） */
const ROSE_INTRODUCED_YEAR = {
  蜜桃雪山: '1990 年代',
  白雪山: '1990 年代',
  粉红雪山: '1990 年代',
  香槟玫瑰: '2000 年代',
  金枝玉叶: '2000 年代',
  金辉: '2000 年代',
  闪耀: '2000 年代',
  橙芭比: '2010 年代',
  果汁泡泡: '2010 年代',
  狂欢泡泡: '2010 年代',
  迷雾泡泡: '2010 年代',
  巧克力泡泡: '2010 年代',
  猪小姐: '2010 年代',
  太妃糖: '2010 年代',
  曼塔: '2010 年代',
  流沙: '2010 年代',
  火灵鸟: '2010 年代',
}

function ensureRoseIntroducedYear(content, variety) {
  const intro = content?.atlas?.intro
  const identity = intro?.identity
  const era = ROSE_INTRODUCED_YEAR[variety]
  if (!identity || identity.introducedYear || !era) return content
  return {
    ...content,
    atlas: {
      ...content.atlas,
      intro: {
        ...intro,
        identity: { ...identity, introducedYear: era },
      },
    },
  }
}

function enrichRoseContent(content, variety) {
  return ensureRoseCultivar(ensureRoseBreeder(ensureRoseIntroducedYear(content, variety)))
}

const VARIETIES_DIR = path.join(__dirname, '../src/data/wiki/varieties')
const SKIP = new Set(['弗洛伊德', '朱丽叶', '戴安娜', '卡布奇诺'])

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

function main() {
  const roses = CUT_FLOWER_CATALOG.filter((item) => item.kind === '玫瑰')
  let written = 0
  let skipped = 0
  let missing = 0

  for (const { variety } of roses) {
    const slug = SLUG_BY_VARIETY[variety]
    if (!slug) {
      console.warn(`缺少 slug：${variety}`)
      missing += 1
      continue
    }
    if (SKIP.has(variety)) {
      skipped += 1
      continue
    }
    const content = ROSE_L2_CONTENT[variety]
    if (!content) {
      console.warn(`缺少 L2 内容：${variety}`)
      missing += 1
      continue
    }
    const overlay = enrichRoseContent(
      {
        careBaseRef: 'care.rose.vase_base',
        ...content,
      },
      variety,
    )
    const filePath = path.join(VARIETIES_DIR, `rose-${slug}.json`)
    fs.writeFileSync(filePath, `${JSON.stringify(overlay, null, 2)}\n`, 'utf8')
    console.log(`写入 L2：rose-${slug}.json`)
    written += 1
  }

  console.log(`\n完成：写入 ${written} · 跳过手写 ${skipped} · 缺失 ${missing}`)
  if (missing) process.exitCode = 1
}

main()
