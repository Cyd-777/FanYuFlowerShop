/**
 * 玫瑰 L2 专文（图鉴 intro + 花语 + 富养护）
 * 弗洛伊德 / 朱丽叶 / 戴安娜 / 卡布奇诺 已手写，不在此文件。
 */
const REGIONS = ['region.ecuador', 'region.colombia', 'region.yunnan']
const SEASON_BLOOM = [
  { season: '夏季', days: '约 7—8 天' },
  { season: '冬季', days: '约 9—10 天' },
]

function ht(scientific, group = 'group.hybrid_tea', extra = {}) {
  return {
    taxonomyRef: 'taxonomy.rose',
    identity: {
      scientificName: scientific,
      horticulturalGroup: group,
      ...extra.identity,
    },
    origin: {
      breedingOrigin: extra.breedingOrigin || '荷兰',
      productionRegions: REGIONS,
    },
    morphology: {
      flowerForm: extra.flowerForm || ['trait.cup_heart'],
      petalCount: extra.petalCount || '约 35 至 45 枚',
      bloomDiameterCm: extra.bloomDiameterCm || '8 至 10',
      color: extra.color || '',
      stem: extra.stem || '茎干挺直，刺中等，便于打刺与瓶插',
      foliage: extra.foliage || '叶片深绿',
      scent: extra.scent || '淡香',
    },
  }
}

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

const ROSE_L2_CONTENT = {
  卡罗拉: {
    names: { scientificName: "Rosa 'Carola'", commonNames: ['Carola', '超级红玫瑰'] },
    bloom: {
      vase: '约 7—10 天',
      vaseNote: '经典高杯红玫瑰，勤换水可稳定保持花型',
      vaseBySeason: SEASON_BLOOM,
    },
    careVaseOverride: {
      summary: '经典高杯红玫瑰，勤换水可稳定保持花型。',
      tips: ['丝绒质感花瓣忌触碰与挤压', '花头较大，醒花时间建议不少于 4 小时'],
    },
    atlas: {
      intro: ht("Rosa 'Carola'", 'group.hybrid_tea', {
        breedingOrigin: '德国',
        identity: {
          breeder: '德国 W. Kordes',
          introducedYear: '1980 年代',
          namingNote: '花店语境里「超级红玫瑰」的经典指代，情人节与庆典高频花材',
        },
        color:
          '正红而均匀，高杯型开放，花瓣厚实带丝绒质感，是辨识度极高的「标准红玫瑰」',
      }),
      featureRefs: ['trait.high_cup', 'trait.classic_red', 'trait.velvet_texture'],
      origin: '育种德国；主产区厄瓜多尔、哥伦比亚、中国云南',
      cultivar: {
        horticulturalGroup: '杂交茶香月季 Hybrid Tea',
        breeder: 'Kordes',
        introducedYear: '1980 年代',
      },
      distinguishFrom: [
        { name: '弗洛伊德', difference: '玫红丝绒，而非正红高杯' },
        { name: '高盛', difference: '红调偏暗，更接近暗红' },
        { name: '卡罗拉', difference: '正红、高杯、丝绒质感，是花店「标准红玫瑰」最常见辨识' },
      ],
    },
    language: lang(
      '热烈、经典与「就是玫瑰本身」的告白',
      [
        '卡罗拉的正红几乎没有学习成本——收到的人立刻知道「这是玫瑰，而且是很标准的那种」。它适合情人节、纪念日、表白，以及一切需要「明确表达爱意」的场合。',
        '若对方偏好低调，卡罗拉可能略张扬；但对多数人来说，这是最稳妥、最不出错的红玫瑰选择。与满天星、尤加利或纯红单品种花束都很经典。',
      ],
      ['情人节', '表白', '纪念日', '求婚', '庆典'],
      '正红',
      '经典、热烈、明确；花店标准红玫瑰',
      [
        { style: '经典告白', flowers: ['满天星', '尤加利叶'], note: '红绿白永不过时' },
        { style: '隆重花束', flowers: ['白雪山', '洋桔梗'], note: '红白对比，适合庆典' },
      ],
      '丝绒花瓣忌挤压；运输后建议醒花再插瓶。',
    ),
  },

  艾莎: {
    names: { scientificName: "Rosa 'Aisha'", commonNames: ['Aisha', '艾莎玫瑰'] },
    bloom: {
      vase: '约 7—10 天',
      vaseNote: '复色边对水质与剪根较敏感',
      vaseBySeason: SEASON_BLOOM,
    },
    careVaseOverride: {
      summary: '复色边玫瑰，瓶插期对水质与剪根同样敏感。',
      trimPosition: '复色品种更忌叶浸水，仅保留花头附近少量健康叶',
      tips: ['边色品种避免阳光直射以防褪色过快'],
    },
    atlas: {
      intro: ht("Rosa 'Aisha'", 'group.hybrid_tea', {
        identity: {
          introducedYear: '2000 年代',
          namingNote: '红边白底的复色切花，婚礼与表白场景极高频',
        },
        breedingOrigin: '厄瓜多尔',
        color:
          '白色或奶油色底，边缘晕染鲜红或玫红，层次清晰；开放后仍保持复色边界',
      }),
      featureRefs: ['trait.bicolor_edge', 'trait.high_cup'],
      origin: '主产区厄瓜多尔、哥伦比亚、中国云南',
      distinguishFrom: [
        { name: '金辉', difference: '黄底红边，而非白底红边' },
        { name: '闪耀', difference: '条纹复色，而非整边晕染' },
        { name: '艾莎', difference: '红边白底、边界清晰，是婚礼复色玫瑰代表' },
      ],
    },
    language: lang(
      '我的心中只有你；纯净底色上的热烈边缘',
      [
        '艾莎的白底与红边，像「表面克制、内里炽烈」——适合表白、婚礼与纪念日。它比纯红含蓄，又比纯粉更有宣言感。',
        '婚礼手捧、领证花束、求婚都常见；送给恋人表达「你是我唯一的选择」非常贴切。搭配白绿或同色系低饱和配花，能突出边色。',
      ],
      ['婚礼', '表白', '纪念日', '求婚'],
      '红边白底',
      '复色、高级感；婚礼与表白高频',
      [
        { style: '婚礼', flowers: ['白雪山', '尤加利叶'], note: '白绿衬托红边' },
        { style: '表白', flowers: ['戴安娜', '洋桔梗'], note: '粉白系过渡更柔和' },
      ],
      '边色避强光；水质不清易导致整朵提前萎蔫，须勤换水。',
    ),
  },

  粉雪山: {
    names: {
      scientificName: "Rosa 'Pink Avalanche'",
      commonNames: ['Pink Avalanche', '粉雪山玫瑰'],
    },
    bloom: { vase: '约 7—10 天', vaseNote: '雪山系列花头大，醒花需充分', vaseBySeason: SEASON_BLOOM },
    careVaseOverride: {
      summary: '粉雪山花头大、瓣层多，醒花建议不少于 4 小时，勤换水可延长瓶插期。',
      tips: ['雪山系列花头重，瓶口需稳固', '低饱和粉色避强光可减缓褪色'],
    },
    atlas: {
      intro: ht("Rosa 'Pink Avalanche'", 'group.hybrid_tea', {
        identity: {
          breeder: '荷兰 De Ruiter',
          introducedYear: '1990 年代',
          namingNote: 'Avalanche 雪山系列低饱和粉色代表',
        },
        color: '低饱和柔粉色，花型规整、花头偏大，开放后层次清晰',
        petalCount: '约 40 至 50 枚',
      }),
      featureRefs: ['trait.low_sat_pink', 'trait.large_head'],
      distinguishFrom: [
        { name: '戴安娜', difference: '更偏均匀正粉，花头略小' },
        { name: '粉红雪山', difference: '粉白过渡更柔、更浅' },
        { name: '粉雪山', difference: '低饱和柔粉、花头大，是雪山系列粉色代表' },
      ],
    },
    language: lang(
      '温柔、婚礼与「很上镜的粉」',
      [
        '粉雪山的粉，是低饱和、适合拍照与婚礼的「高级粉」。它比戴安娜更浅、更柔，常用于新娘侧花、桌花与大型花艺。',
        '婚礼、生日、送女性长辈都合适；若对方喜欢「很仙的粉」，粉雪山比正粉更安全。',
      ],
      ['婚礼', '生日', '送长辈', '拍照花束'],
      '低饱和粉',
      '温柔、婚礼、上镜',
      [
        { style: '婚礼', flowers: ['白雪山', '喷泉草'], note: '白粉绿经典婚礼色' },
        { style: '温柔礼盒', flowers: ['洋桔梗', '满天星'], note: '浅粉层次' },
      ],
      '花头大，运输后务必醒花；忌挤压花头。',
    ),
  },

  蜜桃雪山: {
    names: {
      scientificName: "Rosa 'Peach Avalanche'",
      commonNames: ['Peach Avalanche', '蜜桃雪山玫瑰'],
    },
    bloom: { vase: '约 7—10 天', vaseNote: '杏色雪山系列，勤换水稳定观赏', vaseBySeason: SEASON_BLOOM },
    careVaseOverride: {
      summary: '蜜桃雪山为杏色雪山系列，花头大，醒花充分后瓶插表现稳定。',
      tips: ['杏色调避强光', '雪山系列每日换水'],
    },
    atlas: {
      intro: ht("Rosa 'Peach Avalanche'", 'group.hybrid_tea', {
        identity: { breeder: '荷兰 De Ruiter', namingNote: '雪山系列杏色/蜜桃色代表' },
        color: '外层杏色、向内渐变为浅粉，整体温暖复古',
      }),
      featureRefs: ['trait.large_head', 'trait.apricot_cup'],
      distinguishFrom: [
        { name: '朱丽叶', difference: '奥斯汀杯状重瓣，而非雪山高杯' },
        { name: '猪小姐', difference: '粉橙渐变更活泼' },
        { name: '蜜桃雪山', difference: '杏色雪山、花头大，偏婚礼与复古暖调' },
      ],
    },
    language: lang(
      '温暖、感谢与「长辈也会喜欢的花」',
      [
        '蜜桃雪山的杏色，比纯粉更暖、比橙色更柔，常被用来表达感谢与祝福——探病、看望长辈、教师节都很得体。',
        '婚礼与家居插瓶也常见；与绿色、白色配花能突出其暖调，适合秋冬氛围。',
      ],
      ['感谢', '探病', '送长辈', '婚礼', '家居插瓶'],
      '杏色',
      '温暖、复古、感谢',
      [
        { style: '感谢花束', flowers: ['尤加利叶', '白雪山'], note: '暖杏+白绿，得体不张扬' },
        { style: '复古暖调', flowers: ['卡布奇诺', '洋甘菊'], note: '同色系低饱和' },
      ],
      '杏色在强光下易偏浅；醒花不足时外瓣易发软。',
    ),
  },

  白雪山: {
    names: {
      scientificName: "Rosa 'White Avalanche'",
      commonNames: ['White Avalanche', '白雪山玫瑰'],
    },
    bloom: { vase: '约 7—10 天', vaseNote: '纯白高杯，勤换水保持洁净感', vaseBySeason: SEASON_BLOOM },
    careVaseOverride: {
      summary: '白雪山瓣层多、花型好，需勤换水保持水质清澈，避免外瓣发黄。',
      tips: ['纯白品种水质浑浊时外瓣易发黄', '醒花 4 小时以上'],
    },
    atlas: {
      intro: ht("Rosa 'White Avalanche'", 'group.hybrid_tea', {
        identity: { breeder: '荷兰 De Ruiter', namingNote: '雪山系列纯白代表，婚礼与悼念皆常见' },
        color: '纯白高杯，花瓣厚实，开放后花型仍较保持',
      }),
      featureRefs: ['trait.pure_white', 'trait.large_head'],
      distinguishFrom: [
        { name: '艾莎', difference: '白底红边复色，而非纯白' },
        { name: '粉雪山', difference: '柔粉色，而非纯白' },
        { name: '白雪山', difference: '纯白、高杯、花头大，婚礼白玫瑰最常见之一' },
      ],
    },
    language: lang(
      '纯洁、尊重与新的开始',
      [
        '白雪山是婚礼、洗礼、毕业典礼里「最标准」的白玫瑰之一。它表达纯洁与尊重，也适合道歉后重归于好的「重新开始」。',
        '悼念场合也常用白雪山表达哀思与怀念——若需庄重、克制，纯白往往比彩色更合适。',
      ],
      ['婚礼', '毕业典礼', '道歉', '悼念', '探病'],
      '纯白',
      '纯洁、尊重、新开始',
      [
        { style: '婚礼', flowers: ['粉雪山', '尤加利叶'], note: '白粉绿婚礼经典' },
        { style: '庄重悼念', flowers: ['绿康', '白桔梗'], note: '白绿克制配色' },
      ],
      '纯白对水质最敏感；须每日换水并洗净花瓶。',
    ),
  },

  粉红雪山: {
    names: {
      scientificName: "Rosa 'Sweet Avalanche'",
      commonNames: ['Sweet Avalanche', '粉红雪山玫瑰'],
    },
    bloom: { vase: '约 7—10 天', vaseNote: '粉白过渡柔，勤换水', vaseBySeason: SEASON_BLOOM },
    careVaseOverride: {
      summary: '粉红雪山为粉白过渡的雪山系列，花头大，醒花充分后观赏期稳定。',
      tips: ['粉白边色避直射', '雪山系列勤换水'],
    },
    atlas: {
      intro: ht("Rosa 'Sweet Avalanche'", 'group.hybrid_tea', {
        identity: { namingNote: 'Sweet Avalanche，粉白柔过渡的雪山系列' },
        color: '外层柔粉、向内渐近白色，整体轻盈而高级',
      }),
      featureRefs: ['trait.low_sat_pink', 'trait.large_head'],
      distinguishFrom: [
        { name: '粉雪山', difference: '更偏均匀低饱和粉，少粉白过渡' },
        { name: '戴安娜', difference: '均匀正粉，花头相对较小' },
        { name: '粉红雪山', difference: '粉白柔过渡、花头大，适合轻盈婚礼风' },
      ],
    },
    language: lang(
      '轻盈、少女心与柔美的祝福',
      [
        '粉红雪山的粉白过渡，比戴安娜更「仙」、比粉雪山更浅，适合生日、毕业、送年轻女性。',
        '婚礼桌花与拍照花束常见；与白色、浅紫配花能强化轻盈感。',
      ],
      ['生日', '毕业', '婚礼', '送友人'],
      '粉白',
      '轻盈、柔美、少女系',
      [
        { style: '轻盈生日', flowers: ['洋桔梗', '满天星'], note: '浅粉白层次' },
        { style: '婚礼桌花', flowers: ['白雪山', '鼠尾草'], note: '粉白绿清新' },
      ],
      '过渡色在运输挤压后易出现色差，醒花后再插瓶。',
    ),
  },

  香槟玫瑰: {
    names: { scientificName: "Rosa 'Champagne'", commonNames: ['Champagne', '香槟玫瑰'] },
    bloom: { vase: '约 7—10 天', vaseNote: '香槟色对水质较敏感', vaseBySeason: SEASON_BLOOM },
    careVaseOverride: {
      summary: '香槟色系对水质较敏感，建议每日换水；避直射可减缓褪色。',
      tips: ['香槟色系对水质敏感，建议每日换水', '避强光保持色泽'],
    },
    atlas: {
      intro: ht("Rosa 'Champagne'", 'group.hybrid_tea', {
        identity: { namingNote: '名称取自香槟酒色，寓意庆祝与优雅' },
        color: '浅香槟或奶油色，带微微金调，低饱和而优雅',
      }),
      featureRefs: ['trait.champagne_tone', 'trait.gentle_scent'],
      distinguishFrom: [
        { name: '蜜桃雪山', difference: '偏杏暖，而非香槟金调' },
        { name: '流沙', difference: '裸粉灰调，而非香槟金' },
        { name: '香槟玫瑰', difference: '香槟金调、优雅低饱和，庆祝与感谢高频' },
      ],
    },
    language: lang(
      '庆祝、感谢与优雅',
      [
        '香槟玫瑰的色调像庆祝场合里的一杯香槟——不喧闹，但有仪式感。适合升职、开业、感谢客户或老师，也适合「值得纪念但不需大红大绿」的时刻。',
        '与白色、绿色或同色系配花都很高级；送给偏好素雅的人，比正红更得体。',
      ],
      ['感谢', '开业', '升职', '纪念日', '送师长'],
      '香槟色',
      '庆祝、优雅、感谢',
      [
        { style: '庆祝花束', flowers: ['白雪山', '尤加利叶'], note: '香槟+白绿，克制而隆重' },
        { style: '商务感谢', flowers: ['绿康', '洋桔梗'], note: '适合职场与师长' },
      ],
      '香槟色在强光下易偏白；若对方期待「很喜庆的红」，可能觉得不够热闹。',
    ),
  },

  金枝玉叶: {
    names: {
      scientificName: "Rosa 'Golden Leaf'",
      commonNames: ['Golden Leaf', '金枝玉叶玫瑰'],
    },
    bloom: { vase: '约 7—10 天', vaseNote: '明亮黄色，避乙烯与直射', vaseBySeason: SEASON_BLOOM },
    careVaseOverride: {
      summary: '金黄色玫瑰对乙烯与高温较敏感，远离水果与空调出风口。',
      tips: ['黄色系避强光', '远离成熟水果'],
    },
    atlas: {
      intro: ht("Rosa 'Golden Leaf'", 'group.hybrid_tea', {
        identity: { namingNote: '名称寓意友谊与明亮祝福' },
        color: '明亮金黄色，花瓣层叠，开放后色泽饱和',
      }),
      featureRefs: ['trait.yellow_gold', 'trait.thick_petal'],
      distinguishFrom: [
        { name: '金辉', difference: '黄底红边复色，而非纯金黄' },
        { name: '橙芭比', difference: '多头橙色，而非单头金黄' },
        { name: '金枝玉叶', difference: '明亮金黄、友谊花语，开业与送友常见' },
      ],
    },
    language: lang(
      '友谊、快乐与明亮的祝福',
      [
        '黄玫瑰在中文语境里常代表友谊与祝福——金枝玉叶的色调明亮而不俗，适合送朋友、同事、开业庆功，也适合「想让你开心一点」的日常惊喜。',
        '探病场景需留意：部分长辈对黄色花礼有忌讳，赠送前最好了解对方习惯。',
      ],
      ['友谊', '开业', '生日', '庆功', '送友人'],
      '金黄',
      '友谊、快乐、明亮',
      [
        { style: '友谊花束', flowers: ['绿康', '向日葵'], note: '明亮暖色，适合庆功' },
        { style: '开业', flowers: ['白雪山', '尤加利叶'], note: '黄白绿喜庆而不俗' },
      ],
      '部分场合对黄色花礼有忌讳，探病、丧事请先确认对方偏好。',
    ),
  },

  金辉: {
    names: { scientificName: "Rosa 'Jin Hui'", commonNames: ['Jin Hui', '金辉玫瑰'] },
    bloom: { vase: '约 7—10 天', vaseNote: '复色边避直射', vaseBySeason: SEASON_BLOOM },
    careVaseOverride: {
      summary: '黄底红边复色玫瑰，避直射可减缓边色褪色，勤换水斜剪根。',
      trimPosition: '复色品种更忌叶浸水',
      tips: ['边色品种避免阳光直射'],
    },
    atlas: {
      intro: ht("Rosa 'Jin Hui'", 'group.hybrid_tea', {
        identity: { namingNote: '国内常见黄底红边复色切花' },
        breedingOrigin: '中国',
        color: '底色金黄或橙黄，边缘晕染红色，复色对比鲜明',
      }),
      featureRefs: ['trait.bicolor_edge', 'trait.yellow_gold'],
      distinguishFrom: [
        { name: '艾莎', difference: '白底红边，而非黄底红边' },
        { name: '闪耀', difference: '条纹复色，而非整边晕染' },
        { name: '金辉', difference: '黄底红边、对比鲜明，是国内复色玫瑰高频品种' },
      ],
    },
    language: lang(
      '独特、活力与「很上镜的复色」',
      [
        '金辉的黄红对比，在混搭花束里非常抢镜——适合生日、毕业、送给喜欢「有点特别」的朋友。',
        '与橙色、红色或绿色配花都能形成强烈视觉；若对方偏好极简素雅，可能略张扬。',
      ],
      ['生日', '毕业', '送友人', '混搭主花'],
      '黄底红边',
      '复色、独特、活力',
      [
        { style: '活力混搭', flowers: ['橙芭比', '绿康'], note: '暖色对比' },
        { style: '拍照花束', flowers: ['白雪山', '喷泉草'], note: '复色+白绿更出片' },
      ],
      '边色避强光；与艾莎等复色一样忌水质浑浊。',
    ),
  },

  闪耀: {
    names: { scientificName: "Rosa 'Shan Yao'", commonNames: ['Shan Yao', '闪耀玫瑰'] },
    bloom: { vase: '约 7—10 天', vaseNote: '条纹复色，避直射', vaseBySeason: SEASON_BLOOM },
    careVaseOverride: {
      summary: '红带黄纹复色玫瑰，条纹色对光照敏感，阴凉通风可减缓褪色。',
      tips: ['条纹复色避直射', '勤换水保持条纹清晰'],
    },
    atlas: {
      intro: ht("Rosa 'Shan Yao'", 'group.hybrid_tea', {
        identity: { namingNote: '红底黄纹条纹复色，个性切花代表' },
        color: '红色底色上分布黄色或橙黄色条纹，每朵纹路略有不同',
      }),
      featureRefs: ['trait.bicolor_stripe', 'trait.classic_red'],
      distinguishFrom: [
        { name: '金辉', difference: '整边晕染，而非条纹' },
        { name: '狂欢泡泡', difference: '多头发散，而非单头条纹' },
        { name: '闪耀', difference: '红底黄纹、每朵不同，是条纹复色代表' },
      ],
    },
    language: lang(
      '个性、独特与「不撞款」的心意',
      [
        '闪耀的条纹让每一朵都略有不同——适合送给审美独立、讨厌「普通玫瑰」的人，表达「你在我眼里很特别」。',
        '生日、毕业、送创意行业朋友都很合适；混搭时建议少而精，让条纹成为焦点。',
      ],
      ['生日', '毕业', '送友人', '创意礼物'],
      '红带黄纹',
      '条纹复色、个性、不撞款',
      [
        { style: '个性单束', flowers: ['尤加利叶'], note: '少量配叶突出条纹' },
        { style: '毕业礼', flowers: ['橙芭比', '满天星'], note: '活泼混搭' },
      ],
      '条纹色随开放与光照变化；若对方只接受纯色玫瑰，可能不习惯。',
    ),
  },

  橙芭比: {
    names: {
      scientificName: "Rosa 'Orange Barbie'",
      commonNames: ['Orange Barbie', '橙芭比玫瑰'],
    },
    bloom: { vase: '约 7—10 天', vaseNote: '多头发散，枯谢小头及时剪除', vaseBySeason: SEASON_BLOOM },
    careVaseOverride: {
      summary: '橙芭比为多头发散状切花，分枝多需预留瓶口空间，勤换水可延长整体观赏期。',
      tips: ['多头发散，勿过度捆扎茎部', '枯谢小头及时剪除'],
    },
    atlas: {
      intro: ht("Rosa 'Orange Barbie'", 'group.spray_rose', {
        identity: { namingNote: '橙色多头切花，花量大、氛围活泼' },
        color: '明亮橙色，多朵小头同一分枝开放，整体花量感强',
        petalCount: '每朵约 20 至 30 枚',
        bloomDiameterCm: '4 至 6',
      }),
      featureRefs: ['trait.multi_head', 'trait.spray_huge'],
      distinguishFrom: [
        { name: '果汁泡泡', difference: '橙粉复古，而非纯橙明亮' },
        { name: '火灵鸟', difference: '单头渐变变色，而非多头' },
        { name: '橙芭比', difference: '明亮橙色、多头花量大，毕业与庆典常见' },
      ],
    },
    language: lang(
      '活泼、庆祝与「很多朵的小确幸」',
      [
        '橙芭比的一束里有很多小头——视觉热闹、价格 often 友好，适合毕业、生日派对、儿童庆祝，也适合「想送一大束但预算有限」。',
        '与黄色、绿色配花能强化活力；若对方偏好极简高级，多头可能显得略满。',
      ],
      ['毕业', '生日', '庆典', '送同学'],
      '橙色',
      '活泼、花量大、庆祝',
      [
        { style: '毕业庆祝', flowers: ['黄天霸', '绿康'], note: '橙黄绿热闹' },
        { style: '桌花', flowers: ['白雪山', '尤加利叶'], note: '橙白对比' },
      ],
      '多头勿过度捆扎；枯谢小头及时剪掉可延长整体观赏。',
    ),
  },

  果汁泡泡: {
    names: {
      scientificName: "Rosa 'Juice Bubble'",
      commonNames: ['Juice Bubble', '果汁泡泡玫瑰'],
    },
    bloom: { vase: '约 7—10 天', vaseNote: '多头复古色，勤换水', vaseBySeason: SEASON_BLOOM },
    careVaseOverride: {
      summary: '果汁泡泡为多头发散状切花，分枝多需预留瓶口空间，勤换水可延长整体观赏期。',
      tips: ['多头发散，勿过度捆扎茎部', '枯谢小头及时剪除'],
    },
    atlas: {
      intro: ht("Rosa 'Juice Bubble'", 'group.spray_rose', {
        identity: { namingNote: '橙粉复古多头，日常与家居插瓶高频' },
        color: '橙粉或珊瑚色小头，复古而温暖，花量极大',
        bloomDiameterCm: '4 至 6',
      }),
      featureRefs: ['trait.multi_head', 'trait.spray_huge', 'trait.muted_retro'],
      distinguishFrom: [
        { name: '橙芭比', difference: '更偏纯橙明亮，而非橙粉复古' },
        { name: '狂欢泡泡', difference: '红黄复色更热闹' },
        { name: '果汁泡泡', difference: '橙粉复古、花量极大，日常家居插瓶常见' },
      ],
    },
    language: lang(
      '日常、小确幸与「一大把的温柔」',
      [
        '果汁泡泡像「把果汁的颜色装进一把玫瑰里」——适合日常家居、送室友同事、自我奖励，不必等节日。',
        '多头花量大，单束就有存在感；与洋甘菊、尤加利等同系配花，轻松而好看。',
      ],
      ['日常', '家居插瓶', '送同事', '自我奖励'],
      '橙粉',
      '复古、日常、花量大',
      [
        { style: '家居瓶插', flowers: ['洋甘菊', '尤加利叶'], note: '轻松日常' },
        { style: '同事礼', flowers: ['绿康'], note: '一小把也好看' },
      ],
      '多头需预留瓶口空间；勿过度捆扎茎部。',
    ),
  },

  狂欢泡泡: {
    names: {
      scientificName: "Rosa 'Carnival Bubble'",
      commonNames: ['Carnival Bubble', '狂欢泡泡玫瑰'],
    },
    bloom: { vase: '约 7—10 天', vaseNote: '多头复色，勤换水', vaseBySeason: SEASON_BLOOM },
    careVaseOverride: {
      summary: '狂欢泡泡为多头发散复色切花，分枝多需预留瓶口空间，勤换水可延长观赏期。',
      tips: ['多头发散，勿过度捆扎', '枯谢小头及时剪除'],
    },
    atlas: {
      intro: ht("Rosa 'Carnival Bubble'", 'group.spray_rose', {
        identity: { namingNote: '红黄复色多头，视觉热闹如嘉年华' },
        color: '小头呈红黄或橙红复色，整体色彩丰富',
        bloomDiameterCm: '4 至 6',
      }),
      featureRefs: ['trait.multi_head', 'trait.bicolor_stripe'],
      distinguishFrom: [
        { name: '果汁泡泡', difference: '橙粉复古单系，而非红黄复色' },
        { name: '闪耀', difference: '单头条纹，而非多头' },
        { name: '狂欢泡泡', difference: '红黄复色多头、热闹，派对与庆典常见' },
      ],
    },
    language: lang(
      '热闹、庆典与「派对氛围」',
      [
        '狂欢泡泡的名字很贴切——一束里很多复色小头，适合生日派对、开业花篮点缀、儿童庆祝等需要「热闹感」的场景。',
        '若对方偏好极简或单色高级风，可能略满；但用于氛围布置往往很出效果。',
      ],
      ['生日派对', '开业', '庆典', '儿童庆祝'],
      '红黄复色',
      '热闹、多头、派对感',
      [
        { style: '派对桌花', flowers: ['橙芭比', '满天星'], note: '暖色叠加' },
        { style: '开业点缀', flowers: ['金枝玉叶', '绿康'], note: '喜庆而不单调' },
      ],
      '多头色彩丰富，与极简风格可能不搭；按场景选用。',
    ),
  },

  迷雾泡泡: {
    names: {
      scientificName: "Rosa 'Misty Bubble'",
      commonNames: ['Misty Bubble', '迷雾泡泡玫瑰'],
    },
    bloom: { vase: '约 7—10 天', vaseNote: '低饱和灰紫，避强光', vaseBySeason: SEASON_BLOOM },
    careVaseOverride: {
      summary: '迷雾泡泡为低饱和灰紫多头玫瑰，避直射可减缓褪色，勤换水。',
      tips: ['低饱和色系避强光', '多头发散勿过度捆扎'],
    },
    atlas: {
      intro: ht("Rosa 'Misty Bubble'", 'group.spray_rose', {
        identity: { namingNote: '灰紫低饱和多头，莫兰迪风切花' },
        color: '灰紫或雾紫小头，低饱和而高级',
        bloomDiameterCm: '4 至 6',
      }),
      featureRefs: ['trait.multi_head', 'trait.morandi', 'trait.muted_retro'],
      distinguishFrom: [
        { name: '曼塔', difference: '单头灰紫，而非多头' },
        { name: '巧克力泡泡', difference: '偏棕红巧克力，而非灰紫' },
        { name: '迷雾泡泡', difference: '灰紫低饱和多头，莫兰迪风代表' },
      ],
    },
    language: lang(
      '朦胧、高级与「很上镜的灰紫」',
      [
        '迷雾泡泡的灰紫，是近几年社交媒体很喜欢的莫兰迪色——适合送审美在线的朋友、拍照、秋冬家居插瓶。',
        '与裸粉、咖啡色系花材混搭，整体非常「杂志感」。',
      ],
      ['送友人', '拍照', '家居插瓶', '秋冬花礼'],
      '灰紫',
      '莫兰迪、低饱和、高级',
      [
        { style: '莫兰迪混搭', flowers: ['流沙', '尤加利叶'], note: '裸粉灰紫同系' },
        { style: '多头瓶插', flowers: ['鼠尾草'], note: '少配叶突出色感' },
      ],
      '灰紫在强光下易偏浅；多头需预留瓶口。',
    ),
  },

  巧克力泡泡: {
    names: {
      scientificName: "Rosa 'Chocolate Bubble'",
      commonNames: ['Chocolate Bubble', '巧克力泡泡玫瑰'],
    },
    bloom: { vase: '约 7—10 天', vaseNote: '棕红多头复古，勤换水', vaseBySeason: SEASON_BLOOM },
    careVaseOverride: {
      summary: '巧克力泡泡为棕红多头切花，复古色系勤换水，避直射保持色泽。',
      tips: ['复古色避强光', '枯谢小头及时剪除'],
    },
    atlas: {
      intro: ht("Rosa 'Chocolate Bubble'", 'group.spray_rose', {
        identity: { namingNote: '棕红巧克力色多头，秋冬复古高频' },
        color: '棕红或深巧克力色小头，丝绒雾面感',
        bloomDiameterCm: '4 至 6',
      }),
      featureRefs: ['trait.multi_head', 'trait.chocolate_tone'],
      distinguishFrom: [
        { name: '卡布奇诺', difference: '单头咖啡棕，而非多头' },
        { name: '太妃糖', difference: '偏棕粉单头，而非多头巧克力' },
        { name: '巧克力泡泡', difference: '棕红多头、秋冬复古，花量感强' },
      ],
    },
    language: lang(
      '复古、秋冬与「一把巧克力色」',
      [
        '巧克力泡泡把「巧克力色」做成多头——适合秋冬生日、送喜欢复古风的朋友，或作为卡布奇诺的多头替代。',
        '与干花感配材、尤加利、芦苇搭配，季节氛围很强。',
      ],
      ['生日', '秋冬花礼', '送友人', '家居插瓶'],
      '棕红',
      '巧克力色、多头、复古',
      [
        { style: '秋冬复古', flowers: ['卡布奇诺', '芦苇'], note: '同色系季节感' },
        { style: '多头瓶插', flowers: ['尤加利叶'], note: '少配叶突出色块' },
      ],
      '复古色避强光；若对方只接受鲜艳色，可能觉得偏暗。',
    ),
  },

  猪小姐: {
    names: {
      scientificName: "Rosa 'Miss Piggy'",
      commonNames: ['Miss Piggy', '猪小姐玫瑰'],
    },
    bloom: { vase: '约 7—10 天', vaseNote: '渐变色，避直射', vaseBySeason: SEASON_BLOOM },
    careVaseOverride: {
      summary: '猪小姐为粉橙渐变玫瑰，渐变色对光照敏感，阴凉通风可稳定色泽。',
      tips: ['渐变色避直射', '勤换水保持花型'],
    },
    atlas: {
      intro: ht("Rosa 'Miss Piggy'", 'group.hybrid_tea', {
        identity: { namingNote: '粉橙渐变，名称来自活泼可爱的联想' },
        color: '外层粉橙、向内渐变，花型优美，开放后层次柔和',
      }),
      featureRefs: ['trait.gradient_warm', 'trait.soft_pink'],
      distinguishFrom: [
        { name: '朱丽叶', difference: '奥斯汀杯状杏橙，而非现代切花渐变' },
        { name: '蜜桃雪山', difference: '雪山高杯杏色，而非粉橙渐变' },
        { name: '猪小姐', difference: '粉橙渐变、花型优美，温柔系混搭高频' },
      ],
    },
    language: lang(
      '温柔、可爱与「软萌的高级感」',
      [
        '猪小姐的粉橙渐变，比戴安娜更活泼、比朱丽叶更现代——适合送女友、闺蜜、生日，也适合「想可爱一点但不幼稚」的花束。',
        '与白色、浅粉配花能强化温柔感；名称略俏皮，正式商务场合请斟酌。',
      ],
      ['生日', '送女友', '送闺蜜', '表白'],
      '粉橙',
      '渐变、温柔、可爱',
      [
        { style: '闺蜜生日', flowers: ['粉雪山', '洋桔梗'], note: '粉系层次' },
        { style: '表白', flowers: ['白雪山', '满天星'], note: '粉白温柔' },
      ],
      '名称略俏皮；极正式场合（如严肃商务悼念）请换更庄重品种。',
    ),
  },

  太妃糖: {
    names: { scientificName: "Rosa 'Toffee'", commonNames: ['Toffee', '太妃糖玫瑰'] },
    bloom: { vase: '约 7—10 天', vaseNote: '棕粉复古，勤换水', vaseBySeason: SEASON_BLOOM },
    careVaseOverride: {
      summary: '太妃糖为棕粉复古色玫瑰，勤换水、避直射可保持色泽与花型。',
      tips: ['复古色避强光', '丝绒感忌挤压'],
    },
    atlas: {
      intro: ht("Rosa 'Toffee'", 'group.hybrid_tea', {
        identity: { namingNote: '名称取自太妃糖棕粉色，复古独特' },
        color: '棕粉或焦糖色，低饱和，带轻微丝绒感',
      }),
      featureRefs: ['trait.muted_retro', 'trait.chocolate_tone'],
      distinguishFrom: [
        { name: '卡布奇诺', difference: '偏咖啡棕，而非棕粉焦糖' },
        { name: '流沙', difference: '裸粉更浅，而非棕粉' },
        { name: '太妃糖', difference: '棕粉焦糖、复古独特，秋冬混搭常见' },
      ],
    },
    language: lang(
      '复古、独特与「像糖果一样的温柔」',
      [
        '太妃糖的棕粉，像一颗太妃糖——适合送给喜欢复古、独立审美的人，或作为秋冬花束的主色。',
        '与卡布奇诺、朱丽叶等同系搭配，整体非常「咖啡店午后」。',
      ],
      ['生日', '秋冬花礼', '送友人', '混搭主花'],
      '棕粉',
      '复古、焦糖色、独特',
      [
        { style: '秋冬同系', flowers: ['卡布奇诺', '尤加利叶'], note: '咖啡棕粉层次' },
        { style: '独特单束', flowers: ['芦苇'], note: '突出焦糖色' },
      ],
      '棕粉在强光下易偏浅；若对方只接受鲜艳色，可能觉得不够亮。',
    ),
  },

  曼塔: {
    names: { scientificName: "Rosa 'Menta'", commonNames: ['Menta', '曼塔玫瑰'] },
    bloom: { vase: '约 7—10 天', vaseNote: '莫兰迪灰紫，避强光', vaseBySeason: SEASON_BLOOM },
    careVaseOverride: {
      summary: '曼塔为莫兰迪灰紫色玫瑰，低饱和色系避直射可减缓褪色。',
      tips: ['低饱和色系避强光', '勤换水保持雾面色感'],
    },
    atlas: {
      intro: ht("Rosa 'Menta'", 'group.hybrid_tea', {
        identity: { namingNote: 'Menta 意为薄荷，指其灰绿紫调的莫兰迪色' },
        color: '灰紫或灰绿调，低饱和，雾面质感',
      }),
      featureRefs: ['trait.morandi', 'trait.muted_retro'],
      distinguishFrom: [
        { name: '迷雾泡泡', difference: '多头灰紫，而非单头' },
        { name: '流沙', difference: '裸粉，而非灰紫' },
        { name: '曼塔', difference: '莫兰迪灰紫、单头高级，社交媒体高频' },
      ],
    },
    language: lang(
      '高级、克制与「不讨好的美」',
      [
        '曼塔的灰紫，是「不用很红很艳也能成立」的高级色——适合送审美成熟、喜欢极简与莫兰迪风的朋友。',
        '拍照、家居插瓶、秋冬生日都很合适；与裸粉、咖啡色系同搭非常和谐。',
      ],
      ['生日', '送友人', '拍照', '家居插瓶'],
      '灰紫',
      '莫兰迪、高级、克制',
      [
        { style: '莫兰迪单束', flowers: ['流沙', '鼠尾草'], note: '灰紫裸粉同系' },
        { style: '拍照', flowers: ['尤加利叶'], note: '少配叶突出色块' },
      ],
      '灰紫对光线敏感；若对方只接受传统红粉，可能觉得「不够喜庆」。',
    ),
  },

  流沙: {
    names: {
      scientificName: "Rosa 'Quicksand'",
      commonNames: ['Quicksand', '流沙玫瑰'],
    },
    bloom: { vase: '约 7—10 天', vaseNote: '裸粉低饱和，避强光', vaseBySeason: SEASON_BLOOM },
    careVaseOverride: {
      summary: '流沙为裸粉低饱和玫瑰，避直射可减缓褪色，勤换水可稳定观赏期。',
      tips: ['低饱和色系避强光', '勤换水'],
    },
    atlas: {
      intro: ht("Rosa 'Quicksand'", 'group.hybrid_tea', {
        identity: { namingNote: 'Quicksand 流沙，形容裸粉如细沙般柔和' },
        color: '裸粉或灰调粉，低饱和，开放后仍保持温柔',
      }),
      featureRefs: ['trait.nude_pink', 'trait.muted_retro'],
      distinguishFrom: [
        { name: '粉雪山', difference: '更偏清晰柔粉，而非裸粉灰调' },
        { name: '曼塔', difference: '灰紫，而非裸粉' },
        { name: '流沙', difference: '裸粉低饱和、温柔，婚礼与莫兰迪混搭高频' },
      ],
    },
    language: lang(
      '温柔、裸感与「很婚礼的粉」',
      [
        '流沙的裸粉，是婚礼与摄影里极常见的「高级粉」——比粉雪山更灰、更柔，适合韩式婚礼、求婚、送新娘。',
        '与曼塔、卡布奇诺等同系搭配，整体非常协调；单独一束也很有气质。',
      ],
      ['婚礼', '求婚', '送新娘', '拍照'],
      '裸粉',
      '低饱和、温柔、婚礼风',
      [
        { style: '韩式婚礼', flowers: ['曼塔', '白雪山'], note: '裸粉灰紫白' },
        { style: '求婚', flowers: ['尤加利叶', '喷泉草'], note: '裸粉绿柔' },
      ],
      '裸粉在强光下易偏白；运输挤压后渐变色可能不均。',
    ),
  },

  火灵鸟: {
    names: {
      scientificName: "Rosa 'Firebird'",
      commonNames: ['Firebird', '火灵鸟玫瑰'],
    },
    bloom: {
      vase: '约 7—10 天',
      vaseNote: '开放过程会变色，阴凉通风可稳定观赏',
      vaseBySeason: SEASON_BLOOM,
    },
    careVaseOverride: {
      summary: '火灵鸟开放过程中色调会变化，阴凉通风、勤换水可稳定观赏期。',
      tips: ['开放后期色调会变浅，属正常现象', '渐变色避直射'],
    },
    atlas: {
      intro: ht("Rosa 'Firebird'", 'group.hybrid_tea', {
        identity: { namingNote: '名称取自火鸟，寓意开放过程中如火焰般变幻的色调' },
        color: '初开偏橙红，开放后渐变为粉或浅橙，渐变明显',
      }),
      featureRefs: ['trait.color_shift', 'trait.gradient_warm'],
      distinguishFrom: [
        { name: '猪小姐', difference: '粉橙渐变稳定，而非开放明显变色' },
        { name: '橙芭比', difference: '多头橙色，而非单头变色' },
        { name: '火灵鸟', difference: '开放过程色调变幻，是「会变色」玫瑰代表' },
      ],
    },
    language: lang(
      '变幻、活力与「每一阶段都不一样」',
      [
        '火灵鸟适合送给喜欢观察、喜欢「养花开盲盒」的人——收到时与完全开放后，颜色可能差别很大，这是品种特性而非品质问题。',
        '生日、送创意朋友、家居插瓶都适合；若对方希望「收到即固定颜色」，请提前说明会变色。',
      ],
      ['生日', '送友人', '家居插瓶', '创意礼物'],
      '橙红渐变',
      '开放变色、活力、独特',
      [
        { style: '观察型瓶插', flowers: ['尤加利叶'], note: '单品种即可看变化' },
        { style: '活力混搭', flowers: ['橙芭比', '猪小姐'], note: '暖色同系' },
      ],
      '开放会变色——若收花人不知道，可能误以为「送错了」；赠送时可附一句说明。',
    ),
  },
}

module.exports = { ROSE_L2_CONTENT }
