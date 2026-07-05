/**
 * 非玫瑰 L2 标杆专文（6 篇试点）
 * 键：种类::品种名
 */
const REGIONS = ['region.yunnan', 'region.ecuador', 'region.colombia']
const SEASON_SUMMER_WINTER = [
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

const NONROSE_L2_CONTENT = {
  '百合::黄天霸': {
    names: {
      scientificName: "Lilium 'Yellow Emperor'",
      commonNames: ['Yellow Emperor', '黄天霸百合', 'OT 百合'],
    },
    bloom: {
      vase: '约 7—14 天',
      vaseNote: '浓香 OT 百合，摘除花蕊可延长观赏并减少花粉污染',
      vaseBySeason: SEASON_SUMMER_WINTER,
    },
    careBaseRef: 'care.lily.vase_base',
    careVaseOverride: {
      summary: '黄天霸为 OT 杂交百合，花大浓香；建议摘除花蕊，勤换水并保持通风。',
      tips: ['开放前或初开时摘除花蕊，可减少花粉沾染与过敏', '浓香品种远离密闭小空间'],
    },
    atlas: {
      intro: {
        taxonomyRef: 'taxonomy.lily',
        identity: {
          scientificName: "Lilium 'Yellow Emperor'",
          horticulturalGroup: 'group.ot_lily',
          breeder: '荷兰百合育种体系',
          introducedYear: '1990 年代起',
          namingNote: '花店语境里「黄天霸」常指大型黄色 OT 百合，春节与庆典极高频',
        },
        origin: {
          breedingOrigin: '荷兰',
          productionRegions: REGIONS,
        },
        morphology: {
          flowerForm: ['trait.recurved_petal'],
          petalCount: '约 6 枚外瓣，花型舒展',
          bloomDiameterCm: '18 至 22',
          color: '明亮金黄色，花瓣略反卷，开放后花径大、存在感强',
          stem: '茎干粗壮，需高瓶或深瓶支撑',
          foliage: '叶片狭长，沿茎分布',
          scent: '浓香，室内插瓶时尤为明显',
        },
      },
      featureRefs: ['trait.strong_scent', 'trait.recurved_petal', 'trait.huge_flower'],
      origin: '主产区中国云南、厄瓜多尔、哥伦比亚等地',
      cultivar: {
        horticulturalGroup: 'OT 杂交百合',
        namingNote: '春节黄色主花高频品种',
      },
      distinguishFrom: [
        { name: '木门', difference: '偏深黄/金黄色调，花型与香气接近但市场命名不同' },
        { name: '曼尼莎', difference: '同为黄色系，瓣形与开放度略异' },
        { name: '黄天霸', difference: '大型黄色 OT、浓香卷瓣，是春节与庆典最辨识的黄色百合之一' },
      ],
    },
    language: lang(
      '繁荣、祝福与「很隆重的大花」',
      [
        '黄天霸的黄色大花，天然带着节庆与祝福感——春节、开业、贺寿、探望长辈都很常见。它不是 subtle 的小清新，而是「一进门就看得见」的主花气场。',
        '若收花人对花粉或浓香敏感，赠送时说明「可摘花蕊」会更贴心；与白色、绿色配花能压住浓香视觉，整体更高级。',
      ],
      ['春节', '开业', '贺寿', '探望长辈', '庆典'],
      '金黄',
      '繁荣、祝福、隆重',
      [
        { style: '节庆主花', flowers: ['白雪山', '绿康'], note: '黄白绿喜庆而不俗' },
        { style: '开业贺礼', flowers: ['向日葵', '尤加利叶'], note: '明亮暖色，气场足' },
      ],
      '浓香且花粉多；过敏者、密闭卧室慎选，建议摘花蕊。',
    ),
  },

  '百合::西伯利亚': {
    names: {
      scientificName: "Lilium 'Siberia'",
      commonNames: ['Siberia', '西伯利亚百合'],
    },
    bloom: {
      vase: '约 7—14 天',
      vaseNote: '纯白东方百合，摘花蕊可减花粉污染',
      vaseBySeason: SEASON_SUMMER_WINTER,
    },
    careBaseRef: 'care.lily.vase_base',
    careVaseOverride: {
      summary: '西伯利亚为纯白东方百合，婚礼与悼念常见；摘除花蕊、勤换水保持洁净。',
      tips: ['婚礼用花建议提前摘花蕊，避免白色礼服沾染花粉', '纯白对水质敏感，须勤换水'],
    },
    atlas: {
      intro: {
        taxonomyRef: 'taxonomy.lily',
        identity: {
          scientificName: "Lilium 'Siberia'",
          horticulturalGroup: 'group.oriental_lily',
          breeder: '荷兰百合育种体系',
          introducedYear: '1990 年代起',
          namingNote: '纯白东方百合代表，婚礼白百合最常见指代之一',
        },
        origin: {
          breedingOrigin: '荷兰',
          productionRegions: REGIONS,
        },
        morphology: {
          flowerForm: ['trait.pure_white'],
          bloomDiameterCm: '16 至 20',
          color: '纯白，花瓣洁净，开放后花型优雅',
          stem: '茎干挺直，适合高挑花瓶',
          foliage: '叶片深绿',
          scent: '浓香，清幽而持久',
        },
      },
      featureRefs: ['trait.pure_white', 'trait.strong_scent', 'trait.huge_flower'],
      cultivar: {
        horticulturalGroup: '东方百合',
        namingNote: '纯白东方百合代表，婚礼白百合最常见指代之一',
      },
      distinguishFrom: [
        { name: '铁炮百合', difference: '喇叭形、清香，而非东方百合重瓣感' },
        { name: '亚百合', difference: '多无香或轻香，花型更简洁' },
        { name: '西伯利亚', difference: '纯白、浓香、东方百合，婚礼与庄重场合高频' },
      ],
    },
    language: lang(
      '纯洁、神圣与百年好合',
      [
        '西伯利亚的白，是婚礼誓言里最常见的那一种白——庄严、完整、没有杂质。它也常用于毕业典礼、洗礼等「新开始」的场合。',
        '悼念与探病亦常见白百合，表达哀思与尊重；若场景需要克制与庄重，西伯利亚比彩色百合更合适。',
      ],
      ['婚礼', '毕业典礼', '悼念', '探病', '洗礼'],
      '纯白',
      '纯洁、神圣、百年好合',
      [
        { style: '婚礼', flowers: ['白雪山', '尤加利叶'], note: '白绿经典婚礼' },
        { style: '庄重悼念', flowers: ['绿康', '白桔梗'], note: '白绿克制' },
      ],
      '花粉易沾染白色衣物；婚礼场景务必考虑摘花蕊。',
    ),
  },

  '康乃馨::马斯特': {
    names: {
      scientificName: "Dianthus 'Master'",
      commonNames: ['Master', '马斯特康乃馨'],
    },
    bloom: {
      vase: '约 7—14 天',
      vaseNote: '经典红康乃馨，耐插，勤换水即可',
      vaseBySeason: [
        { season: '夏季', days: '约 7—10 天' },
        { season: '冬季', days: '约 12—14 天' },
      ],
    },
    careBaseRef: 'care.carnation.vase_base',
    careVaseOverride: {
      summary: '马斯特为经典红色康乃馨，耐插易养；撕去茎节叶片、避免花瓣沾水。',
      tips: ['撕去关节处叶片，减少腐烂', '远离热源与成熟水果'],
    },
    atlas: {
      intro: {
        taxonomyRef: 'taxonomy.carnation',
        identity: {
          scientificName: "Dianthus 'Master'",
          horticulturalGroup: 'group.carnation_cut',
          breeder: '哥伦比亚商业切花培育',
          introducedYear: '1970 年代起现代切花体系',
          namingNote: '花店「标准红康乃馨」常见Commercial名，母亲节与教师节高频',
        },
        origin: {
          breedingOrigin: '哥伦比亚',
          productionRegions: ['region.colombia', 'region.ecuador', 'region.yunnan'],
        },
        morphology: {
          petalCount: '花瓣边缘呈锯齿状，层叠繁密',
          bloomDiameterCm: '6 至 8',
          color: '正红而饱满，开放后仍较保持',
          stem: '茎节明显，需撕去下部叶片',
          scent: '淡香',
        },
      },
      featureRefs: ['trait.classic_red', 'trait.thick_petal'],
      cultivar: {
        horticulturalGroup: '切花康乃馨',
        namingNote: '经典红色切花康乃馨代表',
      },
      distinguishFrom: [
        { name: '野马', difference: '复古紫色，而非正红' },
        { name: '白雪公主', difference: '白色康乃馨，场景更偏纯洁与感谢' },
        { name: '马斯特', difference: '正红、经典、耐插，是红康乃馨最常见辨识之一' },
      ],
    },
    language: lang(
      '母爱、热爱与「不会出错的红色祝福」',
      [
        '马斯特的红康乃馨，几乎等于「母亲节标准答案」——热烈但不像玫瑰那样直白爱情，更适合表达尊敬、感恩与长久陪伴。',
        '教师节、探望老师长辈、开业贺礼也常用；与白色、粉色康乃馨混搭，可做出层次而不单调。',
      ],
      ['母亲节', '教师节', '感恩', '探望长辈', '开业'],
      '正红',
      '母爱、感恩、祝福',
      [
        { style: '母亲节', flowers: ['粉钻', '白雪公主'], note: '红粉白康乃馨经典组合' },
        { style: '感恩花束', flowers: ['绿康', '洋桔梗'], note: '红绿得体' },
      ],
      '部分收花人可能更期待玫瑰；若表达爱情，请确认场景是否适合康乃馨。',
    ),
  },

  '绣球::无尽夏': {
    names: {
      scientificName: "Hydrangea macrophylla 'Endless Summer'",
      commonNames: ['Endless Summer', '无尽夏绣球'],
    },
    bloom: {
      vase: '约 5—10 天',
      vaseNote: '绣球切花喜湿，需充足吸水与喷雾保湿',
      vaseBySeason: [
        { season: '夏季', days: '约 5—7 天' },
        { season: '冬季', days: '约 7—10 天' },
      ],
    },
    careBaseRef: 'care.hydrangea.vase_base',
    careVaseOverride: {
      summary: '无尽夏绣球吸水需求大，茎部可十字剪或烫茎；每日换水，可喷雾保湿。',
      trim: '十字剪或斜剪茎部 2—3 cm，增加吸水面积',
      tips: ['吸水不足时可用烫茎法急救', '避免空调直吹导致失水'],
    },
    atlas: {
      intro: {
        taxonomyRef: 'taxonomy.hydrangea',
        identity: {
          scientificName: "Hydrangea macrophylla 'Endless Summer'",
          horticulturalGroup: 'group.hydrangea_mophead',
          breeder: '欧美园艺绣球培育',
          introducedYear: '1990 年代起广泛商用',
          namingNote: 'Endless Summer 系列，蓝粉色调随土壤酸碱变化，婚礼与家居极热门',
        },
        origin: {
          breedingOrigin: '美国',
          productionRegions: ['region.yunnan', 'region.colombia'],
        },
        morphology: {
          flowerForm: ['trait.spray_ball'],
          bloomDiameterCm: '15 至 25（整球）',
          color: '蓝、粉或紫色调，因品种与处理而异，整体梦幻团状',
          stem: '茎质较硬，吸水能力相对弱，需特殊处理',
          scent: '几乎无香',
        },
      },
      featureRefs: ['trait.spray_ball', 'trait.low_sat_pink'],
      cultivar: {
        horticulturalGroup: '大花绣球',
        namingNote: 'Endless Summer 系列，婚礼与家居极热门',
      },
      distinguishFrom: [
        { name: '花手鞠', difference: '重瓣、花球更密更贵，而非标准大花绣球' },
        { name: '贝拉安娜', difference: '圆锥花序，野趣自然风' },
        { name: '无尽夏', difference: '大花绣球、蓝粉梦幻、婚礼与韩式花束最高频之一' },
      ],
    },
    language: lang(
      '团聚、希望与「一团梦幻的蓝或粉」',
      [
        '无尽夏像把夏天最温柔的颜色揉成一团——适合婚礼、家居插瓶、夏日主题花束。它不争抢线条，却用体积与色块撑起整体氛围。',
        '送给喜欢韩式、法式或「很大一束」的人会很惊喜；单独几枝插瓶也好看，但需接受绣球比玫瑰更「吃水」。',
      ],
      ['婚礼', '家居插瓶', '夏日花束', '生日'],
      '蓝/粉',
      '团聚、希望、梦幻',
      [
        { style: '韩式婚礼', flowers: ['白雪山', '鼠尾草'], note: '蓝白绿或粉白绿' },
        { style: '夏日家居', flowers: ['洋甘菊', '尤加利叶'], note: '团状+细碎配花' },
      ],
      '绣球失水快；运输后尽快剪根插深水，勿挤压花球。',
    ),
  },

  '芍药::莎拉': {
    names: {
      scientificName: "Paeonia lactiflora 'Sarah Bernhardt'",
      commonNames: ['Sarah Bernhardt', '莎拉芍药'],
    },
    bloom: {
      vase: '约 3—5 天',
      vaseNote: '芍药切花花期较短，选微开、浅水、阴凉可延长',
      vaseBySeason: [{ season: '春末', days: '约 3—5 天', note: '5—6 月应季' }],
    },
    careBaseRef: 'care.peony.vase_base',
    careVaseOverride: {
      summary: '莎拉芍药宜选微开花朵，浅水养护，阴凉通风；花期短但花型极美。',
      waterDepth: '浅水养护，水深约花瓶 1/4',
      tips: ['切花宜选微开而非全开', '避免高温与阳光直射'],
    },
    atlas: {
      intro: {
        taxonomyRef: 'taxonomy.peony',
        identity: {
          scientificName: "Paeonia lactiflora 'Sarah Bernhardt'",
          horticulturalGroup: 'group.herbaceous_peony',
          breeder: '法国 Lemoine 育种体系',
          introducedYear: '1906 年',
          namingNote: '以法国传奇演员 Sarah Bernhardt 命名，粉色重瓣芍药代表',
        },
        origin: {
          breedingOrigin: '法国',
          productionRegions: ['region.yunnan'],
        },
        morphology: {
          petalCount: '重瓣，花瓣极多',
          bloomDiameterCm: '12 至 18',
          color: '柔粉色，层层包裹，开放后雍容饱满',
          stem: '茎含乳胶，剪切后需立即插水',
          scent: '浓香，甜美而古典',
        },
      },
      featureRefs: ['trait.soft_pink', 'trait.strong_scent', 'trait.huge_flower'],
      cultivar: {
        horticulturalGroup: '草本芍药',
        introducedYear: '1906 年',
        namingNote: '以法国传奇演员 Sarah Bernhardt 命名',
      },
      distinguishFrom: [
        { name: '落日珊瑚', difference: '珊瑚色且开放过程变色，而非柔粉重瓣' },
        { name: '奶油碗', difference: '白色重瓣，更偏纯洁温柔' },
        { name: '莎拉', difference: '柔粉重瓣、浓香、雍容，是婚礼芍药最常见之一' },
      ],
    },
    language: lang(
      '雍容、浪漫与「春天最盛大的花」',
      [
        '莎拉芍药的重瓣柔粉，像把春天的礼服穿在身上——婚礼、纪念日、高端花礼极常见。它的美来得猛烈也走得快，正因其花期短，更衬得珍贵。',
        '适合送给懂花、懂季节的人；若对方期待「耐插两周」，需提前说明芍药是短而极美的应季花材。',
      ],
      ['婚礼', '纪念日', '表白', '春日赠礼'],
      '柔粉',
      '雍容、浪漫、应季珍贵',
      [
        { style: '婚礼手捧', flowers: ['朱丽叶', '白雪山'], note: '粉白绿春日经典' },
        { style: '法式花束', flowers: ['洋桔梗', '鼠尾草'], note: '层次柔和' },
      ],
      '花期短（约 3—5 天）是品种特性，非养护失误；应季 5—6 月最佳。',
    ),
  },

  '郁金香::王朝': {
    names: {
      scientificName: "Tulipa 'Dynasty'",
      commonNames: ['Dynasty', '王朝郁金香'],
    },
    bloom: {
      vase: '约 5—7 天',
      vaseNote: '喜冷凉，浅水养护；花茎会继续生长',
      vaseBySeason: [
        { season: '春季', days: '约 5—7 天', note: '3—5 月应季' },
      ],
    },
    careBaseRef: 'care.tulip.vase_base',
    careVaseOverride: {
      summary: '王朝郁金香喜冷凉，浅水插瓶；花茎会继续伸长，可每日微调高度。',
      waterDepth: '浅水养护，水深约花瓶 1/4',
      tips: ['花茎每日可能长高，可修剪调整', '避免与成熟水果同放（乙烯）'],
      environment: {
        light: '明亮散射光，避开暖气与直射',
        avoid: ['与苹果、香蕉等成熟水果同放'],
      },
    },
    atlas: {
      intro: {
        taxonomyRef: 'taxonomy.tulip',
        identity: {
          scientificName: "Tulipa 'Dynasty'",
          horticulturalGroup: 'group.tulip_single',
          breeder: '荷兰球根花卉育种',
          introducedYear: '球根切花长期商用品种',
          namingNote: '经典红色单瓣郁金香，高脚杯形，春节与春日极高频',
        },
        origin: {
          breedingOrigin: '荷兰',
          productionRegions: ['region.yunnan'],
        },
        morphology: {
          flowerForm: ['trait.cup_trumpet'],
          bloomDiameterCm: '7 至 9',
          color: '正红，杯形线条挺拔，单朵极具识别度',
          stem: '花茎会继续生长，需预留瓶高空间',
          scent: '几乎无香或极淡',
        },
      },
      featureRefs: ['trait.classic_red', 'trait.cup_trumpet', 'trait.cool_season'],
      cultivar: {
        horticulturalGroup: '单瓣郁金香',
        namingNote: '经典红色单瓣郁金香，高脚杯形',
      },
      distinguishFrom: [
        { name: '阿波罗', difference: '橙色，而非正红' },
        { name: '夜皇后', difference: '深紫近黑，神秘系' },
        { name: '王朝', difference: '正红高脚杯形，是「标准红郁金香」最常见辨识' },
      ],
    },
    language: lang(
      '爱的告白、经典与「春天的一杯红酒」',
      [
        '王朝的红郁金香，线条比玫瑰更硬、更几何——适合表白、纪念日，以及一切「想要经典红色但不想送玫瑰」的时刻。',
        '春日应季感强；与白色、黄色郁金香同插，能做出荷兰田园般的色彩节奏。',
      ],
      ['表白', '春节', '纪念日', '春日赠礼'],
      '正红',
      '告白、经典、春日',
      [
        { style: '荷兰春日', flowers: ['纯金', '白梦'], note: '红黄白郁金香组合' },
        { style: '极简告白', flowers: ['尤加利叶'], note: '单品种红郁金香即可' },
      ],
      '郁金香花茎会继续生长，瓶口勿过窄；远离暖气否则开放过快。',
    ),
  },
}

module.exports = { NONROSE_L2_CONTENT }
