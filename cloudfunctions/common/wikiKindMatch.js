/**
 * 智库种类名 / 别名归一（云函数共用，npm run sync:cloud 同步到各函数 ./common/）
 * 与客户端 src/utils/wikiFlowerGoods.ts 语义一致
 */

/** 与 wikiKindProfiles.js names.commonNames 对齐 */
const WIKI_KIND_COMMON_NAMES = {
  玫瑰: ['玫瑰', '月季', '蔷薇', '现代月季'],
  牡丹: ['牡丹', '富贵花', '花王', '洛阳花'],
  百合: ['百合', '强翟', '山丹'],
  康乃馨: ['康乃馨', '香石竹', '麝香石竹'],
  向日葵: ['向日葵', '太阳花', '望日莲'],
  郁金香: ['郁金香', '草麝香', '洋荷花'],
  满天星: ['满天星', '丝石竹', '锥花丝石竹'],
  绣球: ['绣球', '八仙花', '紫阳花'],
  洋桔梗: ['洋桔梗', '土耳其桔梗', '丽莎草'],
  马蹄莲: ['马蹄莲', '水芋', '海芋百合'],
  芍药: ['芍药', '将离', '殿春'],
  菊花: ['菊花', '秋菊', '寿客', '非洲菊', '扶郎花', '乒乓菊'],
  勿忘我: ['勿忘我', '勿忘草', '星辰花'],
  紫罗兰: ['紫罗兰', '香堇菜', '草紫罗兰'],
  风信子: ['风信子', '洋水仙', '五色水仙'],
  蝴蝶兰: ['蝴蝶兰', '蝶兰', '台湾兰'],
  洋牡丹: ['洋牡丹', '花毛茛', '陆莲花'],
  雏菊: ['雏菊', '延命菊', '春菊', '小雏菊'],
  银莲花: ['银莲花', '西洋银莲花', 'Anemone'],
  翠珠: ['翠珠', 'Trachelium'],
  蕾丝花: ['蕾丝花', 'Orlaya', '白蕾丝'],
  配叶: ['配叶', '叶材', '尤加利', '龟背竹'],
  盆栽: ['盆栽', '蝴蝶兰', '富贵竹', '发财树'],
}

function buildWikiAliasToCanonical(extraAliasesByKind = {}) {
  const map = new Map()

  for (const [kindName, commonNames] of Object.entries(WIKI_KIND_COMMON_NAMES)) {
    const canonical = String(kindName || '').trim()
    if (!canonical) continue
    map.set(canonical, canonical)
    for (const name of commonNames) {
      const alias = String(name || '').trim()
      if (alias) map.set(alias, canonical)
    }
  }

  for (const [kindName, aliases] of Object.entries(extraAliasesByKind)) {
    const canonical = String(kindName || '').trim()
    if (!canonical) continue
    map.set(canonical, canonical)
    for (const alias of aliases || []) {
      const key = String(alias || '').trim()
      if (key) map.set(key, canonical)
    }
  }

  return map
}

function canonicalizeWikiKindName(raw, aliasToCanonical) {
  const name = String(raw || '').trim()
  if (!name) return ''
  return aliasToCanonical.get(name) || name
}

function wikiKindFromCategoryId(categoryId) {
  const id = String(categoryId || '').trim()
  if (!id.startsWith('wiki:')) return ''
  return id.slice(5).trim()
}

function goodsBelongsToWikiKind(goods, canonicalKind, aliasToCanonical) {
  const target = String(canonicalKind || '').trim()
  if (!target) return false

  const categoryId = String(goods.categoryId || '').trim()
  const flowerKindName = String(goods.flowerKindName || '').trim()

  if (categoryId === `wiki:${target}`) return true
  if (flowerKindName === target) return true

  const kindFromId = wikiKindFromCategoryId(categoryId)
  if (kindFromId && canonicalizeWikiKindName(kindFromId, aliasToCanonical) === target) {
    return true
  }
  if (flowerKindName && canonicalizeWikiKindName(flowerKindName, aliasToCanonical) === target) {
    return true
  }
  return false
}

function countGoodsForWikiCategory(cat, goods, aliasToCanonical) {
  if (!cat || cat._source !== 'wiki') return 0
  let count = 0
  for (const g of goods) {
    if (goodsBelongsToWikiKind(g, cat.name, aliasToCanonical)) count += 1
  }
  return count
}

async function buildWikiAliasMapFromWikiDocs(db) {
  const extra = {}
  try {
    const { data } = await db.collection('flower_wiki').get()
    if (Array.isArray(data)) {
      for (const doc of data) {
        const kindName = String(doc.kindName || '').trim()
        if (!kindName) continue
        const aliases = []
        if (Array.isArray(doc.aliases)) {
          for (const item of doc.aliases) {
            const alias = String(item || '').trim()
            if (alias) aliases.push(alias)
          }
        }
        if (Array.isArray(doc.names?.commonNames)) {
          for (const item of doc.names.commonNames) {
            const alias = String(item || '').trim()
            if (alias) aliases.push(alias)
          }
        }
        if (aliases.length) extra[kindName] = aliases
      }
    }
  } catch {
    /* 降级：仅用 profile 别名表 */
  }
  return buildWikiAliasToCanonical(extra)
}

module.exports = {
  WIKI_KIND_COMMON_NAMES,
  buildWikiAliasToCanonical,
  buildWikiAliasMapFromWikiDocs,
  canonicalizeWikiKindName,
  wikiKindFromCategoryId,
  goodsBelongsToWikiKind,
  countGoodsForWikiCategory,
}
