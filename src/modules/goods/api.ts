/**
 * 商品模块 · 公开 API
 */

export type { Goods, GoodsForm, GoodsListFilter, GoodsQuery, GoodsBatchPatch } from '@/types/goods'
export type { PublicGoodsPageResult, StockInSubmitItem, StockOutSubmitItem } from '@/types/goods'

export {
  PUBLIC_GOODS_INDEX_PAGE_SIZE,
  PUBLIC_RECOMMEND_CACHE_KEY,
  MERCHANT_GOODS_LIST_CACHE_KEY,
  batchRemoveGoods,
  batchUpdateGoods,
  createGoods,
  fetchPublicGoodsIndexFull,
  getMerchantGoods,
  getPublicGoods,
  getPublicGoodsCached,
  listMerchantGoods,
  listMerchantGoodsCached,
  listPublicGoods,
  listPublicGoodsCached,
  listPublicGoodsPage,
  listPublicRecommendGoods,
  listPublicRecommendGoodsCached,
  parseGoodsStockField,
  removeGoods,
  searchPublicGoods,
  submitStockIn,
  submitStockOut,
  syncPublicGoodsListFromCloud,
  syncRecommendListFromCloud,
  toGoodsPayload,
  updateGoods,
  uploadGoodsImage,
  validateGoodsForPurchase,
} from './client'
