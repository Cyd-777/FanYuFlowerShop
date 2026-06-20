# 基础功能闭环 · 分步实施计划

> **状态：步骤 1～6 已完成**（2026-06，无微信支付）  
> **目标**：跑通三环——① B 端商品维护 → ② A 端浏览加购并生成订单 → ③ B 端接收、处理、完成订单。

环 1（商品维护）已基本完成，本计划从 **订单域** 开工，按依赖顺序分 6 步；每步有交付物与验收标准，可单独合并、部署、人工回归。

---

## 已拍板约定

| 项 | 决策 |
|----|------|
| 付款 | 本阶段不接入微信支付；订单创建即「待处理」，由商家线下收款 |
| 库存 | **创建订单时服务端扣减**；取消订单时回滚库存 |
| 完成方式 | **商家在订单详情点击「完成」**；暂不强制顾客「确认收货」 |
| 地址 | 继续用本地地址簿；写入订单**快照**（姓名、电话、地址文本） |
| 定制花束 | 与普通商品一样经购物车 → 确认页提交；行项目带 `customSummary` |

---

## 订单状态（最小状态机）

```text
pending（待处理）→ processing（处理中）→ completed（已完成）
        ↘ cancelled（已取消，可选，本阶段建议做）
```

| 状态 | 含义 | 谁可操作 |
|------|------|----------|
| `pending` | 刚创建，待商家接单 | 商家 → `processing` 或 `cancelled` |
| `processing` | 备货/配送中 | 商家 → `completed` 或 `cancelled` |
| `completed` | 已完结 | — |
| `cancelled` | 已取消，库存已回滚 | 商家（仅 `pending`/`processing`） |

---

## 数据模型（`orders` 集合）

```typescript
// 见 src/types/order.ts（步骤 1 创建）
interface Order {
  _id: string
  orderNo: string           // 可读编号，如 FY202606170001
  customerOpenid: string
  status: 'pending' | 'processing' | 'completed' | 'cancelled'
  items: OrderLineItem[]    // 提交时快照，不随商品改价变化
  totalAmount: number
  remark: string
  address: {
    name: string
    phone: string
    province?: string
    city?: string
    district?: string
    detail: string
    fullText: string        // 展示用一行地址
  }
  createdAt: number
  updatedAt: number
  completedAt?: number
}

interface OrderLineItem {
  lineKey: string
  kind: 'goods' | 'custom'
  goodsId: string
  name: string
  price: number
  unit: string
  count: number
  image: string
  customSummary?: string
}
```

---

## 步骤总览

| 步骤 | 名称 | 闭环 | 状态 |
|------|------|------|------|
| 1 | 类型与约定 | 准备 | ✅ |
| 2 | 云函数 `order.create` | 环 2 | ✅ |
| 3 | A 端确认页提交 | 环 2 | ✅ |
| 4 | A 端订单列表/详情 | 环 2 | ✅ |
| 5 | B 端接单 / 处理 / 完成 | 环 3 | ✅ |
| 6 | 工作台统计与联调 | 环 3 | ✅ |

---

## 步骤 1 · 类型与约定

**目标**：前后端对订单结构、状态枚举达成一致，后续步骤只填实现。

**任务**

- [ ] 新建 `src/types/order.ts`（`Order`、`OrderLineItem`、状态常量、展示文案 map）
- [ ] 新建 `src/services/order.ts` 骨架（仅类型与 action 名常量，函数体留空或 throw）
- [ ] 在本文件「数据模型」节与代码保持一致（改字段时同步改两处）

**验收**

- TypeScript 编译通过；无运行时依赖

**预估**：0.5 天

---

## 步骤 2 · 云函数 `order.create`

**目标**：服务端能创建一条合法订单并扣库存。

**任务**

- [ ] 新建 `cloudfunctions/order/`（`index.js`、`package.json`、`config.json`）
- [ ] `npm run sync:cloud` 同步 `common/cacheMeta.js`（若需 bump；订单可不 bump goods cache，扣库存后可选 bump `goods`）
- [ ] 实现 `create`：
  - 入参：`items[]`（与购物车行同形）、`address`、`remark`
  - 校验：登录 openid、items 非空、地址必填
  - 对每个 `kind=goods` 行：读 `goods` 文档，校验 `onSale`、`stock >= count`、用**当前服务端价格**写快照（防篡改）
  - 对 `kind=custom` 行：校验结构完整，价格以客户端传入为准（或服务端按子项重算，二选一，推荐重算）
  - 生成 `orderNo`、写 `orders` 集合
  - **事务或顺序扣减**各商品 `stock`（微信云数据库事务有限，可先逐条 update + 失败则标记订单 cancelled 并回滚，或 create 前预检再批量扣）
- [ ] 实现 `get`（按 `_id` + openid 或商家权限）— 为步骤 4/5 提前准备也可本步只做 create
- [ ] `initDb` 或首次调用时 `ensureCollection('orders')`
- [ ] 部署：`tcb fn deploy order -e <envId> --force --yes`

**验收**

- 开发者工具云函数测试：`create` 成功返回 `orderId`、`orderNo`
- 对应商品 `stock` 减少；下架或库存不足时返回明确错误
- 重复提交两次生成两条订单（无幂等要求本阶段）

**预估**：1～1.5 天

---

## 步骤 3 · A 端确认页真提交（环 2 打通一半）

**目标**：顾客从购物车结算 → 确认页 → 云端有订单。

**任务**

- [ ] 完善 `src/services/order.ts`：`createOrder(payload)` 调云函数
- [ ] `pagesCustomer/order/confirm.vue`：
  - `submitOrder`：校验地址、勾选行 → 调 `createOrder`
  - loading / 错误 toast（库存不足、已下架等透传云函数 message）
  - 成功：`cartStore.removeChecked()`（若无此方法则新增）
  - 成功：跳转 `pagesCustomer/order/detail?id=xxx`
- [ ] 定制花束预览页 `customize/preview.vue` 进确认页流程保持不变，确认页统一走 create

**验收**

- 购物车勾选 → 结算 → 选地址 → 提交 → 云库 `orders` 有记录
- 购物车中已下单行被清除
- 失败时购物车保留、可重试

**预估**：0.5～1 天

---

## 步骤 4 · A 端订单列表与详情（环 2 闭环）

**目标**：顾客能查看自己的历史订单与状态。

**任务**

- [ ] 云函数 `order.list`（顾客）：`where({ customerOpenid })`，按 `createdAt desc`，分页可先 limit 50
- [ ] 云函数 `order.get`：顾客仅能读自己的单
- [ ] `services/order.ts`：`listMyOrders`、`getOrder`
- [ ] `pagesCustomer/order/list.vue`：替换 mock，展示状态文案、金额、首图
- [ ] `pagesCustomer/order/detail.vue`：商品行、地址、备注、状态、订单号、时间
- [ ] 「我的」页入口已有则确认路由；无则保留现有入口

**验收**

- 提交订单后列表可见；详情与云库一致
- 换账号看不到他人订单

**预估**：1 天

---

## 步骤 5 · B 端接单 / 处理 / 完成（环 3 闭环）

**目标**：商家能看到所有订单并推进状态至完成。

**任务**

- [ ] 云函数 `order.list`（商家）：校验 `isMerchant(openid)`，可按 `status` 筛选
- [ ] 云函数 `order.updateStatus`：
  - 商家权限
  - 允许迁移：`pending→processing`、`processing→completed`、`pending|processing→cancelled`
  - `cancelled` 时回滚各 `goods` 行库存
  - `completed` 写 `completedAt`
- [ ] `pagesMerchant/order/list.vue`：Tab 与状态筛选、读云端
- [ ] `pagesMerchant/order/detail.vue`：展示完整信息 + 操作按钮（接单 / 完成 / 取消）
- [ ] 按钮文案与状态对应，非法状态不展示按钮

**验收**

- 商家账号：A 端下单后 B 端列表立即出现（可下拉刷新或 onShow 拉取）
- 待处理 → 处理中 → 已完成 全流程可走通
- 取消后 A 端看到已取消，商品库存恢复

**预估**：1～1.5 天

---

## 步骤 6 · 工作台统计与端到端联调

**目标**：三环串测通过，工作台有真实订单数。

**任务**

- [ ] 云函数 `order.stats`（或 list 聚合）：今日订单数、待处理数、今日成交额（`completed` 或全部 `totalAmount` 按产品定）
- [ ] `pagesMerchant/dashboard/index.vue`：替换占位数据
- [ ] 更新 `docs/order.md` 范围清单状态
- [ ] 执行下方 **端到端验收清单** 并记录在 Issue / PR

**验收**

- 完整走通一遍人工测试（见下）
- `npm run build:weapp` 通过；`order` 云函数已部署

**预估**：0.5 天

---

## 端到端验收清单（三环）

```text
【环 1】B 端
  □ 新建或编辑商品，设为上架、有库存
  □ A 端刷新后可见该商品（首页/商城/列表）

【环 2】A 端
  □ 详情加购 → 购物车勾选 → 结算
  □ 确认页选地址、填备注 → 提交成功
  □ 购物车对应行已清空
  □ 我的订单列表/详情正确

【环 3】B 端
  □ 商家订单列表出现新单，状态「待处理」
  □ 接单 → 处理中 → 完成
  □ A 端订单状态同步为已完成
  □ （可选）取消一单，库存回滚，A 端显示已取消

【环 1 联动】
  □ 下单后商品库存减少，A 端售罄/库存展示正确
```

---

## 步骤 7+ · 本阶段不做（后续单列）

| 能力 | 说明 |
|------|------|
| 微信支付 | 环 2 增强；状态可增加 `awaiting_payment` |
| 顾客确认收货 | 可在 `completed` 前加 `delivered` |
| 扫码核销 | `verify` 关联 `orderId` |
| 会员折扣 / 优惠券 | 不在三环定义内 |
| 批处理 / 批量入库 | 环 1 增强 |
| 地址云同步 | 本地地址够用可后置 |

---

## 建议执行顺序与合并策略

```text
PR-1  步骤 1 + 2     云函数 create + types（可云函数控制台先测）
PR-2  步骤 3         确认页提交（依赖 PR-1 部署）
PR-3  步骤 4         顾客订单页
PR-4  步骤 5         商家订单页 + updateStatus
PR-5  步骤 6         dashboard + 文档 + 全链路验收
```

每合并一步即可在真机验证该步验收项，不必等全部完成。

---

## 相关文档

- [order.md](./order.md) — 订单模块边界与页面清单
- [goods.md](./goods.md) — 环 1 商品模块（已完成）
- [features.md](./features.md) — 功能总览
