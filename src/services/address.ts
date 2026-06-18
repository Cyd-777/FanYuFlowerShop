import { STORAGE_KEYS } from '@/utils/constants'
import { formatRegionText } from '@/utils/location'
import type { UserAddress, UserAddressForm } from '@/types/address'
import { createEmptyAddressForm } from '@/types/address'

function createAddressId() {
  return `addr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function normalizeStoredAddress(raw: Record<string, unknown>): UserAddress | null {
  if (!raw || typeof raw.id !== 'string') return null

  const province = typeof raw.province === 'string' ? raw.province : ''
  const city = typeof raw.city === 'string' ? raw.city : ''
  const district = typeof raw.district === 'string' ? raw.district : ''
  const detail = typeof raw.detail === 'string' ? raw.detail : ''

  return {
    id: raw.id,
    name: typeof raw.name === 'string' ? raw.name : '',
    phone: typeof raw.phone === 'string' ? raw.phone : '',
    province,
    city,
    district,
    detail,
    isDefault: !!raw.isDefault,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : 0,
    latitude: typeof raw.latitude === 'number' ? raw.latitude : undefined,
    longitude: typeof raw.longitude === 'number' ? raw.longitude : undefined,
    poiName: typeof raw.poiName === 'string' ? raw.poiName : undefined,
  }
}

function readAll(): UserAddress[] {
  const raw = wx.getStorageSync(STORAGE_KEYS.UserAddresses)
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => normalizeStoredAddress(item as Record<string, unknown>))
    .filter((item): item is UserAddress => !!item)
}

function writeAll(list: UserAddress[]) {
  wx.setStorageSync(STORAGE_KEYS.UserAddresses, list)
}

function normalizeDefault(list: UserAddress[], defaultId?: string) {
  if (!list.length) return list

  const targetId = defaultId || list.find((item) => item.isDefault)?.id || list[0].id
  return list.map((item) => ({
    ...item,
    isDefault: item.id === targetId,
  }))
}

export function formatAddressLine(address: Pick<UserAddress, 'province' | 'city' | 'district' | 'detail'>) {
  const region = formatRegionText(address.province, address.city, address.district)
  if (region && address.detail) return `${region}${address.detail}`
  return address.detail || region
}

export function listAddresses(): UserAddress[] {
  return readAll().sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1
    return b.updatedAt - a.updatedAt
  })
}

export function getAddress(id: string): UserAddress | null {
  return readAll().find((item) => item.id === id) || null
}

export function getDefaultAddress(): UserAddress | null {
  const list = listAddresses()
  return list.find((item) => item.isDefault) || list[0] || null
}

export function getCheckoutAddress(): UserAddress | null {
  const selectedId = wx.getStorageSync(STORAGE_KEYS.CheckoutSelectedAddressId)
  if (typeof selectedId === 'string' && selectedId) {
    const selected = getAddress(selectedId)
    if (selected) return selected
  }
  return getDefaultAddress()
}

export function setCheckoutAddress(id: string) {
  wx.setStorageSync(STORAGE_KEYS.CheckoutSelectedAddressId, id)
}

export function validateAddressForm(form: UserAddressForm): string | null {
  const name = form.name.trim()
  const phone = form.phone.trim()
  const detail = form.detail.trim()
  const region = formatRegionText(form.province, form.city, form.district)
  const hasMapPin = typeof form.latitude === 'number' && typeof form.longitude === 'number'

  if (!name) return '请填写收件人姓名'
  if (!/^1\d{10}$/.test(phone)) return '请填写有效的手机号'
  if (!region && !hasMapPin) return '请选择所在地区或在地图上选点'
  if (!detail) return '请填写街道、门牌号等详细地址'
  return null
}

export function saveAddress(form: UserAddressForm, id?: string): UserAddress {
  const error = validateAddressForm(form)
  if (error) throw new Error(error)

  const now = Date.now()
  const payload: UserAddress = {
    id: id || createAddressId(),
    name: form.name.trim(),
    phone: form.phone.trim(),
    province: form.province.trim(),
    city: form.city.trim(),
    district: form.district.trim(),
    detail: form.detail.trim(),
    isDefault: form.isDefault,
    updatedAt: now,
    latitude: form.latitude,
    longitude: form.longitude,
    poiName: form.poiName?.trim() || undefined,
  }

  const list = readAll()
  const index = list.findIndex((item) => item.id === payload.id)
  if (index >= 0) {
    list[index] = payload
  } else {
    list.push(payload)
  }

  const next = normalizeDefault(
    list,
    payload.isDefault ? payload.id : undefined,
  )
  writeAll(next)
  return next.find((item) => item.id === payload.id) || payload
}

export function removeAddress(id: string) {
  const list = readAll().filter((item) => item.id !== id)
  writeAll(normalizeDefault(list))

  const selectedId = wx.getStorageSync(STORAGE_KEYS.CheckoutSelectedAddressId)
  if (selectedId === id) {
    wx.removeStorageSync(STORAGE_KEYS.CheckoutSelectedAddressId)
  }
}

export function toAddressForm(address: UserAddress): UserAddressForm {
  return {
    name: address.name,
    phone: address.phone,
    province: address.province,
    city: address.city,
    district: address.district,
    detail: address.detail,
    isDefault: address.isDefault,
    latitude: address.latitude,
    longitude: address.longitude,
    poiName: address.poiName,
  }
}

export function createNewAddressForm(): UserAddressForm {
  return createEmptyAddressForm(true)
}
