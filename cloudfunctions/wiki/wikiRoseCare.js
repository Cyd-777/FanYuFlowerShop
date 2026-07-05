/**
 * 玫瑰 · 瓶插养护（结构化词条）
 * 试点范围：种类通用底稿 + 少数品种 override；其余 24 个玫瑰品种继承底稿。
 */

const { pickCareVaseSection } = require('./wikiCarePick')

const ROSE_KIND_NAME = '玫瑰'

/** 玫瑰种类 · 齐备养护底稿（所有玫瑰品种默认继承） */
const ROSE_CARE_BASE = {
  summary: '切花玫瑰以勤换水、斜剪根、避直射与乙烯为基础；收到后先醒花再日常养护。',
  wakeUp: {
    summary: '收到花后先深水醒花，待花瓣硬挺再插瓶。',
    steps: [
      '拆掉外包装、保水棉和网套',
      '保留花头附近 1—2 片观赏叶，其余叶片全部摘除，确保无叶浸水',
      '用打刺钳去掉茎刺，避免大面积刮伤茎皮',
      '用锋利花剪以 45° 斜角剪掉根部 2—4 cm',
      '桶中加水至约 4/5，花头离水面 10—15 cm，切勿沾水',
      '阴凉通风处静置 4—8 小时，待花瓣变硬挺',
    ],
    trim: '45° 斜角剪掉根部 2—4 cm',
    trimPosition: '保留花头附近 1—2 片观赏叶，其余摘除',
    waterDepth: '醒花桶水位约 4/5',
    headClearance: '花头距离水面约 10—15 cm，切勿沾水',
    duration: '4—8 小时',
    environment: '阴凉通风处',
  },
  waterChange: '每日换水；每次换水用洗洁精或稀释 84 清洗花瓶内壁',
  trim: '每次换水重新斜剪根部 1—2 cm，剪出新鲜吸水切口',
  trimPosition: '切口保持在水面以上；确保无叶浸水',
  waterDepth: '日常花瓶水位 1/2—2/3，没过茎部切口 2—3 cm',
  environment: {
    light: '明亮散射光，避开阳光直射',
    airflow: '通风良好，远离空调出风口',
    placement: '勿放在暖气上方或暴晒窗台',
    avoid: [
      '与苹果、香蕉等释放乙烯气体的成熟水果放在一起',
      '避免强气流直吹花头',
    ],
  },
  additives: '可加通用鲜花保鲜剂；水质易浑时可滴 1—2 滴 84',
  emergency: {
    title: '烫根急救',
    steps: [
      '用报纸包裹花头以下部分，仅露出根部切口',
      '浸入沸水中 30—60 秒',
      '随后立刻放回深水中，可挽救花头萎蔫',
    ],
  },
  tips: ['重瓣玫瑰更忌叶片浸水', '发现花瓣外缘发软应尽早换水剪根'],
}

/**
 * 试点品种 · 养护 override（仅写与底稿不同的部分）
 * 弗洛伊德：完整专文；卡罗拉 / 艾莎：代表性微调，用于验证 inherit + override
 */
const ROSE_VARIETY_CARE = {
  弗洛伊德: {
    summary: '弗洛伊德对水质极为敏感，养护到位是延长花期的关键。',
    waterChange:
      '每日换水；弗洛伊德对水质极为敏感，不换水极易导致烂瓣；每次换水须彻底清洗花瓶',
    waterDepth: '日常花瓶水位维持在 1/2 到 2/3',
    environment: {
      light: '避开阳光直射',
      airflow: '远离空调出风口',
      avoid: ['与苹果、香蕉等释放乙烯气体的成熟水果放在一起'],
    },
  },
  卡罗拉: {
    summary: '经典高杯红玫瑰，勤换水可稳定保持花型。',
    tips: ['丝绒质感花瓣忌触碰与挤压', '花头较大，醒花时间建议不少于 4 小时'],
  },
  艾莎: {
    summary: '复色边玫瑰，瓶插期对水质与剪根同样敏感。',
    trimPosition: '复色品种更忌叶浸水，仅保留花头附近少量健康叶',
    tips: ['边色品种避免阳光直射以防褪色过快'],
  },
}

const ROSE_PILOT_BLOOM = {
  弗洛伊德: {
    vase: '夏季约 7—10 天，冬季悉心照料可至 15 天',
    vaseNote: '花期长短直接取决于养护是否到位',
    vaseBySeason: [
      { season: '夏季', days: '约 7—10 天' },
      { season: '冬季', days: '约 10—15 天', note: '悉心照料下' },
    ],
  },
}

/** 养护词条齐备检查项（玫瑰试点） */
const ROSE_CARE_REQUIRED_PATHS = [
  ['summary'],
  ['wakeUp', 'steps'],
  ['waterChange'],
  ['trim'],
  ['waterDepth'],
  ['environment'],
  ['additives'],
]

function isRoseKind(kindName) {
  return String(kindName || '').trim() === ROSE_KIND_NAME
}

function deepGet(obj, path) {
  let cur = obj
  for (const key of path) {
    if (!cur || typeof cur !== 'object') return undefined
    cur = cur[key]
  }
  return cur
}

function hasCarePath(care, path) {
  const value = deepGet(care, path)
  if (Array.isArray(value)) return value.length > 0
  if (value && typeof value === 'object') {
    return Object.values(value).some((item) => {
      if (Array.isArray(item)) return item.length > 0
      return Boolean(String(item || '').trim())
    })
  }
  return Boolean(String(value || '').trim())
}

function assessRoseCareComplete(careVase) {
  const missing = ROSE_CARE_REQUIRED_PATHS.filter((path) => !hasCarePath(careVase, path))
  return {
    complete: missing.length === 0,
    missing: missing.map((path) => path.join('.')),
  }
}

function getRoseCareForVariety(varietyName) {
  const name = String(varietyName || '').trim()
  const override = name ? ROSE_VARIETY_CARE[name] : null
  return pickCareVaseSection(override || {}, ROSE_CARE_BASE)
}

function getRoseBloomForVariety(varietyName) {
  const name = String(varietyName || '').trim()
  return name && ROSE_PILOT_BLOOM[name] ? { ...ROSE_PILOT_BLOOM[name] } : null
}

function applyRoseCareToDraft(draft, varietyName) {
  if (!draft) return draft
  draft.careVase = getRoseCareForVariety(varietyName)
  const bloom = getRoseBloomForVariety(varietyName)
  if (bloom) {
    draft.bloom = { ...(draft.bloom || {}), ...bloom }
  }
  return draft
}

function mergeRoseCareIntoArticle(article, varietyName) {
  if (!article) {
    return { careVase: getRoseCareForVariety(varietyName) }
  }
  const merged = { ...article }
  merged.careVase = getRoseCareForVariety(varietyName)
  const bloom = getRoseBloomForVariety(varietyName)
  if (bloom) merged.bloom = { ...(merged.bloom || {}), ...bloom }
  return merged
}

module.exports = {
  ROSE_KIND_NAME,
  ROSE_CARE_BASE,
  ROSE_VARIETY_CARE,
  ROSE_CARE_REQUIRED_PATHS,
  isRoseKind,
  assessRoseCareComplete,
  getRoseCareForVariety,
  getRoseBloomForVariety,
  applyRoseCareToDraft,
  mergeRoseCareIntoArticle,
}
