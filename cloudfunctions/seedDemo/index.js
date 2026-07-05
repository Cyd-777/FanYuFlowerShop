const cloud = require('wx-server-sdk')
const { bumpCacheModule } = require('./common/cacheMeta')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const OWNER_OPENIDS = ['oiDICxmmuGHJTKQzDsG9X32n2fAs']

const SEED_TAG = 'demo_v1'

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
  const { data } = await db.collection('merchants').where({ openid }).limit(1).get()
  return data.length > 0
}

async function findTypedCategory(name, categoryType) {
  const { data } = await db
    .collection('categories')
    .where({ name, categoryType })
    .limit(1)
    .get()
  return data[0] || null
}

async function ensureTypedCategory({ name, icon, sort, categoryType, customRole = '' }) {
  const existing = await findTypedCategory(name, categoryType)
  if (existing) {
    const patch = {
      icon,
      sort,
      categoryType,
      updatedAt: db.serverDate(),
    }
    if (categoryType === 'material' && customRole) {
      patch.customRole = customRole
    }
    await db.collection('categories').doc(existing._id).update({ data: patch })
    return existing._id
  }

  const res = await db.collection('categories').add({
    data: {
      name,
      icon,
      sort,
      enabled: true,
      categoryType,
      customRole: categoryType === 'material' ? customRole : '',
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    },
  })
  return res._id
}

function wikiCategoryId(kindName) {
  return `wiki:${kindName}`
}

async function upsertDemoGoods(doc) {
  const { data } = await db
    .collection('goods')
    .where({ seedTag: SEED_TAG, name: doc.name })
    .limit(1)
    .get()

  const payload = {
    ...doc,
    seedTag: SEED_TAG,
    coverImage: doc.coverImage || '',
    images: Array.isArray(doc.images) ? doc.images : [],
    onSale: true,
    updatedAt: db.serverDate(),
  }

  if (data.length) {
    await db.collection('goods').doc(data[0]._id).update({ data: payload })
    return { action: 'updated', name: doc.name }
  }

  await db.collection('goods').add({
    data: {
      ...payload,
      createdAt: db.serverDate(),
    },
  })
  return { action: 'created', name: doc.name }
}

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const bootstrap = event.bootstrap === true

  if (!bootstrap) {
    if (!openid || !(await isMerchant(openid))) {
      return { success: false, errMsg: '仅商家可写入演示商品' }
    }
  }

  await ensureCollection('categories')
  await ensureCollection('goods')

  const dailyBouquetId = await ensureTypedCategory({
    name: '日常',
    icon: '🌻',
    sort: 50,
    categoryType: 'bouquet',
  })
  const proposeBouquetId = await ensureTypedCategory({
    name: '求婚',
    icon: '💍',
    sort: 100,
    categoryType: 'bouquet',
  })
  const packagingId = await ensureTypedCategory({
    name: '包装定制',
    icon: '🎀',
    sort: 75,
    categoryType: 'material',
    customRole: 'packaging',
  })
  const cardId = await ensureTypedCategory({
    name: '贺卡商品',
    icon: '💌',
    sort: 65,
    categoryType: 'material',
    customRole: 'card',
  })

  const demoGoods = [
    {
      name: '红玫瑰 · 卡罗拉',
      price: 12,
      salesType: 'stem',
      unit: '支',
      stock: 50,
      description: '经典红色玫瑰，定制花束常用花材。',
      categoryId: wikiCategoryId('玫瑰'),
      categoryName: '玫瑰',
      flowerKindName: '玫瑰',
      sort: 100,
      recommend: true,
    },
    {
      name: '粉玫瑰 · 戴安娜',
      price: 10,
      salesType: 'stem',
      unit: '支',
      stock: 50,
      description: '温柔粉色调，适合告白与纪念日。',
      categoryId: wikiCategoryId('玫瑰'),
      categoryName: '玫瑰',
      flowerKindName: '玫瑰',
      sort: 99,
    },
    {
      name: '白玫瑰 · 骄傲',
      price: 11,
      salesType: 'stem',
      unit: '支',
      stock: 40,
      description: '纯净白色，简约高级。',
      categoryId: wikiCategoryId('玫瑰'),
      categoryName: '玫瑰',
      flowerKindName: '玫瑰',
      sort: 98,
    },
    {
      name: '香槟玫瑰',
      price: 13,
      salesType: 'stem',
      unit: '支',
      stock: 35,
      description: '香槟色系，优雅复古。',
      categoryId: wikiCategoryId('玫瑰'),
      categoryName: '玫瑰',
      flowerKindName: '玫瑰',
      sort: 97,
    },
    {
      name: '向日葵 · 明光',
      price: 8,
      salesType: 'stem',
      unit: '支',
      stock: 60,
      description: '明亮大朵向日葵，活力满满。',
      categoryId: wikiCategoryId('向日葵'),
      categoryName: '向日葵',
      flowerKindName: '向日葵',
      sort: 96,
      recommend: true,
    },
    {
      name: '小雏菊',
      price: 6,
      salesType: 'stem',
      unit: '支',
      stock: 80,
      description: '清新点缀花材，适合混搭。',
      categoryId: wikiCategoryId('菊花'),
      categoryName: '菊花',
      flowerKindName: '菊花',
      sort: 95,
    },
    {
      name: '满天星 · 白色',
      price: 5,
      salesType: 'stem',
      unit: '支',
      stock: 100,
      description: '轻盈填充花材，增加层次感。',
      categoryId: wikiCategoryId('满天星'),
      categoryName: '满天星',
      flowerKindName: '满天星',
      sort: 94,
    },
    {
      name: '百合 · 香水',
      price: 15,
      salesType: 'stem',
      unit: '支',
      stock: 30,
      description: '香气清雅，适合重要场合。',
      categoryId: wikiCategoryId('百合'),
      categoryName: '百合',
      flowerKindName: '百合',
      sort: 93,
    },
    {
      name: '康乃馨 · 粉色',
      price: 7,
      salesType: 'stem',
      unit: '支',
      stock: 45,
      description: '母亲节与日常祝福常用花材。',
      categoryId: wikiCategoryId('康乃馨'),
      categoryName: '康乃馨',
      flowerKindName: '康乃馨',
      sort: 92,
    },
    {
      name: '经典牛皮纸包装',
      price: 18,
      salesType: 'other',
      unit: '件',
      stock: 200,
      description: '自然风牛皮纸+麻绳，适合日常花束。',
      categoryId: packagingId,
      categoryName: '包装定制',
      sort: 80,
    },
    {
      name: '韩式雾面纸包装',
      price: 25,
      salesType: 'other',
      unit: '件',
      stock: 150,
      description: '雾面纸双层包装，温柔质感。',
      categoryId: packagingId,
      categoryName: '包装定制',
      sort: 79,
      recommend: true,
    },
    {
      name: '圆形花盒包装',
      price: 38,
      salesType: 'other',
      unit: '件',
      stock: 80,
      description: '礼盒式包装，适合赠礼场景。',
      categoryId: packagingId,
      categoryName: '包装定制',
      sort: 78,
    },
    {
      name: '简约素色贺卡',
      price: 5,
      salesType: 'other',
      unit: '件',
      stock: 300,
      description: '空白贺卡，可手写留言。',
      categoryId: cardId,
      categoryName: '贺卡商品',
      sort: 70,
    },
    {
      name: '烫金祝福贺卡',
      price: 12,
      salesType: 'other',
      unit: '件',
      stock: 200,
      description: '烫金工艺，节日祝福专用。',
      categoryId: cardId,
      categoryName: '贺卡商品',
      sort: 69,
    },
    {
      name: '春日混搭花束',
      price: 168,
      salesType: 'bouquet',
      unit: '束',
      stock: 20,
      description: '多色混搭，日常送花首选。',
      categoryId: dailyBouquetId,
      categoryName: '日常',
      sort: 60,
      recommend: true,
    },
    {
      name: '浪漫九枝玫瑰',
      price: 199,
      salesType: 'bouquet',
      unit: '束',
      stock: 15,
      description: '九枝红玫瑰经典款。',
      categoryId: proposeBouquetId,
      categoryName: '求婚',
      sort: 59,
    },
    {
      name: '阳光向日葵束',
      price: 128,
      salesType: 'bouquet',
      unit: '束',
      stock: 18,
      description: '三枝向日葵搭配绿叶，明亮温暖。',
      categoryId: dailyBouquetId,
      categoryName: '日常',
      sort: 58,
    },
  ]

  const results = []
  for (const item of demoGoods) {
    results.push(await upsertDemoGoods(item))
  }

  try {
    await bumpCacheModule('categories')
    await bumpCacheModule('goods')
  } catch (err) {
    console.warn('[seedDemo] cache bump failed:', err.message || err)
  }

  return {
    success: true,
    message: '演示商品已写入',
    count: results.length,
    results,
  }
}
