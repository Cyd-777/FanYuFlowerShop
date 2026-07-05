/**
 * 从 cloudfunctions/wiki/wikiKindProfiles.js 同步种类养护底稿 → blocks.json
 * 键名：care.{slug}.vase_base
 */
const fs = require('fs')
const path = require('path')
const { WIKI_KIND_PROFILES } = require('../cloudfunctions/wiki/wikiKindProfiles')
const { KIND_CARE_SLUG } = require('./wiki-kind-care-slugs')

const BLOCKS_PATH = path.join(__dirname, '../src/data/wiki/blocks.json')

const GENERIC_WAKE_UP = {
  summary: '收到花材后先整理去叶、斜剪根，再插瓶养护。',
  steps: [
    '拆掉外包装与保水棉',
    '去除会浸水的下部叶片，保留上部健康叶',
    '用锋利花剪斜剪根部 2—3 cm',
    '花瓶加清水，花头勿沾水',
    '阴凉通风处静置 2—4 小时（花头较硬挺可直接插瓶）',
  ],
  trim: '斜剪根部 2—3 cm',
  trimPosition: '去除浸水叶片，切口保持在水面以上',
  waterDepth: '水深约花瓶 1/3，没过茎部切口 2—3 cm',
  duration: '2—4 小时',
  environment: '阴凉通风处',
}

const FOLIAGE_WAKE_UP = {
  summary: '叶材收到后斜剪根部，清洁水质即可。',
  steps: ['斜剪根部 1—2 cm', '去除浸水叶片', '浅水插瓶，保持通风'],
  trim: '斜剪根部 1—2 cm',
  trimPosition: '去除浸水叶片',
  waterDepth: '浅水养护，水深约花瓶 1/4',
  duration: '1—2 小时',
  environment: '通风良好',
}

function isPottedKind(kindName) {
  return kindName === '盆栽'
}

function enrichCareVase(kindName, careVase) {
  const base = { ...(careVase || {}) }
  if (isPottedKind(kindName)) {
    return base
  }
  if (!base.wakeUp) {
    base.wakeUp = kindName === '配叶' ? FOLIAGE_WAKE_UP : GENERIC_WAKE_UP
  }
  if (!base.waterChange) {
    base.waterChange = '每日或隔日换水，保持水质清洁'
  }
  if (!base.trim) base.trim = '斜剪根部 1—2 cm，剪出新鲜切口'
  if (!base.trimPosition) {
    base.trimPosition = '切口保持在水面以上；确保无叶浸水'
  }
  if (!base.waterDepth) {
    base.waterDepth = /浅水|见干见湿/.test(String(base.waterChange))
      ? '浅水养护，水深约花瓶 1/4—1/3'
      : '水深约花瓶 1/3，没过茎部切口 2—3 cm'
  }
  if (!base.environment && typeof base.environment !== 'object') {
    base.environment = {
      light: '明亮散射光，避开阳光直射',
      airflow: '通风良好，远离空调出风口',
      avoid: ['与成熟水果同放（乙烯催熟）', '避免强气流直吹'],
    }
  }
  if (!base.additives) {
    base.additives = '可加通用鲜花保鲜剂'
  }
  return base
}

function main() {
  const blocks = JSON.parse(fs.readFileSync(BLOCKS_PATH, 'utf8'))

  for (const [kindName, slug] of Object.entries(KIND_CARE_SLUG)) {
    if (slug === 'rose') continue
    const profile = WIKI_KIND_PROFILES[kindName]
    if (!profile?.careVase) {
      console.warn(`跳过（无 careVase）：${kindName}`)
      continue
    }
    const blockId = `care.${slug}.vase_base`
    blocks[blockId] = enrichCareVase(kindName, profile.careVase)
    console.log(`同步：${blockId}`)
  }

  fs.writeFileSync(BLOCKS_PATH, `${JSON.stringify(blocks, null, 2)}\n`, 'utf8')
  console.log('\nblocks.json 已更新')
}

main()
