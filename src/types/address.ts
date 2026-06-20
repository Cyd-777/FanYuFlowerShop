export interface UserAddress {
  id: string
  name: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
  isDefault: boolean
  updatedAt: number
  latitude?: number
  longitude?: number
  poiName?: string
  /** 地址来源：微信地址导入 */
  source?: 'wechat'
}

export type UserAddressForm = Omit<UserAddress, 'id' | 'updatedAt'>

export function createEmptyAddressForm(isDefault = false): UserAddressForm {
  return {
    name: '',
    phone: '',
    province: '',
    city: '',
    district: '',
    detail: '',
    isDefault,
  }
}
