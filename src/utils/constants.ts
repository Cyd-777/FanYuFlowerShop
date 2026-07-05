/** 用户角色枚举 */
export enum UserRole {
  Customer = 'customer',
  Merchant = 'merchant',
}

/** 缓存 key */
export const STORAGE_KEYS = {
  UserId: 'user_id',
  UserInfo: 'user_info',
  Role: 'user_role',
  AccessEpoch: 'user_access_epoch',
  PendingStaffInvite: 'pending_staff_invite_token',
  ShopSettings: 'shop_settings',
  Cart: 'cart_items',
  UserAddresses: 'user_addresses',
  CheckoutSelectedAddressId: 'checkout_selected_address_id',
  SearchHistoryCustomerUnified: 'search_history_customer_unified',
  SearchHistoryWiki: 'search_history_wiki',
  SearchHistoryMerchantGoods: 'search_history_merchant_goods',
} as const

/** 默认店铺名称（未配置时使用） */
export const DEFAULT_SHOP_NAME = '梵宇花店'

/** 商家工作人员身份 */
export const STAFF_ROLES = {
  Owner: 'owner',
  Manager: 'manager',
  Staff: 'staff',
} as const

export type StaffRole = (typeof STAFF_ROLES)[keyof typeof STAFF_ROLES]

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  owner: '店长',
  manager: '管理员',
  staff: '员工',
}

/** 添加/修改时可选择的身份（不含店长） */
export const ASSIGNABLE_STAFF_ROLES: StaffRole[] = [
  STAFF_ROLES.Manager,
  STAFF_ROLES.Staff,
]

