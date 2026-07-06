import { getCloud, getCloudCallConfig, parseCloudResult } from '@/services/cloud'
import { invalidateCacheEvent, loadWithCache } from '@/utils/cache'
import type { LoadWithCacheResult } from '@/utils/cache/loadWithCache'
import type { Category, CategoryForm } from '@/types/category'

const PUBLIC_CATEGORIES_CACHE_KEY = 'categories:public:v3'
const MERCHANT_CATEGORIES_CACHE_KEY = 'categories:merchant:v3'

interface CategoryCloudResult {
  success: boolean
  errMsg?: string
  list?: Category[]
  category?: Category
}

async function callCategory<T = CategoryCloudResult>(data: Record<string, unknown>): Promise<T> {
  const cloud = getCloud()
  const config = getCloudCallConfig()

  const res = await cloud.callFunction({
    name: 'category',
    data,
    ...(config ? { config } : {}),
  })

  const result = parseCloudResult<T & CategoryCloudResult>(res.result)
  if (!result || typeof result !== 'object') {
    throw new Error('云函数返回格式异常')
  }

  return result as T
}

export async function listPublicCategories(): Promise<Category[]> {
  const result = await callCategory({ action: 'publicList' })
  if (result.success !== true) {
    throw new Error(result.errMsg || '获取分类失败')
  }
  return Array.isArray(result.list) ? result.list : []
}

export async function listPublicCategoriesCached(options?: {
  force?: boolean
  onUpdate?: (list: Category[]) => void
}): Promise<LoadWithCacheResult<Category[]>> {
  return loadWithCache({
    module: 'categories',
    cacheKey: PUBLIC_CATEGORIES_CACHE_KEY,
    fetcher: listPublicCategories,
    force: options?.force,
    onUpdate: options?.onUpdate,
  })
}

export async function listMerchantCategories(): Promise<Category[]> {
  const result = await callCategory({ action: 'list' })
  if (result.success !== true) {
    throw new Error(result.errMsg || '获取分类失败')
  }
  return Array.isArray(result.list) ? result.list : []
}

export async function listMerchantCategoriesCached(options?: {
  force?: boolean
  onUpdate?: (list: Category[]) => void
}): Promise<LoadWithCacheResult<Category[]>> {
  return loadWithCache({
    module: 'categories',
    cacheKey: MERCHANT_CATEGORIES_CACHE_KEY,
    fetcher: listMerchantCategories,
    force: options?.force,
    onUpdate: options?.onUpdate,
  })
}

export async function getMerchantCategory(id: string): Promise<Category> {
  const result = await callCategory({ action: 'get', id })
  if (!result.success || !result.category) {
    throw new Error(result.errMsg || '获取分类详情失败')
  }
  return result.category
}

export function toCategoryPayload(form: CategoryForm) {
  return {
    name: form.name.trim(),
    icon: form.icon.trim() || '🌷',
    categoryType: form.categoryType || '',
    customRole: form.customRole || '',
    navTier: form.navTier === 'primary' ? 'primary' : 'secondary',
    parentId: form.parentId || '',
  }
}

export async function createCategory(form: CategoryForm): Promise<Category> {
  const result = await callCategory({
    action: 'add',
    category: toCategoryPayload(form),
  })
  if (!result.success || !result.category) {
    throw new Error(result.errMsg || '创建分类失败')
  }
  invalidateCacheEvent('categoriesOnly')
  return result.category
}

export async function updateCategory(id: string, form: CategoryForm): Promise<Category> {
  const result = await callCategory({
    action: 'update',
    id,
    category: toCategoryPayload(form),
  })
  if (!result.success || !result.category) {
    throw new Error(result.errMsg || '更新分类失败')
  }
  invalidateCacheEvent('categoriesOnly')
  return result.category
}

export async function removeCategory(id: string): Promise<void> {
  const result = await callCategory({ action: 'remove', id })
  if (!result.success) {
    throw new Error(result.errMsg || '删除分类失败')
  }
  invalidateCacheEvent('categoriesOnly')
}

export async function reorderMerchantCategories(orderedIds: string[]): Promise<Category[]> {
  const result = await callCategory({ action: 'reorderSort', orderedIds })
  if (result.success !== true) {
    throw new Error(result.errMsg || '排序保存失败')
  }
  invalidateCacheEvent('categoriesOnly')
  return Array.isArray(result.list) ? result.list : []
}

export async function setCategoryNavTier(
  id: string,
  navTier: 'primary' | 'secondary',
  parentId = '',
): Promise<Category> {
  const result = await callCategory({
    action: 'setNavTier',
    id,
    navTier,
    parentId,
  })
  if (!result.success || !result.category) {
    throw new Error(result.errMsg || '调整分类层级失败')
  }
  invalidateCacheEvent('categoriesOnly')
  return result.category
}

export function formatCategoryLabel(category: Pick<Category, 'icon' | 'name'>) {
  return `${category.icon} ${category.name}`
}
