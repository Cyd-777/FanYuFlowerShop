/** 定制花束选品用途（商家在分类中配置） */
export type CategoryCustomRole = '' | 'flower' | 'packaging' | 'card'

export interface Category {
  _id: string
  name: string
  icon: string
  sort: number
  enabled: boolean
  /** 用于定制花束：花材 / 包装 / 贺卡 */
  customRole?: CategoryCustomRole
  createdAt?: string
  updatedAt?: string
}

export interface CategoryForm {
  name: string
  icon: string
  sort: string
  enabled: boolean
  customRole: CategoryCustomRole
}

export const CATEGORY_CUSTOM_ROLE_OPTIONS: Array<{
  value: CategoryCustomRole
  label: string
}> = [
  { value: '', label: '普通分类' },
  { value: 'flower', label: '定制花材' },
  { value: 'packaging', label: '定制包装' },
  { value: 'card', label: '定制贺卡' },
]
