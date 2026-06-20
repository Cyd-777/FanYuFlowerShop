import { STORAGE_KEYS } from '@/utils/constants'
import { formatRegionText } from '@/utils/location'
import { chooseWechatAddress, handleLocationError } from '@/utils/location'
import type { WechatAddressResult } from '@/utils/location'
import { hasToken } from '@/services/auth'
import { getCloud, getCloudCallConfig, parseCloudResult } from '@/services/cloud'
import type { UserAddress, UserAddressForm } from '@/types/address'
import type { OrderAddressSnapshot } from '@/types/order'
import { createEmptyAddressForm } from '@/types/address'

function createAddressId() {
  return `addr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function addressFingerprint(
  address: Pick<UserAddress, 'phone' | 'province' | 'city' | 'district' | 'detail'>,
) {
  return [
    address.phone.trim(),
    address.province.trim(),
    address.city.trim(),
    address.district.trim(),
    address.detail.trim(),
  ].join('|')
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
    source: raw.source === 'wechat' ? 'wechat' : undefined,
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

function mergeAddressLists(local: UserAddress[], remote: UserAddress[]) {
  const map = new Map<string, UserAddress>()
  for (const item of remote) map.set(item.id, item)
  for (const item of local) {
    const existing = map.get(item.id)
    if (!existing || item.updatedAt >= existing.updatedAt) {
      map.set(item.id, item)
    }
  }
  return normalizeDefault(Array.from(map.values()))
}

interface AddressCloudResult {
  success: boolean
  errMsg?: string
  list?: UserAddress[]
}

async function callAddressCloud(data: Record<string, unknown>) {
  const res = await getCloud().callFunction({
    name: 'address',
    data,
    ...(getCloudCallConfig() ? { config: getCloudCallConfig() } : {}),
  })
  const result = parseCloudResult<AddressCloudResult>(res.result)
  if (!result.success) {
    throw new Error(result.errMsg || '地址云同步失败')
  }
  return result
}

async function pullAddressesFromCloud(): Promise<UserAddress[]> {
  const result = await callAddressCloud({ action: 'list' })
  return Array.isArray(result.list) ? result.list : []
}

export async function syncAddressesToCloud(list = readAll()) {
  if (!hasToken()) return
  await callAddressCloud({ action: 'replaceAll', list })
}

export async function hydrateAddressesFromCloud(): Promise<UserAddress[]> {
  const local = readAll()
  if (!hasToken()) return listAddresses()

  try {
    const remote = await pullAddressesFromCloud()
    const merged = mergeAddressLists(local, remote)
    writeAll(merged)

    const localJson = JSON.stringify(local)
    const mergedJson = JSON.stringify(merged)
    if (localJson !== mergedJson) {
      void syncAddressesToCloud(merged).catch((err) => {
        console.warn('[address] push merged list failed:', err)
      })
    }

    return listAddresses()
  } catch (err) {
    console.warn('[address] pull from cloud failed:', err)
    if (local.length) {
      void syncAddressesToCloud(local).catch((pushErr) => {
        console.warn('[address] push local list failed:', pushErr)
      })
    }
    return listAddresses()
  }
}

export function wechatAddressToForm(
  result: WechatAddressResult,
  options?: { isDefault?: boolean },
): UserAddressForm {
  return {
    name: result.name,
    phone: result.phone,
    province: result.province,
    city: result.city,
    district: result.district,
    detail: result.detail,
    isDefault: options?.isDefault ?? false,
    latitude: undefined,
    longitude: undefined,
    poiName: undefined,
    source: 'wechat',
  }
}

export async function importWechatAddressAndSave(): Promise<UserAddress> {
  const result = await chooseWechatAddress()
  const list = readAll()
  const fp = addressFingerprint(result)
  const existing = list.find((item) => addressFingerprint(item) === fp)
  const isFirst = list.length === 0

  const form = wechatAddressToForm(result, {
    isDefault: isFirst || !list.some((item) => item.isDefault),
  })

  const saved = saveAddress(form, existing?.id)
  try {
    await syncAddressesToCloud()
  } catch (err) {
    console.warn('[address] cloud sync after import failed:', err)
  }
  return saved
}

export function formatAddressLine(address: Pick<UserAddress, 'province' | 'city' | 'district' | 'detail'>) {
  const region = formatRegionText(address.province, address.city, address.district)
  if (region && address.detail) return `${region}${address.detail}`
  return address.detail || region
}

export function toOrderAddressSnapshot(address: UserAddress): OrderAddressSnapshot {
  const fullText = formatAddressLine(address)
  return {
    name: address.name,
    phone: address.phone,
    province: address.province,
    city: address.city,
    district: address.district,
    detail: address.detail,
    fullText,
  }
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

  if (!name) return '请填写收件人姓名'
  if (!/^1\d{10}$/.test(phone)) return '请填写有效的手机号'
  if (!region && !detail) return '地址信息不完整'
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
    source: form.source,
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

  void syncAddressesToCloud(next).catch((err) => {
    console.warn('[address] cloud sync after save failed:', err)
  })

  return next.find((item) => item.id === payload.id) || payload
}

export function removeAddress(id: string) {
  const list = readAll().filter((item) => item.id !== id)
  const next = normalizeDefault(list)
  writeAll(next)

  const selectedId = wx.getStorageSync(STORAGE_KEYS.CheckoutSelectedAddressId)
  if (selectedId === id) {
    wx.removeStorageSync(STORAGE_KEYS.CheckoutSelectedAddressId)
  }

  void syncAddressesToCloud(next).catch((err) => {
    console.warn('[address] cloud sync after remove failed:', err)
  })
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
    source: address.source,
  }
}

export function createNewAddressForm(): UserAddressForm {
  return createEmptyAddressForm(true)
}

export { handleLocationError }
