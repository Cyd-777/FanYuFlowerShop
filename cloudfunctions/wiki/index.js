const cloud = require('wx-server-sdk')
const { bumpCacheModule } = require('./common/cacheMeta')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()

const WIKI_TEMPLATES = {
  玫瑰: {
    atlas: {
      summary: '蔷薇科蔷薇属，花型经典、色彩丰富，是全球最受欢迎的花艺主花之一。',
      features: ['花瓣层叠', '香气清雅', '耐瓶插', '品种繁多'],
      bloomSeason: '4—11 月',
      origin: '温带地区，现代切花玫瑰多来自荷兰、厄瓜多尔、云南等产区',
    },
    careGuide: {
      summary: '喜光通风，瓶插需斜剪根并勤换水，避免阳光直射和空调风口。',
      light: '每日 4—6 小时散射光，避免暴晒',
      water: '瓶插每日换水，水深 1/3 花瓶；土培见干见湿',
      soil: '疏松透气、排水良好的微酸性基质',
      temperature: '15—25℃ 生长最佳，冬季注意防寒',
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
    atlas: {
      summary: '芍药科芍药属，被誉为“花中之王”，花大色艳、雍容华贵。',
      features: ['花型硕大', '色泽浓艳', '香气馥郁', '中国传统名花'],
      bloomSeason: '4—5 月',
      origin: '中国，洛阳、菏泽为著名牡丹产区',
    },
    careGuide: {
      summary: '喜凉爽气候，土培需排水良好，瓶插牡丹切花宜浅水养护。',
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
    atlas: {
      summary: '百合科百合属，花姿雅致、香气清幽，是婚礼与节庆常用花材。',
      features: ['花型优雅', '香气浓郁', '花期较长', '寓意美好'],
      bloomSeason: '6—9 月',
      origin: '亚洲、欧洲温带地区，云南等地广泛种植',
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
    atlas: {
      summary: '石竹科康乃馨属，花瓣边缘呈锯齿状，是母亲节最具代表性的花材。',
      features: ['耐瓶插', '色彩丰富', '花量充足', '寓意温馨'],
      bloomSeason: '全年（温室切花）',
      origin: '地中海沿岸，现广泛商业化种植',
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
    atlas: {
      summary: '菊科向日葵属，花盘硕大、色泽明亮，充满阳光气息。',
      features: ['花盘大', '色彩明快', '耐旱', '象征积极'],
      bloomSeason: '7—9 月',
      origin: '北美，现中国北方广泛种植',
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
}

function defaultWikiForKind(kind) {
  const template = WIKI_TEMPLATES[kind.name] || {}
  const baseAtlas = template.atlas || {
    summary: kind.description || `${kind.name}是常见鲜花品类，适合多种花艺搭配。`,
    features: ['观赏性强', '适合花艺搭配'],
    bloomSeason: '因品种而异',
    origin: '多地有栽培',
  }
  const baseCare = template.careGuide || {
    summary: '保持通风、清洁水质与适当光照，可延长观赏期。',
    light: '明亮散射光',
    water: '见干见湿，切花勤换水',
    soil: '疏松透气',
    temperature: '15—25℃',
    tips: ['避免暴晒', '定期换水', '修剪枯叶'],
  }
  const baseLanguage = template.language || {
    summary: `${kind.name}常被用于表达美好祝愿与情感。`,
    meaning: '美好、祝福与心意',
    occasions: ['日常赠礼', '节日祝福'],
    colorMeanings: [],
  }
  return { atlas: baseAtlas, careGuide: baseCare, language: baseLanguage }
}

function wikiForVariety(kind, variety) {
  const kindWiki = defaultWikiForKind(kind)
  const varietyDesc = variety.description || ''
  return {
    atlas: {
      ...kindWiki.atlas,
      summary: varietyDesc || kindWiki.atlas.summary,
    },
    careGuide: { ...kindWiki.careGuide },
    language: {
      ...kindWiki.language,
      summary: varietyDesc || kindWiki.language.summary,
      meaning: varietyDesc || kindWiki.language.meaning,
    },
  }
}

function isCollectionMissingError(err) {
  const msg = [err.errMsg, err.message, String(err.errCode), String(err.code)]
    .filter(Boolean)
    .join(' ')
  return (
    msg.includes('DATABASE_COLLECTION_NOT_EXIST') ||
    msg.includes('collection not exists') ||
    msg.includes('Db or Table not exist') ||
    msg.includes('-502005') ||
    msg.includes('50200')
  )
}

async function ensureCollection(name) {
  try {
    await db.createCollection(name)
  } catch (err) {
    const msg = [err.errMsg, err.message].filter(Boolean).join(' ')
    const alreadyExists =
      msg.includes('already exist') ||
      msg.includes('已存在') ||
      msg.includes('ResourceExist') ||
      msg.includes('Table exist')
    if (!alreadyExists && !msg.includes('createCollection is not a function')) {
      throw err
    }
  }
}

function pickWiki(doc) {
  return {
    _id: doc._id,
    kindId: doc.kindId || '',
    varietyId: doc.varietyId || '',
    kindName: doc.kindName || '',
    varietyName: doc.varietyName || '',
    icon: doc.icon || '🌷',
    coverImage: doc.coverImage || '',
    atlas: doc.atlas || {},
    careGuide: doc.careGuide || {},
    language: doc.language || {},
    enabled: doc.enabled !== false,
    sort: Number(doc.sort) || 0,
  }
}

function pickWikiListItem(doc) {
  const wiki = pickWiki(doc)
  return {
    _id: wiki._id,
    kindId: wiki.kindId,
    varietyId: wiki.varietyId,
    kindName: wiki.kindName,
    varietyName: wiki.varietyName,
    icon: wiki.icon,
    coverImage: wiki.coverImage,
    sort: wiki.sort,
    atlasPreview: wiki.atlas.summary || '',
    carePreview: wiki.careGuide.summary || '',
    languagePreview: wiki.language.summary || wiki.language.meaning || '',
  }
}

async function ensureFlowerCollections() {
  await ensureCollection('flower_kinds')
  await ensureCollection('flower_varieties')
}

async function ensureDefaultWiki() {
  await ensureCollection('flower_wiki')

  const { data: existing } = await db.collection('flower_wiki').limit(1).get()
  if (existing.length > 0) return

  await ensureFlowerCollections()
  const [{ data: kinds }, { data: varieties }] = await Promise.all([
    db.collection('flower_kinds').get(),
    db.collection('flower_varieties').get(),
  ])

  if (!kinds.length) return

  for (const kind of kinds) {
    const kindVarieties = varieties.filter((v) => v.kindId === kind._id)
    if (!kindVarieties.length) {
      const sections = defaultWikiForKind(kind)
      await db.collection('flower_wiki').add({
        data: {
          kindId: kind._id,
          varietyId: '',
          kindName: kind.name,
          varietyName: '',
          icon: kind.icon || '🌷',
          coverImage: '',
          ...sections,
          enabled: true,
          sort: Number(kind.sort) || 0,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate(),
        },
      })
      continue
    }

    for (const variety of kindVarieties) {
      const sections = wikiForVariety(kind, variety)
      await db.collection('flower_wiki').add({
        data: {
          kindId: kind._id,
          varietyId: variety._id,
          kindName: kind.name,
          varietyName: variety.name,
          icon: kind.icon || '🌷',
          coverImage: '',
          ...sections,
          enabled: true,
          sort: Number(variety.sort) || Number(kind.sort) || 0,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate(),
        },
      })
    }
  }

  await bumpCacheModule('wiki')
}

async function listWiki(keyword = '') {
  await ensureDefaultWiki()
  const { data } = await db.collection('flower_wiki').get()
  const text = String(keyword).trim().toLowerCase()

  return data
    .map(pickWikiListItem)
    .filter((item) => {
      if (!item) return false
      if (!text) return true
      const haystack = [item.kindName, item.varietyName, item.atlasPreview, item.carePreview, item.languagePreview]
        .join(' ')
        .toLowerCase()
      return haystack.includes(text)
    })
    .sort((a, b) => b.sort - a.sort)
}

async function getWikiById(id) {
  await ensureDefaultWiki()
  const { data } = await db.collection('flower_wiki').doc(id).get()
  if (!data || data.enabled === false) return null
  return pickWiki(data)
}

async function matchWiki(kindId = '', varietyId = '') {
  await ensureDefaultWiki()
  const kind = String(kindId).trim()
  const variety = String(varietyId).trim()
  if (!kind && !variety) return null

  const { data } = await db.collection('flower_wiki').get()
  const enabled = data.filter((doc) => doc.enabled !== false)

  if (variety) {
    const byVariety = enabled.find((doc) => doc.varietyId === variety)
    if (byVariety) return pickWiki(byVariety)
  }

  if (kind) {
    const byKindOnly = enabled.find((doc) => doc.kindId === kind && !doc.varietyId)
    if (byKindOnly) return pickWiki(byKindOnly)
    const byKindAny = enabled.find((doc) => doc.kindId === kind)
    if (byKindAny) return pickWiki(byKindAny)
  }

  return null
}

exports.main = async (event) => {
  const { action } = event

  try {
    if (action === 'publicList') {
      const { keyword = '' } = event
      const list = await listWiki(keyword)
      return { success: true, list }
    }

    if (action === 'publicGet') {
      const { id } = event
      if (!id) return { success: false, errMsg: '缺少智库 ID' }
      const wiki = await getWikiById(id)
      if (!wiki) return { success: false, errMsg: '智库内容不存在' }
      return { success: true, wiki }
    }

    if (action === 'publicMatch') {
      const { kindId = '', varietyId = '' } = event
      const wiki = await matchWiki(kindId, varietyId)
      return { success: true, wiki }
    }

    return { success: false, errMsg: '未知操作' }
  } catch (err) {
    return {
      success: false,
      errMsg: err.message || err.errMsg || '智库服务异常',
    }
  }
}
