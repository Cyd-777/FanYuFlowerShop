const cloud = require('wx-server-sdk')
const { bumpCacheModule } = require('./common/cacheMeta')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()

const OWNER_OPENIDS = [
  'oiDICxmmuGHJTKQzDsG9X32n2fAs',
]

/** 品类 + 品种种子：kind 为品类，varieties 为品种列表 */
const FLOWER_SEED = [
  {
    name: '玫瑰',
    icon: '🌹',
    sort: 100,
    defaultUnit: '支',
    description: '经典爱情花材，适合表白、纪念日与日常赠礼。',
    varieties: [
      { name: '红玫瑰', description: '色泽浓艳，象征热烈真挚的爱意。', sort: 100 },
      { name: '粉玫瑰', description: '温柔甜美，适合表达初恋与感谢。', sort: 95 },
      { name: '白玫瑰', description: '纯净素雅，寓意尊敬与纯粹的爱。', sort: 90 },
      { name: '香槟玫瑰', description: '低调优雅，适合告白与纪念日。', sort: 85 },
      { name: '卡罗拉', description: '花型饱满、耐开，花店常用经典红玫瑰品种。', sort: 80 },
      { name: '戴安娜', description: '粉色调玫瑰，花瓣层叠，适合温柔系花束。', sort: 75 },
      { name: '佛洛依德', description: '大花型玫红玫瑰，高级感强，适合精品花束。', sort: 70 },
      { name: '艾莎', description: '粉白镶边玫瑰，清新浪漫，适合少女风花束。', sort: 65 },
    ],
  },
  {
    name: '牡丹',
    icon: '🌺',
    sort: 95,
    defaultUnit: '支',
    description: '国色天香，花型雍容，适合高端礼盒与节庆赠礼。',
    varieties: [
      { name: '黄天霸', description: '金黄色重瓣牡丹，花王级别，大气华贵。', sort: 100 },
      { name: '洛阳红', description: '深红色传统牡丹，喜庆热烈，适合开业贺礼。', sort: 95 },
      { name: '魏紫', description: '淡紫色牡丹，典雅含蓄，适合长辈与雅集。', sort: 90 },
      { name: '赵粉', description: '粉色调牡丹，温婉柔美，适合春日主题花束。', sort: 85 },
      { name: '彤云', description: '红艳层叠，花量足，适合大型花艺作品。', sort: 80 },
    ],
  },
  {
    name: '百合',
    icon: '🤍',
    sort: 90,
    defaultUnit: '支',
    description: '香气清雅，寓意百年好合，适合婚礼与探望。',
    varieties: [
      { name: '白百合', description: '纯洁高雅，婚礼与探望常用。', sort: 100 },
      { name: '粉百合', description: '温柔浪漫，适合生日与纪念日。', sort: 95 },
      { name: '黄百合', description: '明亮温暖，寓意快乐与感激。', sort: 90 },
      { name: '香水百合', description: '香气浓郁，花型大，适合主花使用。', sort: 85 },
      { name: '西伯利亚百合', description: '白色单瓣百合，线条简洁，适合现代风花束。', sort: 80 },
    ],
  },
  {
    name: '康乃馨',
    icon: '💗',
    sort: 85,
    defaultUnit: '支',
    description: '母亲节、感恩与祝福的经典花材。',
    varieties: [
      { name: '红色康乃馨', description: '热烈感恩，适合母亲节与祝福。', sort: 100 },
      { name: '粉色康乃馨', description: '温馨甜美，适合送给母亲与长辈。', sort: 95 },
      { name: '白色康乃馨', description: '纯洁思念，适合悼念与怀念。', sort: 90 },
    ],
  },
  {
    name: '向日葵',
    icon: '🌻',
    sort: 80,
    defaultUnit: '支',
    description: '阳光积极，适合毕业、加油与日常治愈系花束。',
    varieties: [
      { name: '向日葵', description: '经典大花盘向日葵，明亮治愈。', sort: 100 },
      { name: '迷你向日葵', description: '小巧可爱，适合混搭与伴手花束。', sort: 90 },
    ],
  },
  {
    name: '郁金香',
    icon: '🌷',
    sort: 75,
    defaultUnit: '支',
    description: '线条优美，春日感强，适合精致小花束。',
    varieties: [
      { name: '红色郁金香', description: '热烈告白，适合情人节与纪念日。', sort: 100 },
      { name: '黄色郁金香', description: '明亮开朗，适合生日与朋友赠礼。', sort: 95 },
      { name: '粉色郁金香', description: '甜美浪漫，适合表白与约会。', sort: 90 },
      { name: '白色郁金香', description: '纯净简约，适合清新风格花束。', sort: 85 },
    ],
  },
  {
    name: '绣球',
    icon: '💠',
    sort: 70,
    defaultUnit: '支',
    description: '团状花型，适合韩式花束与婚礼布置。',
    varieties: [
      { name: '蓝色绣球', description: '清凉梦幻，适合夏日与婚礼主题。', sort: 100 },
      { name: '粉色绣球', description: '浪漫柔美，适合生日与家居插花。', sort: 95 },
      { name: '白色绣球', description: '纯净大气，适合婚礼与极简风花束。', sort: 90 },
    ],
  },
  {
    name: '洋桔梗',
    icon: '🪻',
    sort: 65,
    defaultUnit: '支',
    description: '轻盈灵动，百搭配花，也适合单品种小花束。',
    varieties: [
      { name: '白色洋桔梗', description: '清新百搭，适合混搭与新娘手捧。', sort: 100 },
      { name: '紫色洋桔梗', description: '浪漫优雅，适合法式花束。', sort: 95 },
      { name: '绿色洋桔梗', description: '自然清爽，适合森系与野趣花束。', sort: 90 },
    ],
  },
  {
    name: '满天星',
    icon: '✨',
    sort: 60,
    defaultUnit: '束',
    description: '轻盈点缀或整束售卖，适合干花与永生花。',
    varieties: [
      { name: '白色满天星', description: '经典满天星，适合配花与整束售卖。', sort: 100 },
      { name: '彩色满天星', description: '染色满天星，适合少女心与节日花束。', sort: 90 },
    ],
  },
  {
    name: '混搭花束',
    icon: '💐',
    sort: 55,
    defaultUnit: '束',
    description: '多品种组合花束，适合节日礼盒与日常爆款。',
    varieties: [
      { name: '春日混搭', description: '粉白系混搭，清新治愈，适合日常赠礼。', sort: 100 },
      { name: '生日花束', description: '明亮色彩混搭，适合生日庆祝。', sort: 95 },
      { name: '开业花束', description: '大气喜庆配色，适合开业贺礼。', sort: 90 },
    ],
  },
]

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

async function isMerchant(openid) {
  if (OWNER_OPENIDS.includes(openid)) return true

  try {
    const { data } = await db.collection('merchants').where({ openid }).limit(1).get()
    return data.length > 0
  } catch (err) {
    if (isCollectionMissingError(err)) return OWNER_OPENIDS.includes(openid)
    throw err
  }
}

function pickKind(doc) {
  return {
    _id: doc._id,
    name: doc.name || '',
    icon: doc.icon || '🌷',
    sort: Number(doc.sort) || 0,
    defaultUnit: doc.defaultUnit === '支' ? '支' : '束',
    description: doc.description || '',
    enabled: doc.enabled !== false,
  }
}

function pickVariety(doc) {
  return {
    _id: doc._id,
    kindId: doc.kindId || '',
    name: doc.name || '',
    aliases: Array.isArray(doc.aliases) ? doc.aliases : [],
    defaultUnit: doc.defaultUnit === '支' || doc.defaultUnit === '束' ? doc.defaultUnit : '',
    description: doc.description || '',
    sort: Number(doc.sort) || 0,
    enabled: doc.enabled !== false,
  }
}

async function ensureDefaultFlowerCatalog() {
  await ensureCollection('flower_kinds')
  await ensureCollection('flower_varieties')

  const { data: existingKinds } = await db.collection('flower_kinds').limit(1).get()
  if (existingKinds.length > 0) return

  for (const kindSeed of FLOWER_SEED) {
    const { varieties, ...kindData } = kindSeed
    const addKindRes = await db.collection('flower_kinds').add({
      data: {
        ...kindData,
        enabled: true,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })

    const kindId = addKindRes._id
    for (const varietySeed of varieties) {
      await db.collection('flower_varieties').add({
        data: {
          kindId,
          name: varietySeed.name,
          aliases: varietySeed.aliases || [],
          defaultUnit: varietySeed.defaultUnit || kindData.defaultUnit || '束',
          description: varietySeed.description || '',
          sort: Number(varietySeed.sort) || 0,
          enabled: true,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate(),
        },
      })
    }
  }

  await bumpCacheModule('flower')
}

async function listFlowerCatalog() {
  await ensureDefaultFlowerCatalog()

  const [{ data: kinds }, { data: varieties }] = await Promise.all([
    db.collection('flower_kinds').get(),
    db.collection('flower_varieties').get(),
  ])

  const kindList = kinds
    .map(pickKind)
    .filter((item) => item.enabled)
    .sort((a, b) => b.sort - a.sort)

  const varietyList = varieties
    .map(pickVariety)
    .filter((item) => item.enabled)
    .sort((a, b) => b.sort - a.sort)

  const tree = kindList.map((kind) => ({
    ...kind,
    varieties: varietyList.filter((item) => item.kindId === kind._id),
  }))

  return tree
}

function matchKeyword(text, keyword) {
  if (!keyword) return true
  return text.toLowerCase().includes(keyword)
}

async function searchFlowerCatalog(keyword = '') {
  const tree = await listFlowerCatalog()
  const text = String(keyword).trim().toLowerCase()
  if (!text) return tree

  return tree
    .map((kind) => {
      const kindMatched = matchKeyword(kind.name, text)
      const matchedVarieties = kind.varieties.filter(
        (item) =>
          matchKeyword(item.name, text) ||
          item.aliases.some((alias) => matchKeyword(alias, text)),
      )

      if (kindMatched) return kind
      if (matchedVarieties.length) {
        return { ...kind, varieties: matchedVarieties }
      }
      return null
    })
    .filter(Boolean)
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const operatorOpenid = wxContext.OPENID
  const { action } = event

  if (action === 'list') {
    const canManage = operatorOpenid ? await isMerchant(operatorOpenid) : false
    if (!canManage) {
      return { success: false, errMsg: '无权限查看花卉库' }
    }

    try {
      const list = await listFlowerCatalog()
      return { success: true, list }
    } catch (err) {
      return {
        success: false,
        errMsg: err.message || err.errMsg || '获取花卉库失败',
      }
    }
  }

  if (action === 'search') {
    const canManage = operatorOpenid ? await isMerchant(operatorOpenid) : false
    if (!canManage) {
      return { success: false, errMsg: '无权限搜索花卉库' }
    }

    try {
      const { keyword = '' } = event
      const list = await searchFlowerCatalog(keyword)
      return { success: true, list }
    } catch (err) {
      return {
        success: false,
        errMsg: err.message || err.errMsg || '搜索花卉库失败',
      }
    }
  }

  if (action === 'getVariety') {
    const canManage = operatorOpenid ? await isMerchant(operatorOpenid) : false
    if (!canManage) {
      return { success: false, errMsg: '无权限查看花卉详情' }
    }

    const { id } = event
    if (!id) {
      return { success: false, errMsg: '缺少品种 ID' }
    }

    try {
      await ensureDefaultFlowerCatalog()
      const { data: varietyDoc } = await db.collection('flower_varieties').doc(id).get()
      if (!varietyDoc) {
        return { success: false, errMsg: '品种不存在' }
      }

      const variety = pickVariety(varietyDoc)
      const { data: kindDoc } = await db.collection('flower_kinds').doc(variety.kindId).get()
      const kind = kindDoc ? pickKind(kindDoc) : null

      return {
        success: true,
        variety,
        kind,
        suggestion: buildGoodsSuggestion(kind, variety),
      }
    } catch (err) {
      return {
        success: false,
        errMsg: err.message || err.errMsg || '获取花卉详情失败',
      }
    }
  }

  return { success: false, errMsg: '未知操作' }
}

function buildGoodsSuggestion(kind, variety) {
  const unit = variety.defaultUnit || kind?.defaultUnit || '束'
  const description = [variety.description, kind?.description].filter(Boolean).join('\n')
  return {
    name: variety.name,
    unit,
    description,
    flowerKindId: kind?._id || variety.kindId || '',
    flowerKindName: kind?.name || '',
    flowerVarietyId: variety._id,
    flowerVarietyName: variety.name,
  }
}
