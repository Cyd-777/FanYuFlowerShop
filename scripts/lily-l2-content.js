/**
 * 百合 L2 批量（除黄天霸、西伯利亚外 8 篇）
 * 键：种类::品种名
 */
const REGIONS = ['region.yunnan', 'region.ecuador', 'region.colombia']
const SEASON = [
  { season: '夏季', days: '约 7—10 天' },
  { season: '冬季', days: '约 10—14 天', note: '室温较低、养护得当时' },
]

function lang(meaning, paragraphs, occasions, color, colorMeaning, pairing, caution) {
  return {
    meaning,
    paragraphs,
    occasions,
    colorMeanings: [{ color, meaning: colorMeaning }],
    pairing,
    caution,
  }
}

function lilyAtlas({
  scientific,
  group,
  namingNote,
  color,
  scent,
  featureRefs,
  flowerForm,
  distinguishFrom,
  cultivarGroup,
  breeder = '荷兰百合育种体系',
  introducedYear = '1990 年代起',
}) {
  return {
    intro: {
      taxonomyRef: 'taxonomy.lily',
      identity: {
        scientificName: scientific,
        horticulturalGroup: group,
        namingNote,
        ...(breeder ? { breeder } : {}),
        ...(introducedYear ? { introducedYear } : {}),
      },
      origin: {
        breedingOrigin: '荷兰',
        productionRegions: REGIONS,
      },
      morphology: {
        flowerForm: flowerForm || [],
        bloomDiameterCm: '16 至 22',
        color,
        stem: '茎干粗壮，建议高瓶或深瓶支撑',
        foliage: '叶片狭长，沿茎分布',
        scent,
      },
    },
    featureRefs: featureRefs || [],
    origin: '主产区中国云南、厄瓜多尔、哥伦比亚等地',
    cultivar: cultivarGroup ? { horticulturalGroup: cultivarGroup, namingNote } : undefined,
    distinguishFrom: distinguishFrom || [],
  }
}

function lilyCare(summary, tips = []) {
  return {
    careBaseRef: 'care.lily.vase_base',
    careVaseOverride: { summary, tips: tips.filter(Boolean) },
  }
}

const LILY_L2_CONTENT = {
  '百合::曼尼莎': {
    names: {
      scientificName: "Lilium 'Manissa'",
      commonNames: ['Manissa', '曼尼莎百合'],
    },
    bloom: {
      vase: '约 7—14 天',
      vaseNote: '黄色 OT 百合，摘除花蕊可减花粉污染',
      vaseBySeason: SEASON,
    },
    ...lilyCare('曼尼莎为黄色 OT 百合，花大浓香；建议摘除花蕊，勤换水并保持通风。', [
      '开放前或初开时摘除花蕊',
      '浓香品种远离密闭小空间',
    ]),
    atlas: lilyAtlas({
      scientific: "Lilium 'Manissa'",
      group: 'group.ot_lily',
      cultivarGroup: 'OT 杂交百合',
      namingNote: '花店黄色 OT 百合常见品种，与黄天霸同属大型黄色系',
      color: '明亮黄色，花瓣略反卷，开放后花径大、视觉存在感强',
      scent: '浓香，室内插瓶时明显',
      featureRefs: ['trait.strong_scent', 'trait.recurved_petal', 'trait.huge_flower'],
      flowerForm: ['trait.recurved_petal'],
      distinguishFrom: [
        { name: '黄天霸', difference: '同为黄色 OT，瓣形与色调略有差异，市场常并列陈列' },
        { name: '木门', difference: '偏深黄/金黄色调，而非明亮黄' },
      ],
    }),
    language: lang(
      '明亮、庆典与「很大气的黄色主花」',
      [
        '曼尼莎的黄色大花适合开业、贺寿、春节等需要「看得见的热闹」的场合——它不是含蓄的小朵，而是一进房间就占满视线的主花。',
        '与白色、绿色配花同插，能压住浓香的视觉重量，整体更高级；花粉敏感者记得提前摘花蕊。',
      ],
      ['春节', '开业', '贺寿', '庆典'],
      '明黄',
      '明亮、祝福、隆重',
      [
        { style: '节庆主花', flowers: ['西伯利亚', '绿康'], note: '黄白绿经典组合' },
        { style: '开业贺礼', flowers: ['向日葵', '尤加利叶'], note: '暖色大气' },
      ],
      '浓香且花粉多；过敏者、密闭卧室慎选，建议摘花蕊。',
    ),
  },

  '百合::索邦': {
    names: {
      scientificName: "Lilium 'Sorbonne'",
      commonNames: ['Sorbonne', '索邦百合'],
    },
    bloom: {
      vase: '约 7—14 天',
      vaseNote: '渐变粉东方百合，清香温和',
      vaseBySeason: SEASON,
    },
    ...lilyCare('索邦为渐变粉东方百合，清香温和；勤换水、通风，可稳定观赏期。', [
      '渐变色调开放过程中会继续变化，阴凉通风可减缓',
    ]),
    atlas: lilyAtlas({
      scientific: "Lilium 'Sorbonne'",
      group: 'group.oriental_lily',
      cultivarGroup: '东方百合',
      namingNote: '温柔渐变粉东方百合，日常家居与探望高频',
      color: '由浅粉向深粉渐变，花瓣边缘略深，整体温柔不艳俗',
      scent: '清香，比 OT 百合温和许多',
      featureRefs: ['trait.soft_pink', 'trait.gentle_scent'],
      distinguishFrom: [
        { name: '罗宾娜', difference: '深粉渐变，色调更浓' },
        { name: '西伯利亚', difference: '纯白，婚礼/悼念系' },
      ],
    }),
    language: lang(
      '温柔、日常与「不张扬的关心」',
      [
        '索邦的渐变粉很适合探望、日常家居、送给喜欢温柔色调的人——它比正红玫瑰更日常，比纯白百合更有人情味。',
        '清香温和，对多数家庭比浓香 OT 更友好；与白色、浅紫配花都很协调。',
      ],
      ['探望', '日常家居', '生日', '感谢'],
      '渐变粉',
      '温柔、日常、体贴',
      [
        { style: '日常温柔', flowers: ['洋桔梗', '翠珠'], note: '浅粉紫白，轻盈' },
        { style: '探望花束', flowers: ['康乃馨', '尤加利叶'], note: '粉绿白，不沉重' },
      ],
      '开放后色调会继续变化，避免暴晒可减缓。',
    ),
  },

  '百合::木门': {
    names: {
      scientificName: "Lilium 'Conca d'Or'",
      commonNames: ['Conca d\'Or', '木门百合', '康考德'],
    },
    bloom: {
      vase: '约 7—14 天',
      vaseNote: '深黄 OT 百合，花大浓香',
      vaseBySeason: SEASON,
    },
    ...lilyCare('木门（Conca d\'Or）为深黄 OT 百合，花大浓香；摘除花蕊、勤换水。', [
      '摘除花蕊可减少花粉污染',
      '深黄色系对水质敏感，须勤换水',
    ]),
    atlas: lilyAtlas({
      scientific: "Lilium 'Conca d'Or'",
      group: 'group.ot_lily',
      cultivarGroup: 'OT 杂交百合',
      namingNote: '花店常称「木门」，深金黄 OT 百合代表之一',
      color: '深黄至金黄色，花瓣厚实，开放后花径大、色调偏暖金',
      scent: '浓香，室内插瓶时尤为明显',
      featureRefs: ['trait.strong_scent', 'trait.yellow_gold', 'trait.huge_flower'],
      flowerForm: ['trait.recurved_petal'],
      distinguishFrom: [
        { name: '黄天霸', difference: '偏明亮黄，而非深金黄' },
        { name: '曼尼莎', difference: '明亮黄色系，色调更浅' },
      ],
    }),
    language: lang(
      '尊贵、庆典与「很有分量的金色主花」',
      [
        '木门的深金黄比明亮黄更「沉」、更贵气——适合开业、贺寿、高端庆典，以及一切需要金色主花但不想用菊花的场合。',
        '与绿色叶材、白色配花同插，金色主花会更显高级；记得为花粉敏感者摘花蕊。',
      ],
      ['开业', '贺寿', '庆典', '高端赠礼'],
      '深金黄',
      '尊贵、庆典、分量感',
      [
        { style: '金色庆典', flowers: ['绿康', '尤加利叶'], note: '金绿对比，大气' },
        { style: '贺寿主花', flowers: ['康乃馨', '铁炮百合'], note: '暖色层次' },
      ],
      '浓香且花粉多；过敏者慎选，建议摘花蕊。',
    ),
  },

  '百合::铁炮百合': {
    names: {
      scientificName: 'Lilium longiflorum',
      commonNames: ['Longiflorum', '铁炮百合', '长瓣百合'],
    },
    bloom: {
      vase: '约 7—12 天',
      vaseNote: '喇叭形长瓣百合，清香自然',
      vaseBySeason: SEASON,
    },
    ...lilyCare('铁炮百合为喇叭形长瓣百合，清香自然；勤换水、斜剪根，适合自然风与野趣花束。', [
      '喇叭形花型开放后花径大，需预留瓶口空间',
      '自然风花束可保留较长茎干',
    ]),
    atlas: lilyAtlas({
      scientific: 'Lilium longiflorum',
      group: 'group.longiflorum_lily',
      cultivarGroup: '长瓣百合（铁炮）',
      namingNote: '喇叭形、线条感强，自然风与野趣花束常见',
      color: '白或淡粉，喇叭形花瓣线条修长，开放后极具线条美',
      scent: '清香，比 OT 温和，带自然感',
      featureRefs: ['trait.pure_white', 'trait.gentle_scent'],
      distinguishFrom: [
        { name: '西伯利亚', difference: '东方百合杯形，而非喇叭形长瓣' },
        { name: '亚百合', difference: '无香、瓣形更紧凑' },
      ],
    }),
    language: lang(
      '纯洁、自然与「不太做作的优雅」',
      [
        '铁炮百合的喇叭形线条让它天然适合自然风、野趣、田园系花束——不像东方百合那么「正式」，也不像 OT 那么「隆重」。',
        '白/淡粉色调适合婚礼、日常家居、探望；与尤加利、小雏菊、蕾丝花同插很有季节感。',
      ],
      ['婚礼', '日常家居', '自然风花束', '探望'],
      '白/淡粉',
      '纯洁、自然、线条美',
      [
        { style: '自然野趣', flowers: ['小雏菊', '尤加利叶'], note: '白绿，轻盈自然' },
        { style: '简约婚礼', flowers: ['西伯利亚', '翠珠'], note: '全白系，干净' },
      ],
      '喇叭形花型开放后占空间，瓶口勿过窄。',
    ),
  },

  '百合::亚百合': {
    names: {
      scientificName: 'Lilium asiatic hybrid',
      commonNames: ['Asiatic Lily', '亚百合'],
    },
    bloom: {
      vase: '约 7—12 天',
      vaseNote: '几乎无香，适合花香敏感者',
      vaseBySeason: SEASON,
    },
    ...lilyCare('亚百合几乎无香，适合花香敏感者与封闭空间；勤换水、斜剪根即可。', [
      '无香品种可保留花蕊（仍建议摘除以防花粉）',
      '多色可选，适合色彩丰富的混合花束',
    ]),
    atlas: lilyAtlas({
      scientific: 'Lilium asiatic hybrid',
      group: 'group.asiatic_lily',
      cultivarGroup: '亚洲百合',
      namingNote: '几乎无香，色彩丰富，花香敏感者友好',
      color: '橙、黄、粉、白等多色，瓣形向上开放，色彩饱和',
      scent: '几乎无香',
      featureRefs: ['trait.yellow_gold'],
      distinguishFrom: [
        { name: '东方百合', difference: '东方系多浓香，亚百合几乎无香' },
        { name: 'OT 百合', difference: 'OT 花更大、更香' },
      ],
    }),
    language: lang(
      '友好、日常与「有色彩但不熏人」',
      [
        '亚百合是「想送百合但对方怕香」时的稳妥选择——色彩可以很热闹，但几乎不会熏满整个房间。',
        '适合办公室、卧室、探望老人小孩，以及一切需要色彩但不想浓香的环境。',
      ],
      ['探望', '办公室', '日常家居', '花香敏感者'],
      '多色',
      '友好、日常、无香',
      [
        { style: '色彩混合', flowers: ['康乃馨', '洋桔梗'], note: '多色同插，活泼' },
        { style: '简约办公', flowers: ['绿康'], note: '单品种多色也可' },
      ],
      '虽无香，花粉仍可能沾染，开放后可摘花蕊更整洁。',
    ),
  },

  '百合::重瓣百合': {
    names: {
      scientificName: 'Lilium double hybrid',
      commonNames: ['Double Lily', '重瓣百合'],
    },
    bloom: {
      vase: '约 7—12 天',
      vaseNote: '重瓣层次丰富，需通风防闷',
      vaseBySeason: SEASON,
    },
    ...lilyCare('重瓣百合层次丰富、观感华丽；勤换水、保持通风，避免花瓣闷湿。', [
      '重瓣结构易积水，通风很重要',
      '开放后花头较重，需高瓶支撑',
    ]),
    atlas: lilyAtlas({
      scientific: 'Lilium double hybrid',
      group: 'group.double_lily',
      cultivarGroup: '重瓣百合',
      namingNote: '重瓣层次、华丽感强，高端花束与庆典常见',
      color: '白、粉、黄等，重瓣层叠，开放后如牡丹般饱满',
      scent: '中等香气，因品种而异',
      featureRefs: ['trait.huge_flower', 'trait.soft_pink'],
      distinguishFrom: [
        { name: '普通东方百合', difference: '单瓣杯形，而非重瓣层叠' },
        { name: '芍药', difference: '百合茎长、瓣形不同' },
      ],
    }),
    language: lang(
      '华丽、高级与「比普通百合更隆重」',
      [
        '重瓣百合的层叠花瓣让它看起来像「升级版的百合」——适合高端庆典、重要纪念日，以及一切需要比普通百合更华丽的时刻。',
        '与简约配花（尤加利、绿康）同插，重瓣主花会更突出；注意通风，重瓣结构易闷湿。',
      ],
      ['高端庆典', '纪念日', '重要赠礼'],
      '多色',
      '华丽、高级、隆重',
      [
        { style: '高端主花', flowers: ['尤加利叶', '绿康'], note: '简约衬托重瓣' },
        { style: '庆典花束', flowers: ['玫瑰', '洋桔梗'], note: '层次丰富' },
      ],
      '重瓣易闷湿，须通风；花头重，需高瓶支撑。',
    ),
  },

  '百合::罗宾娜': {
    names: {
      scientificName: "Lilium 'Robina'",
      commonNames: ['Robina', '罗宾娜百合'],
    },
    bloom: {
      vase: '约 7—14 天',
      vaseNote: '深粉渐变东方百合，浓香',
      vaseBySeason: SEASON,
    },
    ...lilyCare('罗宾娜为深粉渐变东方百合，浓香；摘除花蕊、勤换水、保持通风。', [
      '摘除花蕊可减少花粉与过敏风险',
      '渐变色调开放过程中会继续加深',
    ]),
    atlas: lilyAtlas({
      scientific: "Lilium 'Robina'",
      group: 'group.oriental_lily',
      cultivarGroup: '东方百合',
      namingNote: '深粉渐变东方百合，色调比索邦更浓',
      color: '由浅粉向深粉渐变，整体偏暖粉，开放后色调更浓',
      scent: '浓香，清幽而持久',
      featureRefs: ['trait.strong_scent', 'trait.soft_pink', 'trait.huge_flower'],
      distinguishFrom: [
        { name: '索邦', difference: '渐变粉更浅、更温柔' },
        { name: '西诺红', difference: '正红系，而非粉渐变' },
      ],
    }),
    language: lang(
      '浪漫、深情与「很有存在感的粉色主花」',
      [
        '罗宾娜的深粉渐变比索邦更「浓」、更浪漫——适合表白、纪念日、以及一切需要粉色主花但不想太少女的时刻。',
        '浓香持久，适合客厅、庆典；花粉敏感者记得摘花蕊。',
      ],
      ['表白', '纪念日', '庆典', '浪漫赠礼'],
      '深粉渐变',
      '浪漫、深情、存在感',
      [
        { style: '浪漫主花', flowers: ['玫瑰', '翠珠'], note: '粉白层次' },
        { style: '庆典粉调', flowers: ['康乃馨', '尤加利叶'], note: '暖粉不俗' },
      ],
      '浓香且花粉多；过敏者慎选，建议摘花蕊。',
    ),
  },

  '百合::西诺红': {
    names: {
      scientificName: "Lilium 'Red County'",
      commonNames: ['Red County', '西诺红百合'],
    },
    bloom: {
      vase: '约 7—14 天',
      vaseNote: '正红东方百合，相对稀有',
      vaseBySeason: SEASON,
    },
    ...lilyCare('西诺红为正红东方百合，相对稀有；摘除花蕊、勤换水，可稳定观赏期。', [
      '正红百合在市场中相对少见，收到时建议拍照记录开放过程',
      '摘除花蕊可减少花粉污染',
    ]),
    atlas: lilyAtlas({
      scientific: "Lilium 'Red County'",
      group: 'group.oriental_lily',
      cultivarGroup: '东方百合',
      namingNote: '正红东方百合，花店相对少见，辨识度高',
      color: '正红至深红，东方百合杯形，开放后色彩饱和',
      scent: '浓香，室内插瓶时明显',
      featureRefs: ['trait.strong_scent', 'trait.classic_red', 'trait.huge_flower'],
      distinguishFrom: [
        { name: '罗宾娜', difference: '粉渐变，而非正红' },
        { name: '玫瑰', difference: '百合杯形与茎叶形态完全不同' },
      ],
    }),
    language: lang(
      '热烈、稀有与「不是玫瑰的红色主花」',
      [
        '西诺红的正红在百合里相对少见——适合想要红色主花但想避开玫瑰「标准答案」的时刻，以及喜欢百合杯形线条的收花人。',
        '与白色、绿色配花同插，红色主花会更高级；记得为花粉敏感者摘花蕊。',
      ],
      ['纪念日', '庆典', '独特赠礼', '春节'],
      '正红',
      '热烈、稀有、辨识度',
      [
        { style: '红白对比', flowers: ['西伯利亚', '绿康'], note: '红百白百，节日感' },
        { style: '独特主花', flowers: ['尤加利叶'], note: '单品种即可' },
      ],
      '浓香且花粉多；相对稀有，运输后建议醒花再插瓶。',
    ),
  },
}

module.exports = { LILY_L2_CONTENT }
