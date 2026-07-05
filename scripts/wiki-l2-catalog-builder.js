/**
 * 从 flowerCatalogCut + wikiKindProfiles 生成 L2 overlay（弗洛伊德范文结构）
 */
const { WIKI_KIND_PROFILES } = require('../cloudfunctions/wiki/wikiKindProfiles')
const { careBlockId, KIND_CARE_SLUG } = require('./wiki-kind-care-slugs')

const REGIONS = ['region.yunnan', 'region.colombia', 'region.ecuador']
const SEASON_SUMMER_WINTER = [
  { season: '夏季', days: '约 7—10 天' },
  { season: '冬季', days: '约 10—14 天', note: '室温较低、养护得当时' },
]

const FEATURE_TRAIT = {
  浓香: 'trait.strong_scent',
  淡香: 'trait.gentle_scent',
  清香: 'trait.gentle_scent',
  卷瓣: 'trait.recurved_petal',
  花瓣反卷: 'trait.recurved_petal',
  花大: 'trait.huge_flower',
  纯白: 'trait.pure_white',
  正红: 'trait.classic_red',
  渐变: 'trait.gradient_warm',
  渐变粉: 'trait.soft_pink',
  多头: 'trait.multi_head',
  花量大: 'trait.spray_huge',
  重瓣: 'trait.huge_flower',
  复古: 'trait.muted_retro',
  莫兰迪: 'trait.morandi',
  团状: 'trait.spray_ball',
  高脚杯: 'trait.cup_trumpet',
  喜冷凉: 'trait.cool_season',
}

const COLOR_TRAIT = {
  红: 'trait.classic_red',
  白: 'trait.pure_white',
  黄: 'trait.yellow_gold',
  粉: 'trait.soft_pink',
  香槟: 'trait.champagne_tone',
}

const KIND_GROUP = {
  郁金香: 'group.tulip_single',
  绣球: 'group.hydrangea_mophead',
  芍药: 'group.herbaceous_peony',
}

const OCCASION_BY_FEATURE = {
  母亲节: '母亲节',
  教师节: '教师节',
  婚礼: '婚礼',
  悼念: '悼念',
  春节: '春节',
  开业: '开业',
  庆典: '庆典',
  日常: '日常家居',
  探望: '探望',
  应季: '应季赠礼',
}

function taxonomyRef(kind) {
  const slug = KIND_CARE_SLUG[kind]
  return slug ? `taxonomy.${slug}` : undefined
}

function scientificName(entry, profile) {
  const alias = entry.aliases?.[0]
  if (alias && /^[A-Za-z]/.test(alias) && !alias.includes(' ')) {
    const genus = profile.names?.scientificName?.split(' ')[0] || entry.kind
    return `${genus} '${alias}'`
  }
  if (alias && /^[A-Za-z]/.test(alias)) {
    return alias.includes("'") ? alias : `${profile.names?.scientificName?.split(' ')[0] || ''} '${alias}'`
  }
  const base = profile.names?.scientificName || entry.kind
  return `${base}（${entry.variety}）`
}

function resolveScent(features, kind) {
  const f = features || []
  if (f.includes('浓香')) return '浓香，室内插瓶时较为明显'
  if (f.includes('无香')) return '几乎无香'
  if (f.includes('淡香') || f.includes('清香')) return '淡香'
  if (kind === '风信子') return '浓香，室内插瓶时明显'
  if (kind === '百合') return '因品种而异，东方/OT 系多浓香'
  if (kind === '配叶' || kind === '盆栽') return '几乎无花香气'
  return '淡香或几乎无香'
}

function featureRefs(entry) {
  const refs = []
  const f = entry.features || []
  for (const tag of f) {
    const ref = FEATURE_TRAIT[tag]
    if (ref && !refs.includes(ref)) refs.push(ref)
  }
  const colorRef = COLOR_TRAIT[entry.color?.replace(/\/.*|多色.*/, '')]
  if (colorRef && !refs.includes(colorRef)) refs.push(colorRef)
  if (entry.color === '多色' && f.includes('多头')) refs.push('trait.multi_head')
  return refs.slice(0, 4)
}

function colorDescription(entry) {
  const { variety, color, features } = entry
  const f = features || []
  const parts = []
  if (color && color !== '多色') parts.push(`${color}色调`)
  else if (color === '多色') parts.push('色彩丰富')
  if (f.includes('渐变') || f.includes('渐变粉')) parts.push('开放过程或瓣缘可见渐变层次')
  if (f.includes('复古') || f.includes('莫兰迪')) parts.push('色调偏复古/莫兰迪，辨识度较高')
  if (f.includes('多头') || f.includes('花量大')) parts.push('多朵同枝开放，花量感强')
  if (f.includes('重瓣')) parts.push('重瓣层叠，开放后饱满')
  if (f.includes('团状')) parts.push('团状花球，整体轮廓圆润')
  if (parts.length) return `${parts.join('，')}，是花店「${variety}」的常见视觉特征`
  return `${color || ''}${variety}，${entry.kind}切花常见商业品种`.replace(/^，/, '')
}

function buildCareSummary(entry) {
  const { kind, variety, features } = entry
  const f = features || []
  if (kind === '配叶') return `${variety}为常用配叶，保持清洁水质与通风，部分品种可倒挂制干花。`
  if (kind === '盆栽') return `${variety}以盆栽观赏为主，见干见湿、明亮散射光、忌积水。`
  if (f.includes('多头') || f.includes('花量大')) {
    return `${variety}为多头发散或花量大的${kind}，预留瓶口空间，勤换水可延长观赏。`
  }
  if (kind === '郁金香') return `${variety}郁金香喜冷凉，浅水养护，花茎会继续生长可每日微调。`
  if (kind === '绣球') return `${variety}绣球喜湿润，切花需充足吸水，可喷雾保湿，茎部可十字剪。`
  if (kind === '芍药' || f.includes('变色')) {
    return `${variety}开放过程色调可能变化，阴凉通风、浅水养护可稳定观赏期。`
  }
  if (kind === '洋桔梗') return `${variety}洋桔梗花瓣娇嫩，轻拿轻放，清洁水质、避免挤压折瓣。`
  if (kind === '马蹄莲') return `${variety}马蹄莲佛焰苞易损，浅水养护，避免触碰挤压。`
  if (kind === '向日葵') return `${variety}向日葵花盘较重，需高瓶支撑，勤换水保证吸水。`
  return `${variety}，勤换水、斜剪根、避直射与乙烯，可稳定保持观赏期。`
}

function buildCareTips(entry) {
  const { kind, variety, features } = entry
  const f = features || []
  const tips = []
  if (kind === '郁金香') {
    tips.push('花茎会继续伸长，可每日修剪高度')
    tips.push('避免与成熟水果同放')
  }
  if (kind === '绣球') tips.push('吸水不足时可十字剪或烫茎急救')
  if (kind === '康乃馨' && f.includes('多头')) tips.push('枯谢小头及时剪除')
  if (kind === '配叶' && variety === '尤加利') tips.push('可倒挂风干制干花')
  if (kind === '盆栽') {
    tips.push('忌叶心长期积水（如蝴蝶兰）')
    tips.push('礼品包装注意底部通风')
  }
  if (f.includes('变色')) tips.push('开放后期色调变化属正常现象')
  if (kind === '百合' && f.includes('浓香')) tips.push('可摘除花蕊减少花粉沾染')
  return tips.slice(0, 2)
}

function buildBloom(entry) {
  const profile = WIKI_KIND_PROFILES[entry.kind]
  const vase = profile?.bloom?.vase || '约 5—10 天'
  let vaseNote = `${entry.variety}，勤换水、斜剪根可稳定观赏期`
  if (entry.kind === '盆栽') vaseNote = '盆栽观赏为主，养护见 care 说明'
  if (entry.kind === '配叶') vaseNote = '叶材保持清洁水质与通风'
  const bloom = { vase, vaseNote }
  if (entry.kind !== '盆栽' && entry.kind !== '配叶' && /约 \d/.test(vase)) {
    bloom.vaseBySeason = SEASON_SUMMER_WINTER
  }
  return bloom
}

function buildOccasions(entry, profile) {
  const fromFeatures = (entry.features || [])
    .map((f) => OCCASION_BY_FEATURE[f])
    .filter(Boolean)
  const fromProfile = profile.language?.occasions || []
  let merged = [...new Set([...fromFeatures, ...fromProfile.slice(0, 3)])]
  if (!merged.length) merged = ['日常家居', '赠礼']
  return merged.slice(0, 6)
}

function colorMeaning(entry, profile) {
  const color = entry.color || '多色'
  const fromProfile = profile.language?.colorMeanings?.find(
    (c) => color.includes(c.color) || c.color.includes(color.replace(/\/.*$/, '')),
  )
  if (fromProfile) return { color: fromProfile.color, meaning: fromProfile.meaning }
  return { color, meaning: profile.language?.meaning?.split('、')[0] || '美好祝愿' }
}

function buildMeaning(entry, profile) {
  const { variety, color } = entry
  const base = profile.language?.meaning || '美好祝愿'
  if (entry.kind === '配叶') return `${variety} · 层次、风格与「把花束撑起来」`
  if (entry.kind === '盆栽') return `${variety} · 日常陪伴与「可养可赏」`
  return `${variety} · ${color !== '多色' ? color + '调' : ''}${base.split('、')[0] || base}`
}

function buildParagraphs(entry, profile) {
  const { variety, kind, color, features } = entry
  const f = features || []
  const occasions = buildOccasions(entry, profile)

  if (kind === '配叶') {
    return [
      `${variety}是花店极常用的配叶/叶材——它不负责「抢主花」，但负责让花束立刻有层次、有风格。北欧、森系、热带、法式混搭都常见到它。`,
      `部分品种可倒挂制干花；收到后保持清洁水质与通风即可。与${kind === '配叶' ? '玫瑰、百合' : '主花'}同插时，注意叶量不要压过主花。`,
    ]
  }
  if (kind === '盆栽') {
    return [
      `${variety}以盆栽观赏为主，适合办公室、家居与礼品场景——与切花不同，它强调的是「可以养很久」的陪伴感。`,
      `见干见湿、明亮散射光、忌积水是通用原则；礼品包装时注意底部通风，避免闷根。`,
    ]
  }

  const p1 = `${variety}的${colorDescription(entry).replace(/，是花店.*$/, '')}，在花店语境里${f.includes('母亲节') ? '与母亲节、感恩场景高度绑定' : f.includes('婚礼') ? '是婚礼与庆典常见选择' : f.includes('应季') ? '带有明显应季属性' : `是${kind}切花的常见商业品种`}。`
  const p2 = `适合${occasions.slice(0, 4).join('、')}等场合；与同类${kind}或经典配花（尤加利、洋桔梗、康乃馨）同插，能做出稳定而不俗的层次。`
  return [p1, p2]
}

function buildPairing(entry, siblings) {
  const { variety, kind } = entry
  const others = siblings.filter((s) => s.variety !== variety).slice(0, 2)
  const pairing = [
    {
      style: '经典搭配',
      flowers: others.length ? others.map((s) => s.variety) : ['尤加利叶'],
      note: `与${kind}经典配花同插，层次稳定`,
    },
  ]
  if (kind === '配叶') {
    pairing[0] = { style: '森系主花', flowers: ['玫瑰', '洋桔梗'], note: '叶材衬托主花' }
  }
  return pairing
}

function buildCaution(entry) {
  const { kind, features } = entry
  const f = features || []
  if (kind === '盆栽') return '盆栽忌积水与暴晒；运输后缓苗再常规养护。'
  if (kind === '配叶') return '部分叶材易黄化，须勤换水、通风。'
  if (f.includes('浓香')) return '浓香品种；过敏者、密闭空间慎选。'
  if (kind === '郁金香') return '郁金香花茎会继续生长，瓶口勿过窄；远离暖气。'
  if (kind === '绣球') return '绣球吸水大，缺水时易萎蔫；可十字剪急救。'
  if (kind === '洋桔梗') return '花瓣娇嫩，避免挤压与花瓣沾水。'
  if (f.includes('变色')) return '开放过程色调变化属正常现象，避直射可减缓。'
  return '避免与成熟水果同放（乙烯）；保持水质清洁。'
}

function buildDistinguishFrom(entry, siblings) {
  const others = siblings.filter((s) => s.variety !== entry.variety)
  const picked = []
  for (const s of others) {
    if (s.color !== entry.color && picked.length < 2) {
      picked.push({
        name: s.variety,
        difference: `${s.color || '不同'}色调/花型，而非${entry.color || '本品种'}的辨识特征`,
      })
    }
  }
  if (picked.length < 2) {
    for (const s of others) {
      if (!picked.find((p) => p.name === s.variety) && picked.length < 2) {
        picked.push({ name: s.variety, difference: `同为${entry.kind}，市场命名与色调不同` })
      }
    }
  }
  picked.push({
    name: entry.variety,
    difference: `${entry.color || ''}${entry.variety}，是${entry.kind}切花常见辨识之一`,
  })
  return picked.slice(0, 3)
}

function buildMorphology(entry, profile) {
  const kind = entry.kind
  if (kind === '配叶') {
    return {
      color: colorDescription(entry),
      stem: '茎干可用于插花线条与层次',
      foliage: `${entry.variety}叶片/枝条为主要观赏部位`,
      scent: resolveScent(entry.features, kind),
    }
  }
  if (kind === '盆栽') {
    return {
      color: colorDescription(entry),
      stem: '以盆栽株形与叶片/花朵整体观赏为主',
      foliage: '观叶或观花因品种而异',
      scent: resolveScent(entry.features, kind),
    }
  }
  return {
    petalCount: kind === '康乃馨' ? '花瓣边缘呈锯齿状，层叠繁密' : undefined,
    bloomDiameterCm: kind === '康乃馨' ? '6 至 8' : kind === '郁金香' ? '7 至 9' : '8 至 14',
    color: colorDescription(entry),
    stem:
      kind === '康乃馨'
        ? '茎节明显，需撕去下部叶片'
        : kind === '向日葵'
          ? '茎干粗壮，花盘较重，需高瓶支撑'
          : '茎干挺直，常规瓶插即可',
    foliage: '叶片健康即可保留少量，避免浸水',
    scent: resolveScent(entry.features, kind),
  }
}

/**
 * @param {object} entry catalog 条目
 * @param {object[]} siblings 同种类其余品种
 */
function buildL2FromCatalog(entry, siblings = []) {
  const profile = WIKI_KIND_PROFILES[entry.kind]
  if (!profile) return null

  const careRef = careBlockId(entry.kind)
  if (!careRef) return null

  const alias = entry.aliases?.[0]
  const sci = scientificName(entry, profile)
  const tips = buildCareTips(entry)
  const careVaseOverride = { summary: buildCareSummary(entry) }
  if (tips.length) careVaseOverride.tips = tips

  const cm = colorMeaning(entry, profile)
  const morphology = buildMorphology(entry, profile)
  Object.keys(morphology).forEach((k) => morphology[k] === undefined && delete morphology[k])

  const group = KIND_GROUP[entry.kind]
  const identity = {
    scientificName: sci,
    namingNote: `花店语境里「${entry.variety}」${alias ? `（${alias}）` : ''}为${entry.kind}切花常见商业品种`,
  }
  if (group) identity.horticulturalGroup = group

  const names = [alias, entry.variety].filter(Boolean)
  const uniqueNames = [...new Set(names)]

  const overlay = {
    bloom: buildBloom(entry),
    careBaseRef: careRef,
    careVaseOverride,
    atlas: {
      intro: {
        taxonomyRef: taxonomyRef(entry.kind),
        identity,
        origin: {
          breedingOrigin: entry.kind === '郁金香' || entry.kind === '百合' ? '荷兰' : '商业化种植',
          productionRegions: entry.kind === '配叶' || entry.kind === '盆栽' ? ['region.yunnan'] : REGIONS,
        },
        morphology,
      },
      featureRefs: featureRefs(entry),
      distinguishFrom: buildDistinguishFrom(entry, siblings),
    },
    language: {
      meaning: buildMeaning(entry, profile),
      paragraphs: buildParagraphs(entry, profile),
      occasions: buildOccasions(entry, profile),
      colorMeanings: [cm],
      pairing: buildPairing(entry, siblings),
      caution: buildCaution(entry),
    },
  }

  if (uniqueNames.length) {
    overlay.names = {
      scientificName: sci,
      commonNames: uniqueNames,
    }
  }

  return overlay
}

module.exports = { buildL2FromCatalog }
