/**
 * 手写 L2 专文 · 共享构建（弗洛伊德 / 马斯特档字段结构）
 */
const REGIONS = ['region.yunnan', 'region.colombia', 'region.ecuador']
const VARIETY_CARE_OVERRIDES = require('../wiki-variety-care-overrides')
const SEASON = [
  { season: '夏季', days: '约 7—10 天' },
  { season: '冬季', days: '约 10—14 天', note: '室温较低、养护得当时' },
]

const KIND_META = {
  康乃馨: {
    careBaseRef: 'care.carnation.vase_base',
    taxonomyRef: 'taxonomy.carnation',
    vase: '约 7—14 天',
    group: 'group.carnation_cut',
    cultivarGroup: '切花康乃馨',
    breedingOrigin: '哥伦比亚',
    stem: '茎节明显，需撕去下部叶片',
    petalCount: '花瓣边缘呈锯齿状，层叠繁密',
    bloomDiameterCm: '6 至 8',
    breederDefault: '哥伦比亚商业切花培育',
    introducedYearDefault: '1970 年代起现代切花体系',
  },
  绣球: {
    careBaseRef: 'care.hydrangea.vase_base',
    taxonomyRef: 'taxonomy.hydrangea',
    vase: '约 5—10 天',
    group: 'group.hydrangea_mophead',
    cultivarGroup: '大花绣球',
    breedingOrigin: '荷兰',
    stem: '茎干粗壮，吸水需求大',
    bloomDiameterCm: '15 至 25',
    breederDefault: '欧美园艺绣球培育',
    introducedYearDefault: '1990 年代起广泛商用',
  },
  芍药: {
    careBaseRef: 'care.peony.vase_base',
    taxonomyRef: 'taxonomy.peony',
    vase: '约 3—5 天',
    group: 'group.herbaceous_peony',
    cultivarGroup: '草本芍药',
    breedingOrigin: '荷兰',
    stem: '茎干粗壮，花头重，需高瓶支撑',
    bloomDiameterCm: '12 至 18',
    breederDefault: '荷兰 / 法国芍药育种',
    introducedYearDefault: '1990 年代起广泛商用',
  },
  郁金香: {
    careBaseRef: 'care.tulip.vase_base',
    taxonomyRef: 'taxonomy.tulip',
    vase: '约 5—7 天',
    group: 'group.tulip_single',
    cultivarGroup: '单瓣郁金香',
    breedingOrigin: '荷兰',
    stem: '花茎会继续生长，需预留瓶高',
    bloomDiameterCm: '7 至 9',
    breederDefault: '荷兰球根花卉育种',
    introducedYearDefault: '球根切花长期商用品种',
  },
  菊花: {
    careBaseRef: 'care.chrysanthemum.vase_base',
    taxonomyRef: 'taxonomy.chrysanthemum',
    vase: '约 10—14 天',
    group: 'group.chrysanthemum_cut',
    cultivarGroup: '切花菊',
    breedingOrigin: '中国',
    stem: '茎干挺直，耐插',
    bloomDiameterCm: '5 至 12',
    breederDefault: '中国切花菊培育',
    introducedYearDefault: '1990 年代起切花菊体系',
  },
  风信子: {
    careBaseRef: 'care.hyacinth.vase_base',
    taxonomyRef: 'taxonomy.hyacinth',
    vase: '约 7—10 天',
    group: 'group.hyacinth_cut',
    cultivarGroup: '切花风信子',
    breedingOrigin: '荷兰',
    stem: '穗形花序，整体紧凑',
    bloomDiameterCm: '穗长 8 至 15 cm',
    breederDefault: '荷兰球根花卉育种',
    introducedYearDefault: '球根切花长期商用品种',
  },
  马蹄莲: {
    careBaseRef: 'care.calla.vase_base',
    taxonomyRef: 'taxonomy.calla',
    vase: '约 7—10 天',
    group: 'group.calla_cut',
    cultivarGroup: '切花马蹄莲',
    breedingOrigin: '荷兰',
    stem: '佛焰苞易损，需浅水、避免挤压',
    bloomDiameterCm: '8 至 12',
    breederDefault: '荷兰切花马蹄莲培育',
    introducedYearDefault: '1990 年代起广泛商用',
  },
  向日葵: {
    careBaseRef: 'care.sunflower.vase_base',
    taxonomyRef: 'taxonomy.sunflower',
    vase: '约 5—8 天',
    group: 'group.sunflower_cut',
    cultivarGroup: '切花向日葵',
    breedingOrigin: '商业化种植',
    stem: '茎干粗壮，花盘重，需高瓶支撑',
    bloomDiameterCm: '10 至 20',
    breederDefault: '商业切花向日葵培育',
    introducedYearDefault: '2000 年代起切花向日葵',
  },
  洋桔梗: {
    careBaseRef: 'care.eustoma.vase_base',
    taxonomyRef: 'taxonomy.eustoma',
    vase: '约 7—12 天',
    group: 'group.eustoma_cut',
    cultivarGroup: '切花洋桔梗',
    breedingOrigin: '日本',
    stem: '茎干纤细，花瓣娇嫩',
    bloomDiameterCm: '6 至 8',
    breederDefault: '日本洋桔梗育种体系',
    introducedYearDefault: '1990 年代起广泛商用',
  },
  满天星: {
    careBaseRef: 'care.gypsophila.vase_base',
    taxonomyRef: 'taxonomy.gypsophila',
    vase: '约 10—14 天',
    group: 'group.gypsophila_cut',
    cultivarGroup: '切花满天星',
    breedingOrigin: '厄瓜多尔',
    stem: '细枝多花，适合填充层次',
    bloomDiameterCm: '细碎小花',
    breederDefault: '厄瓜多尔切花满天星培育',
    introducedYearDefault: '1990 年代起广泛商用',
  },
  配叶: {
    careBaseRef: 'care.foliage.vase_base',
    taxonomyRef: 'taxonomy.foliage',
    vase: '约 7—14 天',
    group: 'group.cut_foliage',
    cultivarGroup: '切花配叶',
    breedingOrigin: '因品种而异',
    stem: '以叶材线条与层次为主',
    bloomDiameterCm: '—',
  },
  盆栽: {
    careBaseRef: 'care.potted.vase_base',
    taxonomyRef: 'taxonomy.potted',
    vase: '盆栽观赏因品种而异',
    group: 'group.potted_ornamental',
    cultivarGroup: '室内盆栽',
    breedingOrigin: '因品种而异',
    stem: '以盆栽株形观赏为主',
    bloomDiameterCm: '—',
  },
  洋牡丹: {
    careBaseRef: 'care.ranunculus.vase_base',
    taxonomyRef: 'taxonomy.ranunculus',
    vase: '约 5—7 天',
    group: 'group.ranunculus_cut',
    cultivarGroup: '切花洋牡丹',
    breedingOrigin: '荷兰',
    stem: '茎干纤细，花头层叠',
    bloomDiameterCm: '6 至 10',
    breederDefault: '荷兰 / 意大利花毛茛培育',
    introducedYearDefault: '2000 年代起春日切花热',
  },
  银莲花: {
    careBaseRef: 'care.anemone.vase_base',
    taxonomyRef: 'taxonomy.anemone',
    vase: '约 5—7 天',
    group: 'group.anemone_cut',
    cultivarGroup: '切花银莲花',
    breedingOrigin: '荷兰',
    stem: '茎干纤细，花头轻盈',
    bloomDiameterCm: '5 至 8',
    breederDefault: '以色列 / 荷兰银莲花培育',
    introducedYearDefault: '2000 年代起春日切花',
  },
  翠珠: {
    careBaseRef: 'care.greenbell.vase_base',
    taxonomyRef: 'taxonomy.greenbell',
    vase: '约 7—10 天',
    group: 'group.fill_flower',
    cultivarGroup: '切花配花',
    breedingOrigin: '荷兰',
    stem: '细枝上挂小球形花苞',
    bloomDiameterCm: '3 至 5',
    breederDefault: '欧洲切花配花培育',
    introducedYearDefault: '2010 年代起广泛商用',
  },
  蕾丝花: {
    careBaseRef: 'care.laceflower.vase_base',
    taxonomyRef: 'taxonomy.laceflower',
    vase: '约 7—10 天',
    group: 'group.fill_flower',
    cultivarGroup: '切花配花',
    breedingOrigin: '荷兰',
    stem: '伞形花序，轻盈飘逸',
    bloomDiameterCm: '伞径 8 至 15 cm',
    breederDefault: '欧洲切花配花培育',
    introducedYearDefault: '2010 年代起广泛商用',
  },
  紫罗兰: {
    careBaseRef: 'care.violet.vase_base',
    taxonomyRef: 'taxonomy.violet',
    vase: '约 5—7 天',
    group: 'group.violet_cut',
    cultivarGroup: '切花紫罗兰',
    breedingOrigin: '荷兰',
    stem: '穗形花序，紧凑',
    bloomDiameterCm: '穗长 6 至 10 cm',
    breederDefault: '欧洲切花紫罗兰培育',
    introducedYearDefault: '1990 年代起春日切花',
  },
  勿忘我: {
    careBaseRef: 'care.forget-me-not.vase_base',
    taxonomyRef: 'taxonomy.forget-me-not',
    vase: '约 7—10 天',
    group: 'group.forget_me_not_cut',
    cultivarGroup: '切花勿忘我',
    breedingOrigin: '荷兰',
    stem: '细枝多花，适合干花',
    bloomDiameterCm: '细碎小花',
    breederDefault: '欧洲切花配花培育',
    introducedYearDefault: '2010 年代起广泛商用',
  },
}

function lang(entry) {
  return {
    meaning: entry.meaning,
    paragraphs: entry.paragraphs,
    occasions: entry.occasions,
    colorMeanings: [{ color: entry.colorLabel, meaning: entry.colorMeaning }],
    pairing: entry.pairing,
    caution: entry.caution,
  }
}

function buildEntry(kind, spec) {
  const meta = KIND_META[kind]
  if (!meta) throw new Error(`未知种类 meta：${kind}`)

  const alias = spec.alias
  const scientific = spec.scientific || `${meta.taxonomyRef}.${spec.variety}`
  const sciName =
    spec.scientificName ||
    (alias && /^[A-Za-z]/.test(alias)
      ? `${kind === '康乃馨' ? 'Dianthus' : kind === '郁金香' ? 'Tulipa' : kind} '${alias.replace(/'/g, '')}'`
      : `${kind}（${spec.variety}）`)

  const identity = {
    scientificName: sciName,
    namingNote: spec.namingNote,
  }
  if (meta.group) identity.horticulturalGroup = meta.group
  if (spec.breeder || meta.breederDefault) {
    identity.breeder = spec.breeder || meta.breederDefault
  }
  if (spec.introducedYear) identity.introducedYear = spec.introducedYear
  else if (meta.introducedYearDefault) identity.introducedYear = meta.introducedYearDefault

  const morphology = {
    color: spec.color,
    scent: spec.scent || '淡香或几乎无香',
    stem: spec.stem || meta.stem,
    foliage: spec.foliage || '叶片健康即可保留少量，避免浸水',
  }
  if (meta.petalCount) morphology.petalCount = meta.petalCount
  if (meta.bloomDiameterCm && meta.bloomDiameterCm !== '—') {
    morphology.bloomDiameterCm = spec.bloomDiameterCm || meta.bloomDiameterCm
  }
  if (spec.flowerForm?.length) morphology.flowerForm = spec.flowerForm

  const overlay = {
    bloom: {
      vase: meta.vase,
      vaseNote: spec.bloomNote || `${spec.variety}，勤换水可稳定观赏期`,
      ...(kind !== '盆栽' && kind !== '配叶' ? { vaseBySeason: SEASON } : {}),
    },
    careBaseRef: meta.careBaseRef,
    careVaseOverride: {
      summary: spec.careSummary,
      ...(spec.careTips?.length ? { tips: spec.careTips } : {}),
      ...(VARIETY_CARE_OVERRIDES[`${kind}::${spec.variety}`]
        ? { commonIssues: VARIETY_CARE_OVERRIDES[`${kind}::${spec.variety}`] }
        : {}),
    },
    atlas: {
      intro: {
        taxonomyRef: meta.taxonomyRef,
        identity,
        origin: {
          breedingOrigin: meta.breedingOrigin,
          productionRegions: kind === '配叶' || kind === '盆栽' ? ['region.yunnan'] : REGIONS,
        },
        morphology,
      },
      featureRefs: spec.featureRefs || [],
      distinguishFrom: spec.distinguishFrom || [],
      ...(meta.cultivarGroup
        ? {
            cultivar: {
              horticulturalGroup: meta.cultivarGroup,
              namingNote: spec.namingNote,
            },
          }
        : {}),
    },
    language: lang(spec),
  }

  if (alias) {
    overlay.names = {
      scientificName: sciName,
      commonNames: [alias, spec.variety].filter(Boolean),
    }
  }

  return overlay
}

function inferDistinguishFrom(variety, spec, allSpecs) {
  if (spec.distinguishFrom?.length >= 2) return spec.distinguishFrom

  const peers = allSpecs.filter((s) => s.variety !== variety)
  const items = peers.slice(0, 2).map((p) => ({
    name: p.variety,
    difference:
      spec.diffPeers?.[p.variety] ||
      `${(p.namingNote || p.variety).split('，')[0]}，与此品种形态或色调不同`,
  }))

  const selfLine =
    spec.selfDiff ||
    (spec.namingNote
      ? `${spec.namingNote.split('，')[0]}，是最核心的辨识特征`
      : `${variety}是该品类中的典型代表`)

  items.push({ name: variety, difference: selfLine })
  return items
}

function exportKind(kind, specs) {
  const out = {}
  for (const spec of specs) {
    const enriched = {
      ...spec,
      distinguishFrom: inferDistinguishFrom(spec.variety, spec, specs),
    }
    out[`${kind}::${spec.variety}`] = buildEntry(kind, enriched)
  }
  return out
}

module.exports = { exportKind, buildEntry, KIND_META, SEASON, REGIONS }
