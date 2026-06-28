const cloud = require('wx-server-sdk')
const { bumpCacheModule } = require('./common/cacheMeta')
const { resolveFileUrls } = require('./common/fileUrls')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()

const SHOP_KEY = 'default'

const OWNER_OPENIDS = [
  'oiDICxmmuGHJTKQzDsG9X32n2fAs',
]

const VALID_THEME_IDS = new Set([
  'default',
  'valentine',
  'qixi',
  'women_day',
  'mother_day',
  'christmas',
])

const DEFAULT_SHOP = {
  shopKey: SHOP_KEY,
  shopName: '梵宇花店',
  phone: '',
  openTime: '09:00',
  closeTime: '21:00',
  deliveryNote: '',
  decoration: {
    activeThemeId: 'default',
    themeConfigs: {},
  },
}

function normalizeThemeId(value) {
  const id = String(value || 'default').trim()
  return VALID_THEME_IDS.has(id) ? id : 'default'
}

function normalizeDiscountRule(raw, index) {
  const rate = Number(raw.rate)
  const goodsIds = Array.isArray(raw.goodsIds)
    ? raw.goodsIds.map((id) => String(id).trim()).filter(Boolean)
    : []

  return {
    id: String(raw.id || `discount_${index + 1}`).trim(),
    rate: rate > 0 && rate <= 1 ? rate : 1,
    goodsIds,
  }
}

function normalizeThemeConfig(raw) {
  if (!raw || typeof raw !== 'object') return {}

  const gradient = Array.isArray(raw.headerGradient) ? raw.headerGradient : []
  const next = {}

  if (raw.primaryColor) next.primaryColor = String(raw.primaryColor).trim()
  if (gradient.length >= 2) {
    next.headerGradient = [String(gradient[0]).trim(), String(gradient[1]).trim()]
  }
  if (raw.homeSubtitle != null) next.homeSubtitle = String(raw.homeSubtitle).trim()
  if (raw.promoTag != null) next.promoTag = String(raw.promoTag).trim()

  const bannerImages = Array.isArray(raw.bannerImages)
    ? raw.bannerImages.map((id) => String(id || '').trim()).filter(Boolean)
    : []
  if (bannerImages.length) {
    next.bannerImages = bannerImages
    next.bannerImage = bannerImages[0]
  } else if (raw.bannerImage != null) {
    const single = String(raw.bannerImage).trim()
    if (single) {
      next.bannerImage = single
      next.bannerImages = [single]
    }
  }

  if (Array.isArray(raw.discounts)) {
    next.discounts = raw.discounts
      .map((item, index) => normalizeDiscountRule(item, index))
      .filter((item) => item.goodsIds.length > 0 && item.rate < 1)
  }

  return next
}

function resolveThemeBannerIds(config) {
  if (!config || typeof config !== 'object') return []
  const fromList = Array.isArray(config.bannerImages)
    ? config.bannerImages.map((id) => String(id || '').trim()).filter(Boolean)
    : []
  if (fromList.length) return fromList
  const single = String(config.bannerImage || '').trim()
  return single ? [single] : []
}

async function resolveBannerUrls(bannerIds) {
  if (!bannerIds.length) return []
  const cloudIds = bannerIds.filter((id) => String(id).startsWith('cloud://'))
  const urlMap = cloudIds.length ? await resolveFileUrls(cloudIds) : {}
  return bannerIds
    .map((id) => {
      if (String(id).startsWith('cloud://')) return urlMap[id] || ''
      return String(id)
    })
    .filter(Boolean)
}

function pickThemeConfigs(rawConfigs, legacyDoc) {
  const source = rawConfigs && typeof rawConfigs === 'object' ? rawConfigs : {}
  const themeConfigs = {}

  VALID_THEME_IDS.forEach((themeId) => {
    if (source[themeId]) {
      const normalized = normalizeThemeConfig(source[themeId])
      if (Object.keys(normalized).length > 0) {
        themeConfigs[themeId] = normalized
      }
    }
  })

  const legacyBanner = String(legacyDoc.bannerImage || '').trim()
  const legacyThemeId = normalizeThemeId(legacyDoc.activeThemeId)
  if (legacyBanner && !themeConfigs[legacyThemeId]?.bannerImage) {
    themeConfigs[legacyThemeId] = {
      ...(themeConfigs[legacyThemeId] || {}),
      bannerImage: legacyBanner,
    }
  }

  return themeConfigs
}

function pickDecoration(doc) {
  const raw = doc.decoration && typeof doc.decoration === 'object' ? doc.decoration : {}
  return {
    activeThemeId: normalizeThemeId(raw.activeThemeId || doc.activeThemeId),
    themeConfigs: pickThemeConfigs(raw.themeConfigs, {
      activeThemeId: raw.activeThemeId || doc.activeThemeId,
      bannerImage: raw.bannerImage || doc.bannerImage,
    }),
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

async function isMerchant(openid) {
  if (OWNER_OPENIDS.includes(openid)) return true

  try {
    const { data } = await db.collection('merchants').where({ openid }).limit(1).get()
    return data.length > 0
  } catch (err) {
    if (isCollectionMissingError(err)) return false
    throw err
  }
}

function pickSettings(doc) {
  return {
    shopName: doc.shopName || DEFAULT_SHOP.shopName,
    phone: doc.phone || '',
    openTime: doc.openTime || DEFAULT_SHOP.openTime,
    closeTime: doc.closeTime || DEFAULT_SHOP.closeTime,
    deliveryNote: doc.deliveryNote || '',
    decoration: pickDecoration(doc),
  }
}

async function attachBannerUrls(settings) {
  const activeThemeId = settings.decoration.activeThemeId
  const bannerIds = resolveThemeBannerIds(
    settings.decoration.themeConfigs[activeThemeId],
  )
  if (bannerIds.length) {
    const urls = await resolveBannerUrls(bannerIds)
    settings.bannerImageUrls = urls
    settings.bannerImageUrl = urls[0] || ''
  }
  return settings
}

async function getOrCreateShopDoc() {
  await ensureCollection('shops')

  let data = []
  try {
    const res = await db.collection('shops').where({ shopKey: SHOP_KEY }).limit(1).get()
    data = res.data
  } catch (err) {
    if (!isCollectionMissingError(err)) throw err
    await ensureCollection('shops')
  }

  if (data.length > 0) {
    return data[0]
  }

  const addRes = await db.collection('shops').add({
    data: {
      ...DEFAULT_SHOP,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    },
  })

  return {
    _id: addRes._id,
    ...DEFAULT_SHOP,
  }
}

async function requireMerchant(operatorOpenid) {
  if (!operatorOpenid) {
    return { ok: false, errMsg: '无法获取操作者身份' }
  }
  const canManage = await isMerchant(operatorOpenid)
  if (!canManage) {
    return { ok: false, errMsg: '无权限修改店铺装潢' }
  }
  return { ok: true }
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const operatorOpenid = wxContext.OPENID
  const { action } = event

  if (action === 'get') {
    try {
      const doc = await getOrCreateShopDoc()
      const settings = await attachBannerUrls(pickSettings(doc))
      return {
        success: true,
        settings,
      }
    } catch (err) {
      return {
        success: false,
        errMsg: err.message || err.errMsg || '获取店铺设置失败',
      }
    }
  }

  if (action === 'update') {
    if (!operatorOpenid) {
      return { success: false, errMsg: '无法获取操作者身份' }
    }

    const canManage = await isMerchant(operatorOpenid)
    if (!canManage) {
      return { success: false, errMsg: '无权限修改店铺设置' }
    }

    const { settings } = event
    if (!settings || !settings.shopName || !String(settings.shopName).trim()) {
      return { success: false, errMsg: '店铺名称不能为空' }
    }

    try {
      const doc = await getOrCreateShopDoc()
      const next = {
        shopName: String(settings.shopName).trim(),
        phone: settings.phone || '',
        openTime: settings.openTime || DEFAULT_SHOP.openTime,
        closeTime: settings.closeTime || DEFAULT_SHOP.closeTime,
        deliveryNote: settings.deliveryNote || '',
        decoration: settings.decoration
          ? pickDecoration({ decoration: settings.decoration })
          : pickDecoration(doc),
        updatedAt: db.serverDate(),
        updatedBy: operatorOpenid,
      }

      await db.collection('shops').doc(doc._id).update({ data: next })
      await bumpCacheModule('shop')

      return {
        success: true,
        settings: pickSettings({ ...doc, ...next }),
      }
    } catch (err) {
      return {
        success: false,
        errMsg: err.message || err.errMsg || '保存店铺设置失败',
      }
    }
  }

  if (action === 'saveThemeConfig') {
    const auth = await requireMerchant(operatorOpenid)
    if (!auth.ok) return { success: false, errMsg: auth.errMsg }

    const themeId = normalizeThemeId(event.themeId)
    const config = normalizeThemeConfig(event.config || {})
    if (!Object.keys(config).length) {
      return { success: false, errMsg: '装潢配置不能为空' }
    }

    try {
      const doc = await getOrCreateShopDoc()
      const decoration = pickDecoration(doc)
      decoration.themeConfigs[themeId] = {
        ...(decoration.themeConfigs[themeId] || {}),
        ...config,
      }

      const next = {
        decoration,
        updatedAt: db.serverDate(),
        updatedBy: operatorOpenid,
      }

      await db.collection('shops').doc(doc._id).update({ data: next })
      await bumpCacheModule('shop')

      return {
        success: true,
        settings: await attachBannerUrls(pickSettings({ ...doc, ...next })),
      }
    } catch (err) {
      return {
        success: false,
        errMsg: err.message || err.errMsg || '保存主题装潢失败',
      }
    }
  }

  if (action === 'setActiveTheme') {
    const auth = await requireMerchant(operatorOpenid)
    if (!auth.ok) return { success: false, errMsg: auth.errMsg }

    const themeId = normalizeThemeId(event.themeId)

    try {
      const doc = await getOrCreateShopDoc()
      const decoration = pickDecoration(doc)
      decoration.activeThemeId = themeId

      const next = {
        decoration,
        updatedAt: db.serverDate(),
        updatedBy: operatorOpenid,
      }

      await db.collection('shops').doc(doc._id).update({ data: next })
      await bumpCacheModule('shop')

      return {
        success: true,
        settings: await attachBannerUrls(pickSettings({ ...doc, ...next })),
      }
    } catch (err) {
      return {
        success: false,
        errMsg: err.message || err.errMsg || '切换主题失败',
      }
    }
  }

  // 兼容旧客户端
  if (action === 'updateDecoration') {
    const auth = await requireMerchant(operatorOpenid)
    if (!auth.ok) return { success: false, errMsg: auth.errMsg }

    const { decoration } = event
    if (!decoration) {
      return { success: false, errMsg: '缺少装潢配置' }
    }

    try {
      const doc = await getOrCreateShopDoc()
      const current = pickDecoration(doc)
      const themeId = normalizeThemeId(decoration.activeThemeId || current.activeThemeId)
      const bannerImage = String(decoration.bannerImage || '').trim()

      if (bannerImage) {
        current.themeConfigs[themeId] = {
          ...(current.themeConfigs[themeId] || {}),
          bannerImage,
        }
      }
      current.activeThemeId = themeId

      const next = {
        decoration: current,
        updatedAt: db.serverDate(),
        updatedBy: operatorOpenid,
      }

      await db.collection('shops').doc(doc._id).update({ data: next })
      await bumpCacheModule('shop')

      return {
        success: true,
        settings: pickSettings({ ...doc, ...next }),
      }
    } catch (err) {
      return {
        success: false,
        errMsg: err.message || err.errMsg || '保存店铺装潢失败',
      }
    }
  }

  return { success: false, errMsg: '未知操作' }
}
