/**
 * 缓存失效矩阵：业务事件 → cache_meta module 列表。
 * 与 src/data/cacheKeys.ts、src/types/cache.ts 对齐；改矩阵时同步文档。
 * 部署前 npm run sync:cloud
 */
const { bumpCacheModule, MODULES } = require('./cacheMeta')

/** 业务事件 → 需 bump 的 module（顺序无关） */
const INVALIDATION_MATRIX = {
  /** 商品 CRUD / 上下架 / 推荐位 — 分类 goodsCount 联动 */
  goodsCatalog: ['goods', 'categories'],
  /** 仅库存数字变化（出入库、下单扣减） */
  goodsStock: ['goods'],
  /** 百科词条变更 */
  wikiContent: ['wiki', 'categories'],
  /** 花卉库合并 / 品种归并 */
  flowerCatalog: ['flower', 'wiki', 'categories', 'goods'],
  /** 店铺装修 / 主题 */
  shopSettings: ['shop'],
  /** 消息收件箱 */
  notifyInbox: ['notify'],
  /** 仅分类树 */
  categoriesOnly: ['categories'],
}

async function bumpCacheModules(modules) {
  const list = [...new Set((modules || []).filter((m) => MODULES.includes(m)))]
  let last = null
  for (const module of list) {
    last = await bumpCacheModule(module)
  }
  return last
}

async function bumpCacheEvent(eventKey) {
  const modules = INVALIDATION_MATRIX[eventKey]
  if (!modules?.length) {
    console.warn('[cacheInvalidation] unknown event:', eventKey)
    return null
  }
  return bumpCacheModules(modules)
}

module.exports = {
  INVALIDATION_MATRIX,
  bumpCacheModules,
  bumpCacheEvent,
}
