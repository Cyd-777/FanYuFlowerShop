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
