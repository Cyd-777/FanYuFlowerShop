# 人员管理模块 · API

> **模块入口**：`@/modules/staff`  
> **云函数**：`staff`  
> **分层**：强化  
> **封装状态**：✅ 首模块落地（2026-07-06）

---

## 职责与边界

| 做 | 不做 |
|----|------|
| 商家工作人员列表、身份（owner/staff） | 顾客账号体系（见 `@/modules/auth` 规划） |
| 邀请码 / 链接创建、预览、接受 | 微信分享卡片实测（产品暂停项） |
| 当前登录商家 `getSelf` | 订单、商品业务逻辑 |

---

## 前端公开 API

导入：

```ts
import {
  listStaff,
  getMerchantSelf,
  // ...
} from '@/modules/staff'
```

### 查询

| 函数 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `listStaff()` | — | `StaffMember[]` | 商家端工作人员列表；需已登录且为商家 |
| `getMerchantSelf()` | — | `MerchantSelf` | 当前登录人在商家侧的姓名/角色/头像 |

### 邀请

| 函数 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `createStaffInvite(name, role)` | 姓名、`StaffRole` | `StaffInviteCreated` | 店长创建邀请（含 6 位码 + token + 分享 path） |
| `previewStaffInvite(token)` | token | `StaffInvitePreview` | 链接预览 |
| `previewStaffInviteByCode(code)` | 6 位码 | `StaffInvitePreview` | 邀请码预览 |
| `acceptStaffInvite(token)` | token | `StaffInviteAcceptResult` | 接受邀请（链接） |
| `acceptStaffInviteByCode(code)` | 6 位码 | `StaffInviteAcceptResult` | 接受邀请（码） |

### 维护

| 函数 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `updateStaffRole(targetUserId, role)` | 用户 ID、角色 | `void` | 不可改 owner |
| `updateStaffName(targetUserId, name)` | 用户 ID、姓名 | `void` | |
| `removeStaff(targetUserId)` | 用户 ID | `void` | 不可移除 owner |

### 邀请码工具（纯函数，无网络）

| 函数 | 说明 |
|------|------|
| `normalizeStaffInviteCode(raw)` | 归一化为 6 位大写字母数字 |
| `isStaffInviteCode(value)` | 是否合法邀请码 |
| `buildPendingStaffInviteCode(code)` | 本地 pending 键 `code:XXXXXX` |
| `parsePendingStaffInvite(raw)` | 解析登录前暂存的邀请（code 或 token） |

常量：`PENDING_STAFF_INVITE_CODE_PREFIX = 'code:'`

---

## 公开类型

| 类型 | 字段摘要 |
|------|----------|
| `StaffMember` | `_id`, `userId`, `name`, `role`, `avatarUrl?`, … |
| `MerchantSelf` | `userId`, `name`, `nickName`, `avatarUrl`, `role`, `roleLabel` |
| `StaffInvitePreview` | `name`, `role`, `roleLabel`, `expiresAt`, `status`, `code?` |
| `StaffInviteCreated` | `token`, `code`, `expiresAt`, `sharePath`, `roleLabel` |
| `StaffInviteAcceptResult` | `role`, `roleLabel`, `name` |
| `StaffInviteStatus` | `'pending' \| 'used' \| 'expired' \| 'invalid'` |
| `PendingStaffInvite` | `{ type: 'code' \| 'token'; value: string }` |

`StaffRole` 来自 `@/utils/constants`（`owner` | `staff`），本模块 API 入参使用，不重复定义。

---

## 云函数 `staff` · action

统一响应：`{ success: boolean; errMsg?: string; ... }`

| action | 鉴权 | 入参 | 成功出参 |
|--------|------|------|----------|
| `list` | 商家 | — | `list: StaffMember[]` |
| `getSelf` | 商家 | — | `self: MerchantSelf` |
| `createInvite` | owner | `name`, `role` | `token`, `code`, `expiresAt`, `sharePath`, `roleLabel` |
| `previewInvite` | 登录用户 | `token` 或 `code` | `invite: StaffInvitePreview` |
| `acceptInvite` | 登录用户 | `token` 或 `code` | `role`, `roleLabel`, `name` |
| `updateRole` | owner | `targetUserId`, `role` | — |
| `updateName` | owner | `targetUserId`, `name` | — |
| `remove` | owner | `targetUserId` | — |

鉴权实现：`common/merchantGate.js`（与其它 B 端 CF 共用）。

---

## 依赖模块

| 依赖 | 用途 |
|------|------|
| `@/services/cloud` | 云函数调用基础设施（横切，待后续收入 `modules/core`） |

**不依赖**其它业务模块 API。

---

## 调用方清单

| 路径 | 使用的 API |
|------|------------|
| `pagesMerchant/staff/index.vue` | `listStaff`, `createStaffInvite`, … |
| `pagesMerchant/staff/detail.vue` | `listStaff`, `updateStaffName`, `updateStaffRole`, `removeStaff` |
| `pagesMerchant/dashboard/index.vue` | `getMerchantSelf` |
| `pages/invite/staff/index.vue` | `previewStaffInvite`, `acceptStaffInvite` |
| `pages/invite/join/index.vue` | 邀请码接受相关 |
| `pages/login/index.vue` | `parsePendingStaffInvite` |

---

## 目录结构

```text
src/modules/staff/
  api.ts      ← 其它模块只引这里（经 index  barrel）
  types.ts
  client.ts   ← 模块内私有实现
  index.ts
```

---

## 变更记录

| 日期 | 摘要 |
|------|------|
| 2026-07-06 | 从 `services/staff.ts` 拆出首模块；调用方改 `@/modules/staff`；`services/staff` 保留兼容 re-export |
