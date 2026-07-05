/**
 * 品种级智库正文（图鉴 / 花语例文；养护见 wikiRoseCare）
 */

const {
  pickAtlasSection,
  pickBloomSection,
  pickLanguageSection,
  careEnvironmentText,
} = require('./wikiCarePick')
const { isRoseKind, mergeRoseCareIntoArticle } = require('./wikiRoseCare')

function cloneObject(value) {
  if (!value || typeof value !== 'object') return {}
  return JSON.parse(JSON.stringify(value))
}

const WIKI_VARIETY_ARTICLES = {
  '玫瑰:弗洛伊德': {
    names: {
      scientificName: "Rosa 'Pink Floyd'",
      commonNames: ['Pink Floyd', '弗洛伊德玫瑰'],
    },
    bloom: {
      vase: '夏季约 7—10 天，冬季悉心照料可至 15 天',
      vaseNote: '花期长短直接取决于养护是否到位',
      vaseBySeason: [
        { season: '夏季', days: '约 7—10 天' },
        { season: '冬季', days: '约 10—15 天', note: '悉心照料下' },
      ],
    },
    atlas: {
      paragraphs: [
        "弗洛伊德玫瑰，学名 Rosa 'Pink Floyd'，是蔷薇科蔷薇属的典型代表，在园艺分类上归属于杂交茶香月季（Hybrid Tea Rose）。它由荷兰 Schreurs 公司在 2008 年前后推出，品种名致敬了英国传奇摇滚乐队平克·弗洛伊德，取其音乐中迷幻、深邃、充满张力的艺术气质。",
        '它的原产地为荷兰，目前全球主要产区集中在厄瓜多尔、哥伦比亚以及中国云南。在植物学特征上，弗洛伊德玫瑰拥有标志性的高杯卷心花型，花瓣数量约在 35 至 45 枚之间，完全绽放后花径可达 8 至 10 厘米。它最引人注目的是那纯正浓郁的玫红色调，花瓣表面覆盖着一层独特的丝绒光泽，质地极其厚重，边缘常带有自然的微卷波浪。茎干粗壮挺直，刺少而大，便于花艺处理；叶片为深绿色，革质有光泽。整体带有淡淡的清甜香气，不浓烈刺鼻。',
        '在日常购买中，它常被拿来与高盛和罗德斯混淆。高盛的红调偏暗，更接近暗红；罗德斯则为正红偏黑。弗洛伊德那种纯正、明亮、带有丝绒感的玫红色，是它最核心的辨识特征，也正因如此，它成为许多顶级花艺师在秀场上钟爱的花材。',
      ],
      features: ['高杯卷心', '丝绒玫红', '35—45 瓣', '花径 8—10 cm', '刺少', '淡清甜香'],
      origin: '育种荷兰；主产区厄瓜多尔、哥伦比亚、中国云南',
      cultivar: {
        horticulturalGroup: '杂交茶香月季 Hybrid Tea',
        breeder: '荷兰 Schreurs',
        introducedYear: '2008 年前后',
        namingNote: '品种名致敬平克·弗洛伊德乐队',
      },
      productionRegions: ['厄瓜多尔', '哥伦比亚', '中国云南'],
      distinguishFrom: [
        { name: '高盛', difference: '红调偏暗，更接近暗红' },
        { name: '罗德斯', difference: '正红偏黑' },
        {
          name: '弗洛伊德',
          difference: '纯正、明亮、带有丝绒感的玫红色，辨识度最高',
        },
      ],
    },
    language: {
      meaning: '你是我最深的爱恋；不容置疑的信仰与充满激情的魅力',
      paragraphs: [
        '它的玫红色，被认为是红色系中非常高级且纯正的存在。不同于正红的热烈直白，这种带着丝绒质感和复古腔调的玫红，传达出的是一种兼具激情浓度与灵魂深度的爱。它的美，如同它所纪念的音乐一样，不追求喧闹的表达，却丝丝入扣，令人沉迷且无法自拔。',
        '它非常适合用在表白或求婚的场合，以「你是我最坚定的选择」作为情感的宣言。在纪念日和情人节，它能营造出一种有别于传统红玫瑰的高级浪漫。将它送给具备独特魅力的女性友人或者长辈，也非常得体，寓意对方拥有历经时光沉淀后的高雅品味。即便是在道歉或寻求复合的时刻，它强势中包裹着的温柔，也能替人表达出那份重归于好的深切渴望。',
      ],
      occasions: ['表白', '求婚', '纪念日', '情人节', '道歉', '复合', '送长辈', '送友人'],
      colorMeanings: [
        {
          color: '玫红',
          meaning: '比正红更高级纯正；丝绒复古，激情与灵魂深度并存',
        },
      ],
      pairing: [
        {
          style: '极简对比',
          flowers: ['马蹄莲', '蝴蝶兰'],
          note: '利用色彩极简对比，最大程度凸显玫红色，干净而纯粹',
        },
        {
          style: '复古油画',
          flowers: ['尤加利叶', '喷泉草', '复古色洋牡丹'],
          note: '营造仿佛古典油画般的质感',
        },
        {
          style: '酷感冲击',
          flowers: ['黑种草', '商陆', '暗色海芋'],
          note: '适合个性鲜明的酷女孩，令人过目不忘',
        },
      ],
      caution:
        '送花前留意对方是否极度偏爱素雅或极简风格；若是，这份浓烈的美丽或许会显得有些过于张扬。',
    },
  },
}

function articleKey(kindName, varietyName) {
  return `${String(kindName || '').trim()}:${String(varietyName || '').trim()}`
}

function getVarietyArticle(kindName, varietyName) {
  const key = articleKey(kindName, varietyName)
  const article = WIKI_VARIETY_ARTICLES[key]
  if (!article) {
    if (isRoseKind(kindName) && String(varietyName || '').trim()) {
      return mergeRoseCareIntoArticle(null, varietyName)
    }
    return null
  }
  const cloned = cloneObject(article)
  if (isRoseKind(kindName)) {
    return mergeRoseCareIntoArticle(cloned, varietyName)
  }
  return cloned
}

/** 将品种正文合并进 wiki 草稿（品种正文优先于种类 profile，doc 字段在 pick 层再覆盖） */
function mergeVarietyArticleIntoDraft(draft, kindName, varietyName) {
  const article = getVarietyArticle(kindName, varietyName)
  if (!article || !draft) return draft

  if (article.names) {
    draft.names = { ...(draft.names || {}), ...cloneObject(article.names) }
  }
  if (article.bloom) {
    draft.bloom = pickBloomSection(article.bloom, draft.bloom)
  }
  if (article.atlas) {
    draft.atlas = pickAtlasSection(article.atlas, draft.atlas)
  }
  if (article.careVase) {
    draft.careVase = article.careVase
  }
  if (article.language) {
    draft.language = pickLanguageSection(article.language, draft.language)
  }
  return draft
}

module.exports = {
  WIKI_VARIETY_ARTICLES,
  getVarietyArticle,
  mergeVarietyArticleIntoDraft,
  careEnvironmentText,
}
