# 启动与授权模块 · API

> **模块入口**：`@/modules/auth`  
> **云函数**：`login`  
> **分层**：附加  
> **封装状态**：✅ 迭代 2（2026-07-06）

---

## 职责与边界

| 做 | 不做 |
|----|------|
| 微信 / 手机号登录与会话持久化 | 用户资料云端保存（见 `services/userProfile`） |
| 本地 token / 角色 / 资料缓存读写 | 商家 staff 权限明细（见 `@/modules/staff`） |
| `checkAccess` / `refreshSessionAccess` 权限版本校验 | 订阅消息（见 `@/modules/notify`） |
| 按角色跳转首页 / 商家台 | 协议勾选 / 资料浮层 **UI**（`LoginLegalSheet` / `LoginProfileSheet`，非本模块 API） |

---

## 前端公开 API

```ts
import {
  loginWithWechat,
  loginWithPhone,
  sendPhoneLoginCode,
  checkAccess,
  refreshSessionAccess,
  hasToken,
  getCachedRole,
  getCachedUserId,
  getCachedUserProfile,
  writeCachedUserProfile,
  logout,
  navigateToHome,
} from '@/modules/auth'
```

### 登录

| 函数 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `loginWithWechat()` | — | `AuthResult` | 微信 OpenID 登录 |
| `loginWithPhone(phone, code)` | 手机号、验证码 | `AuthResult` | 手机号登录 |
| `sendPhoneLoginCode(phone)` | 手机号 | `{ devCode? }` | 发送验证码（开发环境可返回 devCode） |
| `login()` | — | `AuthResult` | **deprecated**，等同 `loginWithWechat` |

### 会话与权限

| 函数 | 说明 |
|------|------|
| `checkAccess()` | 云端校验 `accessEpoch`；不覆盖本地已编辑资料 |
| `refreshSessionAccess({ forceExitMerchant? })` | App onShow 用；权限收回时可 toast + 退出商家页 |
| `hasToken()` | 本地是否有有效 `userId` |
| `getCachedRole()` | `UserRole` 或 `null` |
| `getCachedUserId()` | 当前 userId |
| `getCachedUserProfile()` | 本地资料缓存 |
| `writeCachedUserProfile(profile)` | 写本地资料缓存 |
| `getCachedAccessEpoch()` | 权限版本号 |
| `logout()` | 清除本地会话 |
| `navigateToHome(role)` | 按角色 `reLaunch` 首页或商家台 |
| `isMerchantRoute(route)` | 是否商家分包路由 |

### 公开类型

| 类型 | 说明 |
|------|------|
| `AuthResult` | `{ userId, role, accessEpoch, profile }` |
| `UserAccount` | 来自 `@/types/account`（profile 字段） |
| `UserRole` | 来自 `@/utils/constants` |

---

## 云函数 `login` · action

| action | 鉴权 | 入参 | 成功出参 |
|--------|------|------|----------|
| `loginWechat` | wxContext | — | `userId`, `isMerchant`, `accessEpoch`, `profile` |
| `loginPhone` | — | `phone`, `code` | 同上 |
| `sendSmsCode` | — | `phone` | `devCode?`（开发） |
| `checkAccess` | token | — | 同上（刷新 role / epoch） |

鉴权与 `accessEpoch` 维护见 `common/accessControl.js`、`common/merchantGate.js`。

---

## 依赖模块

| 依赖 | 用途 |
|------|------|
| `@/services/cloud` | 云调用（横切，待 `core` 收敛） |
| `@/types/account` | 用户资料类型 |
| `@/utils/constants` | `STORAGE_KEYS`、`UserRole` |

---

## 调用方清单

| 路径 | API |
|------|-----|
| `app.ts` | `hasToken`, `refreshSessionAccess` |
| `stores/user.ts` | 登录、缓存同步 |
| `stores/notification.ts` | `hasToken` |
| `pages/login/index.vue` | 登录、跳转 |
| `pages/mine/index.vue` | `hasToken` |
| `pages/invite/join.vue` / `staff/index.vue` | `checkAccess`, `hasToken` |
| `pagesCustomer/*` | `hasToken`, `logout` |
| `services/userProfile.ts` | 资料缓存 |
| `services/address.ts` | `hasToken` |

---

## 目录结构

```text
src/modules/auth/
  api.ts
  types.ts
  client.ts
  index.ts
```

---

## 变更记录

| 日期 | 摘要 |
|------|------|
| 2026-07-06 | 迭代 2 封装；`services/auth` 改兼容 re-export；调用方改 `@/modules/auth` |
