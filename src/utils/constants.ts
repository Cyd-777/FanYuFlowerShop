/** 用户角色枚举 */
export enum UserRole {
  Customer = 'customer',
  Merchant = 'merchant',
}

/** 云数据库集合名 */
export const CLOUD_COLLECTIONS = {
  Merchants: 'merchants',
  Goods: 'goods',
  Orders: 'orders',
  Customers: 'customers',
  Addresses: 'addresses',
  Favorites: 'favorites',
  PointsLog: 'points_log',
  Members: 'members',
} as const

/** 缓存 key */
export const STORAGE_KEYS = {
  Token: 'token',
  UserInfo: 'user_info',
  Role: 'user_role',
} as const
