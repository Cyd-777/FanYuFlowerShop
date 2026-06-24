/**
 * 花卉大类 · 品类基础资料（生物学分类、学名俗名、默认图鉴/养护）
 * 维护原则：以 kindName（玫瑰、百合、牡丹…）为主键；品种级词条继承并可在库内覆盖
 */

const WIKI_KIND_PROFILES = {
  玫瑰: {
    taxonomy: {
      kingdom: '植物界',
      phylum: '被子植物门',
      taxonomicClass: '双子叶植物纲',
      order: '蔷薇目',
      family: '蔷薇科',
      genus: '蔷薇属',
    },
    names: {
      scientificName: 'Rosa × hybrida',
      commonNames: ['玫瑰', '月季', '蔷薇', '现代月季'],
    },
    bloom: {
      vase: '约 5—10 天',
      soil: '4—11 月',
    },
    careVase: {
      summary: '喜光通风，瓶插需斜剪根并勤换水，避免阳光直射和空调风口。',
      waterChange: '瓶插每日换水，保持水质清洁',
      trim: '斜剪 45° 增加吸水面积',
      environment: '明亮散射光，避开空调风口与直射阳光',
    },
    atlas: {
      summary:
        '蔷薇科蔷薇属栽培花卉。花店鲜切花语境下「玫瑰」多指蔷薇属现代杂交品种，花型层叠、色彩丰富，是全球最常见的主花之一。',
      features: ['花瓣层叠', '香气清雅', '耐瓶插', '品种繁多'],
      bloomSeason: '4—11 月',
      origin: '温带地区；现代切花玫瑰多来自荷兰、厄瓜多尔、云南等产区',
    },
    careGuide: {
      summary: '喜光通风，瓶插需斜剪根并勤换水，避免阳光直射和空调风口。',
      light: '每日 4—6 小时散射光，避免暴晒',
      water: '瓶插每日换水，水深约花瓶 1/3；土培见干见湿',
      soil: '疏松透气、排水良好的微酸性基质',
      temperature: '15—25℃ 生长最佳',
      tips: ['斜剪 45° 增加吸水面积', '去除浸水叶片防腐烂', '可添加少量保鲜剂延长花期'],
    },
    language: {
      summary: '玫瑰是爱情与浪漫的经典象征，不同颜色寓意各异。',
      meaning: '爱情、热情、浪漫与美好祝愿',
      occasions: ['情人节', '表白', '纪念日', '婚礼'],
      colorMeanings: [
        { color: '红', meaning: '热烈真挚的爱' },
        { color: '粉', meaning: '初恋、温柔与感谢' },
        { color: '白', meaning: '纯洁、尊敬' },
        { color: '香槟', meaning: '优雅、独特的爱' },
      ],
    },
  },
  牡丹: {
    taxonomy: {
      kingdom: '植物界',
      phylum: '被子植物门',
      taxonomicClass: '双子叶植物纲',
      order: '毛茛目',
      family: '芍药科',
      genus: '芍药属',
    },
    names: {
      scientificName: 'Paeonia suffruticosa',
      commonNames: ['牡丹', '富贵花', '花王', '洛阳花'],
    },
    bloom: {
      vase: '约 3—5 天',
      soil: '4—5 月',
    },
    careVase: {
      summary: '喜凉爽气候，切花宜浅水养护，保持通风。',
      waterChange: '切花浅水养护，约 2 天换水一次',
    },
    atlas: {
      summary: '芍药科芍药属落叶灌木，被誉为「花中之王」。花大色艳，是中国传统名花。',
      features: ['花型硕大', '色泽浓艳', '香气馥郁', '中国传统名花'],
      bloomSeason: '4—5 月',
      origin: '中国；洛阳、菏泽为著名牡丹产区',
    },
    careGuide: {
      summary: '喜凉爽气候，土培需排水良好；切花宜浅水养护。',
      light: '充足光照，夏季适当遮阴',
      water: '生长期保持湿润，忌积水；切花浅水养护',
      soil: '深厚肥沃、排水良好的砂质壤土',
      temperature: '15—22℃ 为宜，耐热性一般',
      tips: ['切花宜选微开花朵', '避免高温环境', '定期修剪枯叶'],
    },
    language: {
      summary: '牡丹象征富贵吉祥、繁荣昌盛，是中式花艺的代表花材。',
      meaning: '富贵、吉祥、圆满与高贵',
      occasions: ['开业贺礼', '长辈祝寿', '节庆装饰'],
      colorMeanings: [
        { color: '红', meaning: '喜庆富贵' },
        { color: '黄', meaning: '华贵尊荣' },
        { color: '粉', meaning: '温婉美好' },
      ],
    },
  },
  百合: {
    taxonomy: {
      kingdom: '植物界',
      phylum: '被子植物门',
      taxonomicClass: '单子叶植物纲',
      order: '百合目',
      family: '百合科',
      genus: '百合属',
    },
    names: {
      scientificName: 'Lilium spp.',
      commonNames: ['百合', '强翟', '山丹'],
    },
    bloom: {
      vase: '约 7—14 天',
      soil: '6—9 月',
    },
    careVase: {
      summary: '喜光但忌暴晒，保持空气流通；花粉易沾染需留意。',
      waterChange: '切花每日换水',
      environment: '明亮散射光，避免直射',
    },
    atlas: {
      summary: '百合科百合属多年生草本。花姿雅致、香气清幽，是婚礼与节庆常用花材。',
      features: ['花型优雅', '香气浓郁', '花期较长', '寓意美好'],
      bloomSeason: '6—9 月',
      origin: '亚洲、欧洲温带地区；云南等地广泛栽培',
    },
    careGuide: {
      summary: '喜光但忌暴晒，保持空气流通，花粉易沾染需留意。',
      light: '明亮散射光，避免直射',
      water: '保持土壤湿润不积水，切花每日换水',
      soil: '肥沃疏松、排水良好的腐殖质土',
      temperature: '16—24℃ 生长旺盛',
      tips: ['去除花蕊可减少花粉污染', '通风防病害', '避免与水果同放（乙烯催熟）'],
    },
    language: {
      summary: '百合寓意纯洁、神圣与百年好合，是婚礼经典花材。',
      meaning: '纯洁、神圣、百年好合、祝福',
      occasions: ['婚礼', '探望', '生日祝福'],
      colorMeanings: [
        { color: '白', meaning: '纯洁、庄严' },
        { color: '粉', meaning: '甜美、浪漫' },
        { color: '黄', meaning: '快乐、感恩' },
      ],
    },
  },
  康乃馨: {
    taxonomy: {
      kingdom: '植物界',
      phylum: '被子植物门',
      taxonomicClass: '双子叶植物纲',
      order: '石竹目',
      family: '石竹科',
      genus: '石竹属',
    },
    names: {
      scientificName: 'Dianthus caryophyllus',
      commonNames: ['康乃馨', '香石竹', '麝香石竹'],
    },
    bloom: {
      vase: '约 7—14 天',
      soil: '全年（温室切花）',
    },
    careVase: {
      summary: '容易养护，注意水质清洁和通风即可延长观赏期。',
      waterChange: '切花 2—3 天换水，保持水质清洁',
    },
    atlas: {
      summary: '石竹科石竹属多年生草本。花瓣边缘常呈锯齿状，是母亲节最具代表性的花材之一。',
      features: ['耐瓶插', '色彩丰富', '花量充足', '寓意温馨'],
      bloomSeason: '全年（温室切花）',
      origin: '地中海沿岸；现广泛商业化种植',
    },
    careGuide: {
      summary: '容易养护，注意水质清洁和通风即可延长观赏期。',
      light: '明亮散射光',
      water: '切花 2—3 天换水，保持水质清洁',
      soil: '疏松肥沃、排水良好',
      temperature: '18—25℃',
      tips: ['撕去关节处叶片', '避免花瓣沾水', '远离热源'],
    },
    language: {
      summary: '康乃馨代表母爱与感恩，是表达敬意的经典花束。',
      meaning: '母爱、感恩、思念与祝福',
      occasions: ['母亲节', '教师节', '感恩祝福'],
      colorMeanings: [
        { color: '红', meaning: '热爱与祝福' },
        { color: '粉', meaning: '感恩与温馨' },
        { color: '白', meaning: '纯洁思念' },
      ],
    },
  },
  向日葵: {
    taxonomy: {
      kingdom: '植物界',
      phylum: '被子植物门',
      taxonomicClass: '双子叶植物纲',
      order: '菊目',
      family: '菊科',
      genus: '向日葵属',
    },
    names: {
      scientificName: 'Helianthus annuus',
      commonNames: ['向日葵', '太阳花', '望日莲'],
    },
    bloom: {
      vase: '约 5—8 天',
      soil: '7—9 月',
    },
    careVase: {
      summary: '喜阳光充足，耐旱；瓶插需保证充足吸水。',
      waterChange: '高温时勤换水，保持充足清水',
    },
    atlas: {
      summary: '菊科向日葵属一年生草本。花盘硕大、色泽明亮，充满阳光气息。',
      features: ['花盘大', '色彩明快', '耐旱', '象征积极'],
      bloomSeason: '7—9 月',
      origin: '北美；现中国北方广泛种植',
    },
    careGuide: {
      summary: '喜阳光充足，耐旱，瓶插需保证充足吸水。',
      light: '全日照最佳',
      water: '土培耐旱，切花需充足清水',
      soil: '不挑剔，以排水良好为佳',
      temperature: '18—30℃',
      tips: ['切花宜选半开状态', '高温时勤换水', '花盘较重需稳固花瓶'],
    },
    language: {
      summary: '向日葵象征阳光、忠诚与积极，适合鼓励与祝福。',
      meaning: '阳光、爱慕、忠诚、积极向上',
      occasions: ['毕业', '加油打气', '生日祝福'],
      colorMeanings: [{ color: '黄', meaning: '明亮、温暖、希望' }],
    },
  },
  郁金香: {
    taxonomy: {
      kingdom: '植物界',
      phylum: '被子植物门',
      taxonomicClass: '单子叶植物纲',
      order: '百合目',
      family: '百合科',
      genus: '郁金香属',
    },
    names: {
      scientificName: 'Tulipa gesneriana',
      commonNames: ['郁金香', '草麝香', '洋荷花'],
    },
    bloom: {
      vase: '约 5—7 天',
      soil: '3—5 月',
    },
    careVase: {
      summary: '喜冷凉，瓶插宜浅水、避直射光；花茎会继续生长，可每日微调高度。',
      waterChange: '每日换水，保持水质清洁',
      trim: '斜剪花茎 2—3 cm 增加吸水',
      environment: '明亮散射光，避免暖气与阳光直射',
    },
    atlas: {
      summary:
        '百合科郁金香属多年生草本。花杯形、线条挺拔，是春季最具代表性的鲜切花之一，常见于欧式与韩式花束。',
      features: ['线条挺拔', '色彩饱和', '春日感强', '单朵或束插皆宜'],
      bloomSeason: '3—5 月',
      origin: '中亚至土耳其一带；荷兰为著名切花产区',
    },
    careGuide: {
      summary: '喜冷凉通风，瓶插浅水养护，远离热源与乙烯源。',
      light: '明亮散射光，忌暴晒',
      water: '瓶插浅水，每日换水；土培生长期保持湿润',
      soil: '疏松肥沃、排水良好的沙质壤土',
      temperature: '10—18℃ 瓶插最佳',
      tips: ['花茎会继续伸长，可每日修剪', '避免与成熟水果同放', '选半开或微开花朵更耐插'],
    },
    language: {
      summary: '郁金香是优雅与爱的象征，不同颜色寓意略有差异。',
      meaning: '爱的告白、优雅、美好春天',
      occasions: ['表白', '生日', '春日赠礼', '纪念日'],
      colorMeanings: [
        { color: '红', meaning: '热烈的爱与告白' },
        { color: '黄', meaning: '开朗、友谊与阳光' },
        { color: '粉', meaning: '甜美、幸福与关怀' },
        { color: '白', meaning: '纯洁、尊敬与新开始' },
      ],
    },
  },
  满天星: {
    taxonomy: {
      kingdom: '植物界',
      phylum: '被子植物门',
      taxonomicClass: '双子叶植物纲',
      order: '石竹目',
      family: '石竹科',
      genus: '丝石竹属',
    },
    names: {
      scientificName: 'Gypsophila paniculata',
      commonNames: ['满天星', '丝石竹', '锥花丝石竹'],
    },
    bloom: {
      vase: '约 10—14 天',
      soil: '5—8 月',
    },
    careVase: {
      summary: '耐插耐干，适合配花或整束；保持通风、水质清洁即可。',
      waterChange: '2—3 天换水一次，水位不宜过深',
      environment: '通风良好，避免潮湿闷热',
    },
    atlas: {
      summary:
        '石竹科丝石竹属多年生草本。花序细碎繁密如繁星，是经典配花，也常见整束或干花售卖。',
      features: ['花量繁密', '轻盈灵动', '耐瓶插', '可做干花'],
      bloomSeason: '5—8 月',
      origin: '欧洲、亚洲温带；现广泛商业化种植',
    },
    careGuide: {
      summary: '容易养护，通风与清洁水质是关键。',
      light: '明亮散射光',
      water: '切花浅水养护，忌花瓣长期浸水',
      soil: '疏松透气、排水良好',
      temperature: '15—25℃',
      tips: ['适合填充花束空隙', '自然风干可制干花', '染色品种避免强光褪色'],
    },
    language: {
      summary: '满天星常代表思念、纯洁与配角般温柔的陪伴。',
      meaning: '思念、纯洁、甘愿陪伴与浪漫点缀',
      occasions: ['表白', '毕业', '日常伴手花', '干花纪念'],
      colorMeanings: [
        { color: '白', meaning: '纯洁、思念' },
        { color: '粉', meaning: '浪漫、温柔' },
        { color: '蓝', meaning: '梦幻、清新' },
      ],
    },
  },
  绣球: {
    taxonomy: {
      kingdom: '植物界',
      phylum: '被子植物门',
      taxonomicClass: '双子叶植物纲',
      order: '绣球目',
      family: '绣球科',
      genus: '绣球属',
    },
    names: {
      scientificName: 'Hydrangea macrophylla',
      commonNames: ['绣球', '八仙花', '紫阳花'],
    },
    bloom: {
      vase: '约 5—10 天',
      soil: '6—8 月',
    },
    careVase: {
      summary: '喜湿润，切花需充足吸水；可喷雾保湿，避免强风直吹。',
      waterChange: '每日换水，高温时可早晚补水',
      trim: '十字或斜剪茎部增加吸水面积',
      environment: '明亮散射光，避免暴晒与空调直吹',
    },
    atlas: {
      summary:
        '绣球科绣球属落叶灌木。花序团状饱满，蓝粉白等色常见，是韩式花束与婚礼布置的热门花材。',
      features: ['团状花序', '色彩梦幻', '花量饱满', '适合韩式花束'],
      bloomSeason: '6—8 月',
      origin: '东亚；日本、中国及欧美广泛栽培',
    },
    careGuide: {
      summary: '喜湿润半阴，切花需保证吸水与湿度。',
      light: '散射光，忌烈日暴晒',
      water: '保持土壤湿润；切花勤换水，可喷雾保湿',
      soil: '肥沃疏松、偏酸性基质',
      temperature: '18—25℃',
      tips: ['茎部吸水能力差时可烫茎或十字剪', '避免干燥风口', '花色受土壤酸碱影响'],
    },
    language: {
      summary: '绣球象征团聚、希望与浪漫，花团锦簇寓意美满。',
      meaning: '团聚、希望、浪漫与真诚',
      occasions: ['婚礼', '家居插花', '夏日主题花束'],
      colorMeanings: [
        { color: '蓝', meaning: '浪漫、梦幻与真诚' },
        { color: '粉', meaning: '温柔、甜蜜' },
        { color: '白', meaning: '纯洁、希望' },
      ],
    },
  },
  洋桔梗: {
    taxonomy: {
      kingdom: '植物界',
      phylum: '被子植物门',
      taxonomicClass: '双子叶植物纲',
      order: '龙胆目',
      family: '龙胆科',
      genus: '洋桔梗属',
    },
    names: {
      scientificName: 'Eustoma grandiflorum',
      commonNames: ['洋桔梗', '土耳其桔梗', '丽莎草'],
    },
    bloom: {
      vase: '约 7—12 天',
      soil: '6—9 月',
    },
    careVase: {
      summary: '花瓣薄而娇嫩，避免碰伤与强风；清洁水质、适度通风。',
      waterChange: '每日或隔日换水',
      environment: '明亮散射光，避免触碰花瓣',
    },
    atlas: {
      summary:
        '龙胆科洋桔梗属多年生草本。花型如玫瑰又带铃兰般的轻盈，是法式花束与新娘手捧的热门配花。',
      features: ['花型似玫瑰', '轻盈优雅', '色彩柔和', '配花百搭'],
      bloomSeason: '6—9 月',
      origin: '北美草原；现日本、云南等地大量栽培',
    },
    careGuide: {
      summary: '娇嫩易损，保持清洁水质与通风，避免挤压。',
      light: '明亮散射光',
      water: '切花勤换水，忌花瓣沾水腐烂',
      soil: '疏松透气、排水良好',
      temperature: '18—25℃',
      tips: ['去除下部叶片', '轻拿轻放防折瓣', '适合混搭提升层次感'],
    },
    language: {
      summary: '洋桔梗代表真诚、纯洁与没有杂念的爱。',
      meaning: '真诚、纯洁、永恒的爱',
      occasions: ['婚礼', '表白', '法式花束'],
      colorMeanings: [
        { color: '白', meaning: '纯洁、真诚' },
        { color: '紫', meaning: '优雅、永恒' },
        { color: '绿', meaning: '清新、自然' },
      ],
    },
  },
  非洲菊: {
    taxonomy: {
      kingdom: '植物界',
      phylum: '被子植物门',
      taxonomicClass: '双子叶植物纲',
      order: '菊目',
      family: '菊科',
      genus: '非洲菊属',
    },
    names: {
      scientificName: 'Gerbera jamesonii',
      commonNames: ['非洲菊', '扶郎花', '太阳菊'],
    },
    bloom: {
      vase: '约 7—10 天',
      soil: '全年（温室切花）',
    },
    careVase: {
      summary: '花茎中空易弯折，宜选高瓶支撑；勤换水，避免花托积水。',
      waterChange: '每日换水，水位约茎长 1/3',
      environment: '明亮散射光，保持通风',
    },
    atlas: {
      summary:
        '菊科非洲菊属多年生草本。花盘明亮、色彩鲜艳，是庆典花篮与混搭花束的常用主花。',
      features: ['色彩鲜艳', '花盘大', '耐开', '节庆常用'],
      bloomSeason: '全年（温室切花）',
      origin: '南非；现全球广泛商业化种植',
    },
    careGuide: {
      summary: '保持清洁水质与通风，注意支撑花茎。',
      light: '明亮散射光',
      water: '勤换水，避免花托长期浸水',
      soil: '疏松肥沃、排水良好',
      temperature: '18—25℃',
      tips: ['花茎中空，可用高瓶支撑', '避免强风', '花托沾水易腐烂'],
    },
    language: {
      summary: '非洲菊象征快乐、活力与互敬互爱。',
      meaning: '快乐、活力、尊敬与坚毅',
      occasions: ['庆典', '探望', '开业花篮'],
      colorMeanings: [
        { color: '红', meaning: '热情、关爱' },
        { color: '黄', meaning: '快乐、活力' },
        { color: '粉', meaning: '温馨、美好' },
      ],
    },
  },
  马蹄莲: {
    taxonomy: {
      kingdom: '植物界',
      phylum: '被子植物门',
      taxonomicClass: '单子叶植物纲',
      order: '泽泻目',
      family: '天南星科',
      genus: '马蹄莲属',
    },
    names: {
      scientificName: 'Zantedeschia aethiopica',
      commonNames: ['马蹄莲', '水芋', '海芋百合'],
    },
    bloom: {
      vase: '约 7—10 天',
      soil: '春末至初夏',
    },
    careVase: {
      summary: '佛焰苞娇嫩，避免触碰与挤压；浅水养护，保持清洁。',
      waterChange: '每日换水，少量多次补水',
      environment: '明亮散射光，远离热源',
    },
    atlas: {
      summary:
        '天南星科马蹄莲属多年生草本。佛焰苞线条简洁优雅，是婚礼手捧与极简花艺的代表花材。',
      features: ['线条简洁', '佛焰苞优雅', '婚礼常用', '现代感强'],
      bloomSeason: '春末至初夏',
      origin: '南非；现温带地区广泛栽培',
    },
    careGuide: {
      summary: '喜湿润凉爽，切花宜浅水、避挤压。',
      light: '散射光，忌暴晒',
      water: '保持湿润；切花浅水养护',
      soil: '肥沃疏松、保水透气',
      temperature: '15—22℃',
      tips: ['佛焰苞易损伤，轻拿轻放', '花茎可斜剪', '适合新娘手捧'],
    },
    language: {
      summary: '马蹄莲象征圣洁、忠贞与美好希冀。',
      meaning: '圣洁、忠贞、美好与希望',
      occasions: ['婚礼', '洗礼', '高端礼盒'],
      colorMeanings: [
        { color: '白', meaning: '纯洁、神圣' },
        { color: '黄', meaning: '尊贵、美好' },
        { color: '粉', meaning: '温柔、浪漫' },
      ],
    },
  },
  芍药: {
    taxonomy: {
      kingdom: '植物界',
      phylum: '被子植物门',
      taxonomicClass: '双子叶植物纲',
      order: '虎耳草目',
      family: '芍药科',
      genus: '芍药属',
    },
    names: {
      scientificName: 'Paeonia lactiflora',
      commonNames: ['芍药', '将离', '殿春'],
    },
    bloom: {
      vase: '约 3—5 天',
      soil: '5—6 月',
    },
    careVase: {
      summary: '切花宜浅水养护，保持通风，避免高温。',
      waterChange: '浅水养护，约 2 天换水一次',
    },
    atlas: {
      summary:
        '芍药科芍药属多年生草本。花大色艳、香气清雅，与牡丹并称「花中二绝」，是春日中式花束与婚礼常用花材。',
      features: ['花型层叠', '香气清幽', '春日应季', '中式花材'],
      bloomSeason: '5—6 月',
      origin: '中国；现广泛栽培作切花与观赏',
    },
    careGuide: {
      summary: '喜凉爽通风，切花忌高温与强风。',
      light: '明亮散射光',
      water: '切花浅水养护，土培见干见湿',
      soil: '疏松肥沃、排水良好',
      temperature: '15—22℃',
      tips: ['斜剪花茎', '去除多余叶片', '避免阳光直射'],
    },
    language: {
      summary: '芍药寓意情有所钟、美丽动人，是表达爱意的传统花材。',
      meaning: '美丽、情钟、惜别与祝福',
      occasions: ['婚礼', '表白', '春日赠礼'],
      colorMeanings: [
        { color: '粉', meaning: '温柔、初恋' },
        { color: '白', meaning: '纯洁、真挚' },
        { color: '红', meaning: '热烈、美丽' },
      ],
    },
  },
  菊花: {
    taxonomy: {
      kingdom: '植物界',
      phylum: '被子植物门',
      taxonomicClass: '双子叶植物纲',
      order: '菊目',
      family: '菊科',
      genus: '菊属',
    },
    names: {
      scientificName: 'Chrysanthemum morifolium',
      commonNames: ['菊花', '秋菊', '寿客'],
    },
    bloom: {
      vase: '约 10—14 天',
      soil: '9—11 月',
    },
    careVase: {
      summary: '耐瓶插，保持清洁水质与良好通风即可。',
      waterChange: '2—3 天换水，保持水质清洁',
    },
    atlas: {
      summary:
        '菊科菊属多年生草本。花型多样、色彩丰富，是秋季最具代表性的切花与配花之一，亦常用于祭奠与敬老场景。',
      features: ['耐瓶插', '花型多样', '秋季应季', '配花百搭'],
      bloomSeason: '9—11 月',
      origin: '中国；现全球广泛栽培',
    },
    careGuide: {
      summary: '容易养护，注意换水与通风。',
      light: '明亮散射光',
      water: '切花勤换水，忌长期浸叶',
      soil: '疏松肥沃即可',
      temperature: '15—22℃',
      tips: ['去除浸水叶片', '远离乙烯源', '适合混搭填充'],
    },
    language: {
      summary: '菊花在中国文化中寓意高洁、长寿，亦因场景不同而有多种解读。',
      meaning: '高洁、长寿、思念与祝福',
      occasions: ['重阳', '探望长辈', '祭奠', '日常配花'],
      colorMeanings: [
        { color: '黄', meaning: '尊贵、长寿' },
        { color: '白', meaning: '哀思、纯洁' },
        { color: '粉', meaning: '温柔、愉快' },
      ],
    },
  },
  勿忘我: {
    taxonomy: {
      kingdom: '植物界',
      phylum: '被子植物门',
      taxonomicClass: '双子叶植物纲',
      order: '紫草目',
      family: '紫草科',
      genus: '勿忘草属',
    },
    names: {
      scientificName: 'Myosotis sylvatica',
      commonNames: ['勿忘我', '勿忘草', '星辰花'],
    },
    bloom: {
      vase: '约 7—10 天',
      soil: '4—6 月',
    },
    careVase: {
      summary: '小花材需勤换水，保持通风，避免挤压花头。',
      waterChange: '每日换水',
      environment: '明亮散射光，通风良好',
    },
    atlas: {
      summary:
        '紫草科勿忘草属多年生草本。花小而密、色彩明快，是表达记忆与思念的经典配花，亦常作干花售卖。',
      features: ['花小而密', '色彩明快', '配花常用', '可制干花'],
      bloomSeason: '4—6 月',
      origin: '欧洲；现广泛作切花与干花',
    },
    careGuide: {
      summary: '保持清洁水质，避免花头受压。',
      light: '散射光',
      water: '每日换水',
      soil: '疏松湿润',
      temperature: '15—20℃',
      tips: ['轻拿轻放', '适合填充点缀', '可倒挂制干花'],
    },
    language: {
      summary: '勿忘我象征永恒的记忆与真挚的爱，名字本身即是最直接的寓意。',
      meaning: '永恒的记忆、真挚的爱、勿相忘',
      occasions: ['表白', '纪念日', '毕业', '配花点缀'],
      colorMeanings: [
        { color: '蓝', meaning: '永恒记忆' },
        { color: '粉', meaning: '浪漫、甜蜜' },
        { color: '紫', meaning: '优雅、珍贵' },
      ],
    },
  },
  紫罗兰: {
    taxonomy: {
      kingdom: '植物界',
      phylum: '被子植物门',
      taxonomicClass: '双子叶植物纲',
      order: '金虎尾目',
      family: '堇菜科',
      genus: '堇菜属',
    },
    names: {
      scientificName: 'Viola odorata',
      commonNames: ['紫罗兰', '香堇菜', '草紫罗兰'],
    },
    bloom: {
      vase: '约 5—7 天',
      soil: '3—5 月',
    },
    careVase: {
      summary: '花体娇嫩，宜浅水、通风，避免高温。',
      waterChange: '每日换水，保持清洁',
      environment: '凉爽通风处',
    },
    atlas: {
      summary:
        '堇菜科堇菜属多年生草本。香气幽雅、花色柔和，是欧式小束与春季混搭的常见花材。',
      features: ['香气幽雅', '花色柔和', '春季应季', '小巧精致'],
      bloomSeason: '3—5 月',
      origin: '欧洲；现作温室与切花栽培',
    },
    careGuide: {
      summary: '喜凉爽，忌高温闷热。',
      light: '明亮散射光',
      water: '浅水勤换',
      soil: '疏松肥沃',
      temperature: '12—18℃',
      tips: ['避免花头沾水', '适合小束搭配', '远离热源'],
    },
    language: {
      summary: '紫罗兰象征永恒的美与爱，亦代表谦逊与忠诚。',
      meaning: '永恒的美、忠诚、谦逊',
      occasions: ['表白', '春日小束', '纪念日'],
      colorMeanings: [
        { color: '紫', meaning: '永恒的美' },
        { color: '白', meaning: '纯洁、忠诚' },
        { color: '粉', meaning: '温柔、浪漫' },
      ],
    },
  },
  风信子: {
    taxonomy: {
      kingdom: '植物界',
      phylum: '被子植物门',
      taxonomicClass: '单子叶植物纲',
      order: '天门冬目',
      family: '天门冬科',
      genus: '风信子属',
    },
    names: {
      scientificName: 'Hyacinthus orientalis',
      commonNames: ['风信子', '洋水仙', '五色水仙'],
    },
    bloom: {
      vase: '约 7—10 天',
      soil: '3—4 月',
    },
    careVase: {
      summary: '球根切花或带瓶插，保持清洁水质，避免阳光直射。',
      waterChange: '每日换水',
      environment: '明亮散射光',
    },
    atlas: {
      summary:
        '天门冬科风信子属多年生球根花卉。花序紧凑、香气浓郁，是春季节日与家居插花的经典选择。',
      features: ['香气浓郁', '花序紧凑', '春季球根', '色彩丰富'],
      bloomSeason: '3—4 月',
      origin: '地中海东部；现广泛作球根切花',
    },
    careGuide: {
      summary: '喜光通风，忌积水与高温。',
      light: '充足散射光',
      water: '勤换水，水位不宜过高',
      soil: '疏松透气球根基质',
      temperature: '15—20℃',
      tips: ['敏感体质者注意香气', '斜剪花茎', '远离水果'],
    },
    language: {
      summary: '风信子象征生命的喜悦与重生的爱，不同颜色寓意略有差异。',
      meaning: '喜悦、重生、浪漫与祝福',
      occasions: ['春节', '生日', '新居', '春日赠礼'],
      colorMeanings: [
        { color: '蓝', meaning: '恒心、生命' },
        { color: '粉', meaning: '浪漫、幸福' },
        { color: '白', meaning: '纯洁、尊敬' },
      ],
    },
  },
  蝴蝶兰: {
    taxonomy: {
      kingdom: '植物界',
      phylum: '被子植物门',
      taxonomicClass: '单子叶植物纲',
      order: '天门冬目',
      family: '兰科',
      genus: '蝴蝶兰属',
    },
    names: {
      scientificName: 'Phalaenopsis spp.',
      commonNames: ['蝴蝶兰', '蝶兰', '台湾兰'],
    },
    bloom: {
      vase: '盆栽观赏约 2—3 个月',
      soil: '冬春季为主',
    },
    careVase: {
      summary: '以盆栽观赏为主；切花较少见，需高湿通风环境。',
      waterChange: '见干见湿，忌积水',
      environment: '明亮散射光，高湿通风',
    },
    atlas: {
      summary:
        '兰科蝴蝶兰属附生兰。花形如蝶、花期长，是高端礼品与家居观赏的代表性兰花。',
      features: ['花形如蝶', '花期较长', '高端礼品', '温室栽培'],
      bloomSeason: '冬春季为主',
      origin: '东南亚热带；现广泛温室生产',
    },
    careGuide: {
      summary: '喜温湿、散射光，忌暴晒与积水。',
      light: '明亮散射光',
      water: '见干见湿，喷雾增湿',
      soil: '水苔或兰花专用基质',
      temperature: '18—28℃',
      tips: ['避免叶心积水', '通风良好', '花后适当施肥'],
    },
    language: {
      summary: '蝴蝶兰象征幸福向你飞来，是祝福与高雅品位的经典礼品花。',
      meaning: '幸福、祝福、高雅与纯洁',
      occasions: ['开业', '贺寿', '商务赠礼', '家居观赏'],
      colorMeanings: [
        { color: '白', meaning: '纯洁、祝福' },
        { color: '粉', meaning: '幸福、浪漫' },
        { color: '黄', meaning: '财富、吉祥' },
      ],
    },
  },
  洋牡丹: {
    taxonomy: {
      kingdom: '植物界',
      phylum: '被子植物门',
      taxonomicClass: '双子叶植物纲',
      order: '毛茛目',
      family: '毛茛科',
      genus: '毛茛属',
    },
    names: {
      scientificName: 'Ranunculus asiaticus',
      commonNames: ['洋牡丹', '花毛茛', '陆莲花'],
    },
    bloom: {
      vase: '约 5—7 天',
      soil: '3—5 月',
    },
    careVase: {
      summary: '花茎中空易弯，宜高瓶支撑；勤换水，避直射光。',
      waterChange: '每日换水',
      trim: '斜剪并去除多余叶片',
    },
    atlas: {
      summary:
        '毛茛科毛茛属多年生草本。花瓣层叠如牡丹而更显轻盈，是春季法式花束与新娘手捧的热门花材。',
      features: ['层叠花型', '春季应季', '法式花束', '色彩丰富'],
      bloomSeason: '3—5 月',
      origin: '地中海沿岸；现广泛作切花栽培',
    },
    careGuide: {
      summary: '喜凉爽，忌高温；切花需支撑瓶插。',
      light: '明亮散射光',
      water: '勤换水，保持清洁',
      soil: '疏松排水良好',
      temperature: '12—18℃',
      tips: ['使用高瓶支撑', '避免强风', '及时去除残花'],
    },
    language: {
      summary: '洋牡丹象征魅力、华丽与受欢迎，层叠花瓣传递丰富情感。',
      meaning: '魅力、受欢迎、华丽与美好',
      occasions: ['婚礼', '生日', '法式花束', '春日赠礼'],
      colorMeanings: [
        { color: '粉', meaning: '温柔、魅力' },
        { color: '白', meaning: '纯洁、优雅' },
        { color: '橙', meaning: '活力、受欢迎' },
      ],
    },
  },
  雏菊: {
    taxonomy: {
      kingdom: '植物界',
      phylum: '被子植物门',
      taxonomicClass: '双子叶植物纲',
      order: '菊目',
      family: '菊科',
      genus: '雏菊属',
    },
    names: {
      scientificName: 'Bellis perennis',
      commonNames: ['雏菊', '延命菊', '春菊'],
    },
    bloom: {
      vase: '约 7—10 天',
      soil: '3—6 月',
    },
    careVase: {
      summary: '小巧耐插，适合野趣与森系混搭；保持通风与清洁水质。',
      waterChange: '每日换水',
      environment: '明亮散射光，通风良好',
    },
    atlas: {
      summary:
        '菊科雏菊属多年生草本。花形小巧清新，是野趣花束、森系花艺的常见配花。',
      features: ['花形小巧', '清新自然', '配花百搭', '野趣感强'],
      bloomSeason: '3—6 月',
      origin: '欧洲；现广泛作园林与切花栽培',
    },
    careGuide: {
      summary: '容易养护，注意通风与换水即可。',
      light: '充足散射光',
      water: '切花勤换水，忌长期浸叶',
      soil: '疏松肥沃即可',
      temperature: '15—22℃',
      tips: ['适合混搭填充', '避免高温闷热', '小花易干，及时补水'],
    },
    language: {
      summary: '雏菊象征天真、纯洁与深藏在心底的快乐。',
      meaning: '天真、纯洁、和平与希望',
      occasions: ['日常小束', '野趣花束', '毕业祝福'],
      colorMeanings: [
        { color: '白', meaning: '纯洁、天真' },
        { color: '粉', meaning: '温柔、愉快' },
      ],
    },
  },
}

function getKindProfile(kindName) {
  const key = String(kindName || '').trim()
  if (!key) return null
  return WIKI_KIND_PROFILES[key] || null
}

module.exports = {
  WIKI_KIND_PROFILES,
  getKindProfile,
}
