/**
 * 为手写标杆 overlay 补 atlas.cultivar（弗洛伊德等跳过 rose-l2 生成的品种）
 */
const fs = require('fs')
const path = require('path')

const VAR = path.join(__dirname, '../src/data/wiki/varieties')
const GROUP_LABEL = {
  'group.hybrid_tea': '杂交茶香月季 Hybrid Tea',
  'group.english_rose': '英国蔷薇 English Rose',
  'group.spray_rose': '多头切花玫瑰',
  'group.hydrangea_mophead': '大花绣球',
  'group.herbaceous_peony': '草本芍药',
  'group.tulip_single': '单瓣郁金香',
  'group.oriental_lily': '东方百合',
  'group.ot_lily': 'OT 杂交百合',
}

const FILES = [
  'rose-pink-floyd.json',
  'rose-juliet.json',
  'rose-diana.json',
  'rose-cappuccino.json',
  'rose-carola.json',
]

function ensureCultivar(overlay) {
  if (overlay?.atlas?.cultivar?.horticulturalGroup) return overlay
  const intro = overlay?.atlas?.intro
  if (!intro?.identity) return overlay
  const gid = intro.identity.horticulturalGroup
  return {
    ...overlay,
    atlas: {
      ...overlay.atlas,
      cultivar: {
        horticulturalGroup: GROUP_LABEL[gid] || intro.identity.horticulturalGroup || '',
        breeder: intro.identity.breeder,
        introducedYear: intro.identity.introducedYear,
        namingNote: intro.identity.namingNote,
      },
    },
  }
}

let patched = 0
for (const file of FILES) {
  const fp = path.join(VAR, file)
  if (!fs.existsSync(fp)) continue
  const raw = JSON.parse(fs.readFileSync(fp, 'utf8'))
  const next = ensureCultivar(raw)
  if (JSON.stringify(next) !== JSON.stringify(raw)) {
    fs.writeFileSync(fp, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
    console.log(`补 cultivar：${file}`)
    patched += 1
  }
}
console.log(`完成：${patched} 篇`)
