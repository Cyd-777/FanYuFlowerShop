/**
 * 地址模块 · 公开 API
 */

export type { UserAddress, UserAddressForm } from '@/types/address'

export {
  addressFingerprint,
  createNewAddressForm,
  formatAddressLine,
  getAddress,
  getCheckoutAddress,
  getDefaultAddress,
  handleLocationError,
  hydrateAddressesFromCloud,
  importWechatAddressAndSave,
  listAddresses,
  removeAddress,
  saveAddress,
  setCheckoutAddress,
  syncAddressesToCloud,
  toAddressForm,
  toOrderAddressSnapshot,
  validateAddressForm,
  wechatAddressToForm,
} from './client'
