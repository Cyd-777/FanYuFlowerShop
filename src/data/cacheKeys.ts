/** 与 services / docs/cache.md 对齐的缓存键（L0 / L1） */

export const CACHE_KEYS = {
  shopSettings: 'shop:settings',
  categoriesPublic: 'categories:public:v3',
  categoriesMerchant: 'categories:merchant:v3',
  /** v3：强制刷新无 coverImageUrl 的旧缓存 */
  goodsRecommend: 'goods:public:recommend:v3',
  goodsPublicAll: 'goods:public:all:v3',
  goodsMerchantAll: 'goods:merchant:all',
  wikiList: 'wiki:public:list:v2',
  wikiMerchantList: 'wiki:merchant:list:v2',
  flowerCatalog: 'flower:catalog:list',
} as const

export function goodsPublicDetailKey(id: string) {
  return `goods:public:detail:v3:${id}`
}

export function wikiPublicDetailKey(id: string) {
  return `wiki:public:detail:v4:${id}`
}

export function wikiPublicMatchKey(kindId = '', varietyId = '') {
  return `wiki:public:match:v3:${kindId || '_'}:${varietyId || '_'}`
}
