const cloud = require('wx-server-sdk')
const { bumpCacheModule } = require('./common/cacheMeta')
const {
  buildWikiAliasMapFromWikiDocs,
  canonicalizeWikiKindName,
  countGoodsForWikiCategory,
} = require('./common/wikiKindMatch')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const OWNER_OPENIDS = ['oiDICxmmuGHJTKQzDsG9X32n2fAs']

/** 花束场景标签（束） */
const DEFAULT_BOUQUET_SCENES = [
  { name: '求婚', icon: '💍', sort: 100, categoryType: 'bouquet' },
  { name: '生日', icon: '🎂', sort: 90, categoryType: 'bouquet' },
  { name: '探病', icon: '🏥', sort: 80, categoryType: 'bouquet' },
  { name: '开业', icon: '🎊', sort: 70, categoryType: 'bouquet' },
  { name: '致歉', icon: '🙏', sort: 60, categoryType: 'bouquet' },
  { name: '日常', icon: '🌻', sort: 50, categoryType: 'bouquet' },
]

/** 物料品类（件） */
const DEFAULT_MATERIAL_CATEGORIES = [
  { name: '贺卡', icon: '💌', sort: 100, categoryType: 'material' },
  { name: '包装纸', icon: '🎀', sort: 90, categoryType: 'material' },
  { name: '礼物袋', icon: '🛍️', sort: 80, categoryType: 'material' },
]

/** 旧版默认花材名（已迁移到百科衍生，不在侧边栏显示） */
const LEGACY_FLOWER_NAMES = new Set(['玫瑰', '向日葵', '百合', '康乃馨', '芍药', '菊花', '绣球', '郁金香', '马蹄莲', '非洲菊', '洋桔梗', '满天星', '勿忘我', '紫罗兰', '风信子', '蝴蝶兰', '洋牡丹', '混搭花束'])

function isCollectionMissingError(err) {
  const msg = [err.errMsg, err.message, String(err.errCode), String(err.code)].filter(Boolean).join(' ')
  return msg.includes('DATABASE_COLLECTION_NOT_EXIST') || msg.includes('collection not exists') || msg.includes('Db or Table not exist') || msg.includes('-502005') || msg.includes('50200')
}

async function ensureCollection(name) {
  try { await db.createCollection(name) }
  catch (err) {
    const msg = [err.errMsg, err.message].filter(Boolean).join(' ')
    const alreadyExists = msg.includes('already exist') || msg.includes('已存在') || msg.includes('ResourceExist') || msg.includes('Table exist')
    if (!alreadyExists && !msg.includes('createCollection is not a function')) throw err
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

const MALL_NAV_PARENT = {
  flower: 'nav:flower',
  bouquet: 'nav:bouquet',
  material: 'nav:material',
}

function defaultParentIdForType(categoryType) {
  if (categoryType === 'bouquet') return MALL_NAV_PARENT.bouquet
  if (categoryType === 'material') return MALL_NAV_PARENT.material
  return ''
}

/** 迁移版本：升版后下次请求会再跑一次 migrateAndSeedCategories */
const CATEGORY_MIGRATION_VERSION = 2

function isDocNotFoundError(err) {
  const msg = [err.errMsg, err.message, String(err.errCode), String(err.code)].filter(Boolean).join(' ')
  return msg.includes('document.get:fail') || msg.includes('does not exist') || msg.includes('-1 ')
}

async function getCategoryMigrationVersion() {
  try {
    await ensureCollection('app_meta')
    const { data } = await db.collection('app_meta').doc('category').get()
    return Number(data?.migrationVersion) || 0
  } catch (err) {
    if (isCollectionMissingError(err) || isDocNotFoundError(err)) return 0
    throw err
  }
}

async function setCategoryMigrationVersion(version) {
  await ensureCollection('app_meta')
  const payload = { migrationVersion: version, updatedAt: db.serverDate() }
  try {
    await db.collection('app_meta').doc('category').update({ data: payload })
  } catch (err) {
    if (isDocNotFoundError(err)) {
      await db.collection('app_meta').doc('category').set({ data: payload })
      return
    }
    throw err
  }
}

function pickCategory(doc) {
  const categoryType = ['bouquet', 'material'].includes(doc.categoryType) ? doc.categoryType : ''
  const customRole = ['flower', 'packaging', 'card'].includes(doc.customRole) ? doc.customRole : ''
  const navTier = doc.navTier === 'primary' ? 'primary' : 'secondary'
  let parentId = String(doc.parentId || '').trim()
  if (!parentId && navTier === 'secondary' && categoryType) {
    parentId = defaultParentIdForType(categoryType)
  }
  return {
    _id: doc._id,
    name: doc.name || '',
    icon: doc.icon || '🌷',
    sort: Number(doc.sort) || 0,
    categoryType,
    _source: 'custom',
    customRole,
    navTier,
    parentId,
  }
}

function normalizeCategoryInput(input, options = {}) {
  const name = String(input.name || '').trim()
  const icon = String(input.icon || '🌷').trim() || '🌷'
  const categoryType = ['bouquet', 'material'].includes(input.categoryType) ? input.categoryType : ''
  const customRole = categoryType === 'material' && ['packaging', 'card'].includes(input.customRole)
    ? input.customRole
    : ''
  if (!name) throw new Error('分类名称不能为空')
  let navTier = input.navTier === 'primary' ? 'primary' : 'secondary'
  let parentId = String(input.parentId || '').trim()
  if (navTier === 'primary') {
    parentId = ''
  } else if (!parentId && categoryType) {
    parentId = defaultParentIdForType(categoryType)
  }
  const payload = { name, icon, categoryType, customRole, navTier, parentId }
  if (options.sort != null) payload.sort = Number(options.sort) || 0
  return payload
}

async function getNextSortForNew() {
  const { data } = await db.collection('categories').get()
  if (!data.length) return 100
  const sorts = data.map((doc) => Number(doc.sort) || 0)
  return Math.min(...sorts) - 10
}

async function reorderCategories(orderedIds) {
  const ids = Array.isArray(orderedIds) ? orderedIds.map((id) => String(id || '').trim()).filter(Boolean) : []
  if (!ids.length) throw new Error('排序列表不能为空')
  const n = ids.length
  for (let i = 0; i < n; i += 1) {
    await db.collection('categories').doc(ids[i]).update({ data: { sort: (n - i) * 10, updatedAt: db.serverDate() } })
  }
}

/** 迁移旧分类数据 + 补全默认预设；有写库变更时才 bump 缓存 */
async function migrateAndSeedCategories() {
  let changed = false
  await ensureCollection('categories')
  const { data } = await db.collection('categories').get()

  const nameToDoc = new Map(data.map((d) => [d.name, d]))

  for (const doc of data) {
    if (LEGACY_FLOWER_NAMES.has(doc.name) && !doc.categoryType) {
      await db.collection('categories').doc(doc._id).remove()
      nameToDoc.delete(doc.name)
      changed = true
    }
  }

  for (const def of DEFAULT_BOUQUET_SCENES) {
    if (!nameToDoc.has(def.name)) {
      await db.collection('categories').add({
        data: {
          ...def,
          navTier: 'secondary',
          parentId: MALL_NAV_PARENT.bouquet,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate(),
        },
      })
      changed = true
    }
  }

  for (const def of DEFAULT_MATERIAL_CATEGORIES) {
    if (!nameToDoc.has(def.name)) {
      await db.collection('categories').add({
        data: {
          ...def,
          navTier: 'secondary',
          parentId: MALL_NAV_PARENT.material,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate(),
        },
      })
      changed = true
    }
  }

  if (changed) await bumpCacheModule('categories')
  return changed
}

/** 仅迁移版本落后时跑一次；日常 list 不再每次全量迁移 */
async function ensureCategoryMigrated() {
  const current = await getCategoryMigrationVersion()
  if (current >= CATEGORY_MIGRATION_VERSION) return

  await migrateAndSeedCategories()
  await setCategoryMigrationVersion(CATEGORY_MIGRATION_VERSION)
}

function buildGoodsCountMaps(goods) {
  const countById = new Map()
  const countByKindName = new Map()
  for (const g of goods) {
    const cid = String(g.categoryId || '').trim()
    if (cid) countById.set(cid, (countById.get(cid) || 0) + 1)
    const kindName = String(g.flowerKindName || '').trim()
    if (kindName) countByKindName.set(kindName, (countByKindName.get(kindName) || 0) + 1)
  }
  return { countById, countByKindName }
}

function resolveGoodsCount(cat, goods, aliasToCanonical) {
  if (cat._source === 'wiki') {
    return countGoodsForWikiCategory(cat, goods, aliasToCanonical)
  }
  return goods.filter((g) => String(g.categoryId || '').trim() === cat._id).length
}

/** 统计各分类下的商品数量；有商品才启用（C 端可见），无商品停用 */
async function attachGoodsCounts(categories) {
  try {
    await ensureCollection('goods')
    const [{ data: goods }, aliasToCanonical] = await Promise.all([
      db.collection('goods').get(),
      buildWikiAliasMapFromWikiDocs(db),
    ])
    return categories.map((cat) => {
      const goodsCount = resolveGoodsCount(cat, goods, aliasToCanonical)
      return {
        ...cat,
        goodsCount,
        enabled: goodsCount > 0,
      }
    })
  } catch {
    return categories.map((cat) => ({
      ...cat,
      goodsCount: 0,
      enabled: false,
    }))
  }
}

/** 从 flower_wiki 提取去重种类名作为衍生分类 */
async function fetchDerivedWikiCategories() {
  try { await ensureCollection('flower_wiki') } catch { return [] }
  try {
    const { data } = await db.collection('flower_wiki').get()
    if (!Array.isArray(data) || !data.length) return []
    const kindMap = new Map()
    for (const doc of data) {
      const name = String(doc.kindName || '').trim()
      if (!name || name === '混搭花束') continue
      if (!kindMap.has(name)) {
        kindMap.set(name, { name, icon: doc.icon || '🌷', sort: Number(doc.sort) || 0 })
      }
    }
    return Array.from(kindMap.values()).sort((a, b) => b.sort - a.sort).map((item, idx) => ({
      _id: `wiki:${item.name}`,
      name: item.name,
      icon: item.icon,
      sort: (kindMap.size - idx) * 10,
      enabled: true,
      categoryType: '',
      _source: 'wiki',
      customRole: '',
      navTier: 'secondary',
      parentId: MALL_NAV_PARENT.flower,
      goodsCount: 0,
    }))
  } catch { return [] }
}

async function listCategories(onlyEnabled = false) {
  await ensureCategoryMigrated()
  const { data } = await db.collection('categories').get()
  const customList = data.map(pickCategory).sort((a, b) => b.sort - a.sort)
  const derivedList = await fetchDerivedWikiCategories()
  const merged = [...derivedList, ...customList]
  const withCounts = await attachGoodsCounts(merged)
  return onlyEnabled ? withCounts.filter((item) => item.enabled) : withCounts
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
      return { success: false, errMsg: err.message || err.errMsg || '获取分类失败' }
    }
  }

  if (!operatorOpenid) return { success: false, errMsg: '无法获取操作者身份' }

  if (action === 'list') {
    const canManage = await isMerchant(operatorOpenid)
    if (!canManage) return { success: false, errMsg: '无权限查看分类' }
    try {
      const list = await listCategories(false)
      return { success: true, list }
    } catch (err) {
      return { success: false, errMsg: err.message || err.errMsg || '获取分类失败' }
    }
  }

  if (action === 'get') {
    const canManage = await isMerchant(operatorOpenid)
    if (!canManage) return { success: false, errMsg: '无权限查看分类' }
    const { id } = event
    if (!id) return { success: false, errMsg: '缺少分类 ID' }
    await ensureCategoryMigrated()
    const { data } = await db.collection('categories').doc(id).get()
    if (!data) return { success: false, errMsg: '分类不存在' }
    const cat = pickCategory(data)
    const [withCount] = await attachGoodsCounts([cat])
    return { success: true, category: withCount }
  }

  if (action === 'add' || action === 'update') {
    const canManage = await isMerchant(operatorOpenid)
    if (!canManage) return { success: false, errMsg: '无权限操作分类' }
    await ensureCategoryMigrated()
    try {
      const payload = normalizeCategoryInput(event.category || {})
      if (action === 'add' && !payload.categoryType) {
        throw new Error('请选择花束场景或物料品类')
      }
      if (action === 'add') {
        const sort = await getNextSortForNew()
        const addRes = await db.collection('categories').add({
          data: { ...payload, sort, createdAt: db.serverDate(), updatedAt: db.serverDate() },
        })
        const { data } = await db.collection('categories').doc(addRes._id).get()
        await bumpCacheModule('categories')
        const [withCount] = await attachGoodsCounts([pickCategory(data)])
        return { success: true, category: withCount }
      }
      const { id } = event
      if (!id) return { success: false, errMsg: '缺少分类 ID' }
      await db.collection('categories').doc(id).update({ data: { ...payload, updatedAt: db.serverDate() } })
      const { data } = await db.collection('categories').doc(id).get()
      await bumpCacheModule('categories')
      const [withCount] = await attachGoodsCounts([pickCategory(data)])
      return { success: true, category: withCount }
    } catch (err) {
      return { success: false, errMsg: err.message || err.errMsg || '保存分类失败' }
    }
  }

  if (action === 'reorderSort') {
    const canManage = await isMerchant(operatorOpenid)
    if (!canManage) return { success: false, errMsg: '无权限操作分类' }
    try {
      await ensureCategoryMigrated()
      await reorderCategories(event.orderedIds)
      await bumpCacheModule('categories')
      const list = await listCategories(false)
      return { success: true, list }
    } catch (err) {
      return { success: false, errMsg: err.message || err.errMsg || '排序保存失败' }
    }
  }

  if (action === 'setNavTier') {
    const canManage = await isMerchant(operatorOpenid)
    if (!canManage) return { success: false, errMsg: '无权限操作分类' }
    const id = String(event.id || '').trim()
    const navTier = event.navTier === 'primary' ? 'primary' : 'secondary'
    if (!id) return { success: false, errMsg: '缺少分类 ID' }
    if (id.startsWith('wiki:')) return { success: false, errMsg: '百科衍生分类不可调整层级' }

    await ensureCategoryMigrated()
    const { data: doc } = await db.collection('categories').doc(id).get()
    if (!doc) return { success: false, errMsg: '分类不存在' }

    const categoryType = ['bouquet', 'material'].includes(doc.categoryType) ? doc.categoryType : ''
    let parentId = String(event.parentId || doc.parentId || '').trim()
    if (navTier === 'primary') {
      parentId = ''
    } else if (!parentId && categoryType) {
      parentId = defaultParentIdForType(categoryType)
    }
    if (navTier === 'secondary' && !parentId) {
      return { success: false, errMsg: '降级为胶囊分类需指定所属一阶 tab' }
    }

    await db.collection('categories').doc(id).update({
      data: {
        navTier,
        parentId,
        updatedAt: db.serverDate(),
      },
    })
    const { data: updated } = await db.collection('categories').doc(id).get()
    await bumpCacheModule('categories')
    const [withCount] = await attachGoodsCounts([pickCategory(updated)])
    return { success: true, category: withCount }
  }

  if (action === 'remove') {
    const canManage = await isMerchant(operatorOpenid)
    if (!canManage) return { success: false, errMsg: '无权限删除分类' }
    const { id } = event
    if (!id) return { success: false, errMsg: '缺少分类 ID' }
    if (id.startsWith('wiki:')) return { success: false, errMsg: '百科衍生分类不可删除' }
    await ensureCollection('goods')
    const { data: goodsList } = await db.collection('goods').where({ categoryId: id }).limit(1).get()
    if (goodsList.length > 0) return { success: false, errMsg: '该分类下还有商品，无法删除' }
    await db.collection('categories').doc(id).remove()
    await bumpCacheModule('categories')
    return { success: true }
  }

  return { success: false, errMsg: '未知操作' }
}
