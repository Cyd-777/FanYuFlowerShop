const cloud = require('wx-server-sdk')
const { bumpCacheModule } = require('./common/cacheMeta')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()

const OWNER_OPENIDS = [
  'oiDICxmmuGHJTKQzDsG9X32n2fAs',
]

const DEFAULT_CATEGORIES = [
  { name: '混搭花束', icon: '💐', sort: 100, enabled: true },
  { name: '玫瑰', icon: '🌹', sort: 90, enabled: true },
  { name: '向日葵', icon: '🌻', sort: 80, enabled: true },
  { name: '礼盒', icon: '🎁', sort: 70, enabled: true },
  { name: '求婚', icon: '💍', sort: 60, enabled: true },
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

function pickCategory(doc) {
  const customRole = ['flower', 'packaging', 'card'].includes(doc.customRole)
    ? doc.customRole
    : ''
  return {
    _id: doc._id,
    name: doc.name || '',
    icon: doc.icon || '🌷',
    sort: Number(doc.sort) || 0,
    enabled: doc.enabled !== false,
    customRole,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

function normalizeCategoryInput(input, options = {}) {
  const name = String(input.name || '').trim()
  const icon = String(input.icon || '🌷').trim() || '🌷'
  const enabled = input.enabled !== false
  const customRole = ['flower', 'packaging', 'card'].includes(input.customRole)
    ? input.customRole
    : ''

  if (!name) {
    throw new Error('分类名称不能为空')
  }

  const payload = { name, icon, enabled, customRole }
  if (options.sort != null) {
    payload.sort = Number(options.sort) || 0
  }
  return payload
}

async function getNextSortForNew() {
  const { data } = await db.collection('categories').get()
  if (!data.length) return 100
  const sorts = data.map((doc) => Number(doc.sort) || 0)
  return Math.min(...sorts) - 10
}

async function reorderCategories(orderedIds) {
  const ids = Array.isArray(orderedIds)
    ? orderedIds.map((id) => String(id || '').trim()).filter(Boolean)
    : []
  if (!ids.length) {
    throw new Error('排序列表不能为空')
  }

  const n = ids.length
  for (let i = 0; i < n; i += 1) {
    await db.collection('categories').doc(ids[i]).update({
      data: {
        sort: (n - i) * 10,
        updatedAt: db.serverDate(),
      },
    })
  }
}

async function ensureDefaultCategories() {
  await ensureCollection('categories')

  const { data } = await db.collection('categories').limit(1).get()
  if (data.length > 0) return

  for (const item of DEFAULT_CATEGORIES) {
    await db.collection('categories').add({
      data: {
        ...item,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })
  }
}

async function listCategories(onlyEnabled = false) {
  await ensureDefaultCategories()

  const { data } = await db.collection('categories').get()
  return data
    .map(pickCategory)
    .filter((item) => (onlyEnabled ? item.enabled : true))
    .sort((a, b) => b.sort - a.sort)
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const operatorOpenid = wxContext.OPENID
  const { action } = event

  if (action === 'publicList') {
    try {
      const list = await listCategories(true)
      return { success: true, list }
    } catch (err) {
      return {
        success: false,
        errMsg: err.message || err.errMsg || '获取分类失败',
      }
    }
  }

  if (!operatorOpenid) {
    return { success: false, errMsg: '无法获取操作者身份' }
  }

  if (action === 'list') {
    const canManage = await isMerchant(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限查看分类' }
    }

    try {
      const list = await listCategories(false)
      return { success: true, list }
    } catch (err) {
      return {
        success: false,
        errMsg: err.message || err.errMsg || '获取分类失败',
      }
    }
  }

  if (action === 'get') {
    const canManage = await isMerchant(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限查看分类' }
    }

    const { id } = event
    if (!id) {
      return { success: false, errMsg: '缺少分类 ID' }
    }

    await ensureDefaultCategories()
    const { data } = await db.collection('categories').doc(id).get()
    if (!data) {
      return { success: false, errMsg: '分类不存在' }
    }

    return { success: true, category: pickCategory(data) }
  }

  if (action === 'add' || action === 'update') {
    const canManage = await isMerchant(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限操作分类' }
    }

    await ensureDefaultCategories()

    try {
      const payload = normalizeCategoryInput(event.category || {})

      if (action === 'add') {
        const sort = await getNextSortForNew()
        const addRes = await db.collection('categories').add({
          data: {
            ...payload,
            sort,
            createdAt: db.serverDate(),
            updatedAt: db.serverDate(),
          },
        })

        const { data } = await db.collection('categories').doc(addRes._id).get()
        await bumpCacheModule('categories')
        return { success: true, category: pickCategory(data) }
      }

      const { id } = event
      if (!id) {
        return { success: false, errMsg: '缺少分类 ID' }
      }

      await db.collection('categories').doc(id).update({
        data: {
          ...payload,
          updatedAt: db.serverDate(),
        },
      })

      const { data } = await db.collection('categories').doc(id).get()
      await bumpCacheModule('categories')
      return { success: true, category: pickCategory(data) }
    } catch (err) {
      return {
        success: false,
        errMsg: err.message || err.errMsg || '保存分类失败',
      }
    }
  }

  if (action === 'reorderSort') {
    const canManage = await isMerchant(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限操作分类' }
    }

    await ensureDefaultCategories()

    try {
      await reorderCategories(event.orderedIds)
      await bumpCacheModule('categories')
      const list = await listCategories(false)
      return { success: true, list }
    } catch (err) {
      return {
        success: false,
        errMsg: err.message || err.errMsg || '排序保存失败',
      }
    }
  }

  if (action === 'remove') {
    const canManage = await isMerchant(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限删除分类' }
    }

    const { id } = event
    if (!id) {
      return { success: false, errMsg: '缺少分类 ID' }
    }

    await ensureCollection('goods')
    const { data: goodsList } = await db.collection('goods').where({ categoryId: id }).limit(1).get()
    if (goodsList.length > 0) {
      return { success: false, errMsg: '该分类下还有商品，无法删除' }
    }

    await db.collection('categories').doc(id).remove()
    await bumpCacheModule('categories')
    return { success: true }
  }

  return { success: false, errMsg: '未知操作' }
}
