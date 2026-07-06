const cloud = require('wx-server-sdk')
const { fetchAllDocs } = require('./common/db')
const { ensureDefaultFlowerCatalog, runFlowerCatalogMerge } = require('./common/ensureFlowerCatalog')
const { isMerchant } = require('./common/merchantGate')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()

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

async function listFlowerCatalog() {
  await ensureDefaultFlowerCatalog(db)

  const [kinds, varieties] = await Promise.all([
    fetchAllDocs(db, 'flower_kinds'),
    fetchAllDocs(db, 'flower_varieties'),
  ])

  const kindList = kinds
    .map(pickKind)
    .filter((item) => item.enabled)
    .sort((a, b) => b.sort - a.sort)

  const varietyList = varieties
    .map(pickVariety)
    .filter((item) => item.enabled)
    .sort((a, b) => b.sort - a.sort)

  return kindList.map((kind) => ({
    ...kind,
    varieties: varietyList.filter((item) => item.kindId === kind._id),
  }))
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
      await ensureDefaultFlowerCatalog(db)
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

  if (action === 'mergeCatalog') {
    const canManage = operatorOpenid ? await isMerchant(operatorOpenid) : false
    if (!canManage) {
      return { success: false, errMsg: '无权限执行品种归并' }
    }

    try {
      const stats = await runFlowerCatalogMerge(db)
      return { success: true, stats }
    } catch (err) {
      return {
        success: false,
        errMsg: err.message || err.errMsg || '品种归并失败',
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
