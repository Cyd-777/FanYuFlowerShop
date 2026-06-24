import { getCloud, getCloudCallConfig, parseCloudResult } from './cloud'
import { invalidateCacheModule, loadWithCache } from '@/utils/cache'
import type { LoadWithCacheResult } from '@/utils/cache/loadWithCache'
import type { Category, CategoryForm } from '@/types/category'

const PUBLIC_CATEGORIES_CACHE_KEY = 'categories:public'
const MERCHANT_CATEGORIES_CACHE_KEY = 'categories:merchant'

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
    enabled: form.enabled,
    customRole: form.customRole || '',
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
  invalidateCacheModule('categories')
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
  invalidateCacheModule('categories')
  return result.category
}

export async function removeCategory(id: string): Promise<void> {
  const result = await callCategory({ action: 'remove', id })
  if (!result.success) {
    throw new Error(result.errMsg || '删除分类失败')
  }
  invalidateCacheModule('categories')
}

export async function reorderMerchantCategories(orderedIds: string[]): Promise<Category[]> {
  const result = await callCategory({ action: 'reorderSort', orderedIds })
  if (result.success !== true) {
    throw new Error(result.errMsg || '排序保存失败')
  }
  invalidateCacheModule('categories')
  return Array.isArray(result.list) ? result.list : []
}

export function formatCategoryLabel(category: Pick<Category, 'icon' | 'name'>) {
  return `${category.icon} ${category.name}`
}
