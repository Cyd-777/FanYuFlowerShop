import type { CacheModule } from '@/types/cache'
import { CACHE_KEYS } from '@/data/cacheKeys'

/**
 * 服务端 cache_meta module ↔ 客户端 storage key 对照。
 * 与 cloudfunctions/common/cacheInvalidation.js INVALIDATION_MATRIX 同步维护。
 */
export const CACHE_INVALIDATION_MATRIX: Record<
  string,
  { modules: CacheModule[]; clientKeys: string[]; note: string }
> = {
  goodsCatalog: {
    modules: ['goods', 'categories'],
    clientKeys: [
      CACHE_KEYS.goodsRecommend,
      CACHE_KEYS.goodsPublicAll,
      CACHE_KEYS.goodsMerchantAll,
      CACHE_KEYS.categoriesPublic,
      CACHE_KEYS.categoriesMerchant,
    ],
    note: '商品 CRUD / 上下架；分类 goodsCount 联动',
  },
  goodsStock: {
    modules: ['goods'],
    clientKeys: [CACHE_KEYS.goodsRecommend, CACHE_KEYS.goodsPublicAll, CACHE_KEYS.goodsMerchantAll],
    note: '仅库存数字变化（出入库、下单扣减）',
  },
  wikiContent: {
    modules: ['wiki', 'categories'],
    clientKeys: [CACHE_KEYS.wikiList, CACHE_KEYS.wikiMerchantList, CACHE_KEYS.categoriesPublic],
    note: '百科词条变更；wiki: 衍生分类',
  },
  flowerCatalog: {
    modules: ['flower', 'wiki', 'categories', 'goods'],
    clientKeys: [
      CACHE_KEYS.flowerCatalog,
      CACHE_KEYS.wikiList,
      CACHE_KEYS.categoriesPublic,
      CACHE_KEYS.goodsPublicAll,
    ],
    note: '花卉库合并 / 品种归并',
  },
  shopSettings: {
    modules: ['shop'],
    clientKeys: [CACHE_KEYS.shopSettings],
    note: '店铺装修 / 主题',
  },
  notifyInbox: {
    modules: ['notify'],
    clientKeys: [],
    note: '消息收件箱；客户端按 unreadCount 拉取，无 L0 键',
  },
  categoriesOnly: {
    modules: ['categories'],
    clientKeys: [CACHE_KEYS.categoriesPublic, CACHE_KEYS.categoriesMerchant],
    note: '仅分类树',
  },
}

export function clientKeysForCacheModules(modules: CacheModule[]): string[] {
  const keys = new Set<string>()
  for (const entry of Object.values(CACHE_INVALIDATION_MATRIX)) {
    if (entry.modules.some((m) => modules.includes(m))) {
      entry.clientKeys.forEach((k) => keys.add(k))
    }
  }
  return [...keys]
}
