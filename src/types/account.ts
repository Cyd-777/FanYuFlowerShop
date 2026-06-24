export type AuthType = 'wechat_mp' | 'phone'

export interface UserAccount {
  userId: string
  nickName: string
  avatarUrl: string
  phone?: string
}

export interface UserAuthRecord {
  userId: string
  authType: AuthType
  identifier: string
}
