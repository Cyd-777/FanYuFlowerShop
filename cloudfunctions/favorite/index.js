const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()
const _ = db.command

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

function pickGoods(doc) {
  return {
    _id: doc._id,
    name: doc.name || '',
    price: Number(doc.price) || 0,
    unit: doc.unit === '支' ? '支' : '束',
    stock: Number(doc.stock) || 0,
    description: doc.description || '',
    categoryId: doc.categoryId || '',
    categoryName: doc.categoryName || doc.category || '',
    coverImage: doc.coverImage || (doc.images && doc.images[0]) || '',
    images: Array.isArray(doc.images) ? doc.images : [],
    onSale: doc.onSale !== false,
    recommend: doc.recommend === true,
    sort: Number(doc.sort) || 0,
  }
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action } = event

  if (!openid) {
    return { success: false, errMsg: '请先登录' }
  }

  try {
    if (action === 'list') {
      await ensureCollection('favorites')
      const { data: favs } = await db.collection('favorites').where({ openid }).get()
      if (!favs.length) {
        return { success: true, list: [] }
      }

      favs.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return tb - ta
      })

      const goodsIds = [...new Set(favs.map((item) => item.goodsId).filter(Boolean))]
      const { data: goodsData } = await db.collection('goods').where({ _id: _.in(goodsIds) }).get()
      const goodsMap = new Map(goodsData.map((doc) => [doc._id, pickGoods(doc)]))

      const list = favs
        .map((fav) => goodsMap.get(fav.goodsId))
        .filter(Boolean)

      return { success: true, list }
    }

    if (action === 'check') {
      const { goodsId } = event
      if (!goodsId) {
        return { success: false, errMsg: '缺少商品 ID' }
      }

      await ensureCollection('favorites')
      const { data } = await db.collection('favorites').where({ openid, goodsId }).limit(1).get()
      return { success: true, favorited: data.length > 0 }
    }

    if (action === 'add') {
      const { goodsId } = event
      if (!goodsId) {
        return { success: false, errMsg: '缺少商品 ID' }
      }

      await ensureCollection('goods')
      await ensureCollection('favorites')

      try {
        await db.collection('goods').doc(goodsId).get()
      } catch {
        return { success: false, errMsg: '商品不存在' }
      }

      const { data: existing } = await db.collection('favorites').where({ openid, goodsId }).limit(1).get()
      if (!existing.length) {
        await db.collection('favorites').add({
          data: {
            openid,
            goodsId,
            createdAt: db.serverDate(),
          },
        })
      }

      return { success: true, favorited: true }
    }

    if (action === 'remove') {
      const { goodsId } = event
      if (!goodsId) {
        return { success: false, errMsg: '缺少商品 ID' }
      }

      await ensureCollection('favorites')
      await db.collection('favorites').where({ openid, goodsId }).remove()
      return { success: true, favorited: false }
    }

    return { success: false, errMsg: '未知操作' }
  } catch (err) {
    if (isCollectionMissingError(err)) {
      return { success: true, list: [], favorited: false }
    }
    return {
      success: false,
      errMsg: err.message || err.errMsg || '收藏服务异常',
    }
  }
}
