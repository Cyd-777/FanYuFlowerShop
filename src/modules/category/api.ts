/**
 * 分类管理模块 · 公开 API
 * @see docs/分类管理模块-API.md
 */

export type { Category, CategoryForm } from '@/types/category'

export {
  createCategory,
  formatCategoryLabel,
  getMerchantCategory,
  listMerchantCategories,
  listMerchantCategoriesCached,
  listPublicCategories,
  listPublicCategoriesCached,
  removeCategory,
  reorderMerchantCategories,
  setCategoryNavTier,
  toCategoryPayload,
  updateCategory,
} from './client'
