# 类 OA 通知模块 · API

> **模块入口**：`@/modules/notify`  
> **云函数**：`notify`（读收件箱 / 订阅配置）；业务写入经 `bizNotifyEmit`（order/goods hook，**非本模块公开 API**）  
> **分层**：附加  
> **封装状态**：✅ 迭代 1（2026-07-06）

---

## 职责与边界

| 做 | 不做 |
|----|------|
| App 内收件箱列表、未读数、已读 | 订单/库存**事件写入**（由云侧 `bizNotifyEmit` 反应层） |
| 微信订阅模板配置读取与接受记录 | 同事互发 `send`（已 deprecated，UI 已移除） |
| 登录/我的页调起 `requestSubscribeMessage` | 定时推送、日汇总（无云定时） |

---

## 前端公开 API

```ts
import {
  fetchNotifyUnreadCount,
  listBizNotifications,
  markBizNotificationsRead,
  recordBizNotifySubscribe,
  fetchBizNotifySubscribeConfig,
  invokeBizNotifySubscribe,
  prefetchSubscribeTmplIds,
  formatNotifyTime,
  notifyTypeLabel,
} from '@/modules/notify'
```

### 收件箱

| 函数 | 参数 | 返回 |
|------|------|------|
| `fetchNotifyUnreadCount()` | — | `{ unread, isMerchant }` |
| `listBizNotifications(limit?, category?)` | `category`: `'order' \| 'stock'` 可选 | `{ list, unread }` |
| `markBizNotificationsRead({ ids?, all? })` | — | 剩余未读数 |

### 订阅消息

| 函数 | 说明 |
|------|------|
| `fetchBizNotifySubscribeConfig()` | 云侧模板 ID 列表 |
| `recordBizNotifySubscribe(tmplIds)` | 用户接受后写 users/merchants |
| `prefetchSubscribeTmplIds()` | 启动预取（本地 config 优先） |
| `resolveSubscribeTmplIds()` | 同步解析可用模板 ID |
| `invokeBizNotifySubscribe(tmplIds?)` | **须在用户 tap 回调内同步调用** |
| `requestSubscribeOnLoginTap(tmplIds?)` | 同上，登录专用 |

### 展示工具

| 函数 | 说明 |
|------|------|
| `formatNotifyTime(raw)` | 通知时间格式化 |
| `notifyTypeLabel(item)` | 订单/库存/系统标签 |

### Deprecated

| 函数 | 说明 |
|------|------|
| `sendBizNotification` | 同事互发；保留云 action，新代码勿用 |
| `listNotifyRecipients` | 仅 `notify/send` 遗留页 |

---

## 公开类型

自 `@/modules/notify` 导出：`BizNotification`、`BizNotificationContext`、`NotifyListCategory`、`NotifyRecipient` 等。  
旧路径 `@/types/notification` 为兼容 re-export。

---

## 云函数 `notify` · action

| action | 鉴权 | 入参 | 出参 |
|--------|------|------|------|
| `unreadCount` | 登录 | — | `unread`, `isMerchant` |
| `list` | 登录 | `limit`, `category?` | `list`, `unread` |
| `markRead` | 登录 | `ids?`, `all?` | `unread` |
| `getSubscribeConfig` | — | — | `tmplIds` |
| `recordSubscribe` | 登录 | `tmplIds` | — |
| `listRecipients` | 商家 | — | `list` |
| `send` | 商家 | `NotifySendPayload` | `sent`（deprecated） |

---

## 依赖模块

| 依赖 | 用途 |
|------|------|
| `@/services/cloud` | 云调用（横切，待 `core` 收敛） |
| `@/config/subscribe` | 本地模板 ID 配置 |

---

## 调用方清单

| 路径 | API |
|------|-----|
| `stores/notification.ts` | `fetchNotifyUnreadCount` |
| `pagesCustomer/notify/list.vue` | `list`, `markRead`, 类型/格式化 |
| `pages/login/index.vue` | 订阅 + `recordBizNotifySubscribe` |
| `pages/mine/index.vue` | `invokeBizNotifySubscribe` |
| `services/userProfile.ts` | 资料保存后订阅 |
| `app.ts` | `prefetchSubscribeTmplIds` |

Tab 角标：`utils/notifyTabBadge.ts`（UI 适配层，非模块核心 API）。

---

## 目录结构

```text
src/modules/notify/
  api.ts
  types.ts
  client.ts      # notify 云函数
  subscribe.ts   # 微信订阅 UX
  index.ts
```

---

## 变更记录

| 日期 | 摘要 |
|------|------|
| 2026-07-06 | 迭代 1 封装；`services/notification`、`types/notification`、`utils/bizNotifySubscribe` 改兼容层 |
