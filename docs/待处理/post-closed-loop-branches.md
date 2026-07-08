> 📂 **文档分类**：规划与进度（路线图） · **主索引**：[README.md](../README.md) · **整理规划**：[文档规划.md](./文档规划.md)

# 基础闭环之上的功能分支

> ⚠️ **已迁入** → [版本与发版模块.md](../版本与发版模块.md) `## 后续分支规划（闭环之上）`。本文保留对照。
>

> **来源**：[GitHub Issue #1](https://github.com/Cyd-777/FanYuFlowerShop/issues/1)  
> **前提**：三环基础闭环已跑通（见 [closed-loop-plan.md](./closed-loop-plan.md)）。  
> 本文档把 Issue 里**同一阶段 To-do 未纳入最小三环**、以及**问题清单 / 功能树**中的下一批工作，拆成可独立开发的 **Git 功能分支**。

---

## Issue #1 怎么划界

Issue 评论 **「To-do → 完成当前阶段的功能闭环」** 里有两层：

| 层 | 内容 | 状态 |
|----|------|------|
| **最小三环** | 商品维护 → A 端下单 → B 端接单/完成 | ✅ 已跑通 |
| **同段 To-do 但未做** | 会员折扣&优惠券、**商品递交方式**、**商品管理页批处理** | ❌ 即「闭环之上」第一批 |
| **问题清单** | UX / 策略 / 百科 / 分类等增强 | ❌ 第二批及以后 |
| **功能树其余体系** | 支付、配送 API、评价、客服、节日主题等 | ❌ 第三批（大模块） |

Issue 正文 **基础功能树** 仍大量 `[ ]`，与评论「填充版」进度不一致；**以评论 To-do + 问题清单为准**推进。

---

## 推荐 Git 分支（从 `feat/closed-loop` 分出）

当前本地闭环代码应先落在 **`feat/closed-loop`**，合并后再从该线（或 `main`）拉下列分支：

```text
main
 └── feat/closed-loop          ← 三环 + 订单 + 文档（当前工作）
      ├── feat/order-delivery   ← 分支 A
      ├── feat/goods-batch      ← 分支 B
      ├── feat/member           ← 分支 C
      ├── feat/coupon           ← 分支 D（依赖 C）
      └── feat/issue1-polish    ← 分支 E（问题清单小项，可再拆）
```

---

## 分支 A · `feat/order-delivery` — 商品递交方式

**Issue 依据**

- To-do 功能闭环：`商品递交方式`
- 功能树 · 履约体系：`配送策略`（商家自配、门店自提；第三方 API 后置）

**范围（建议 P0）**

- [ ] 确认页选择：**门店自提** / **商家配送（填地址）**
- [ ] 订单快照写入 `deliveryType`、`pickup` 或 `address`
- [ ] 商家订单详情展示递交方式
- [ ] 云函数 `order.create` / `orders` 字段扩展

**不做本分支**：第三方物流 API、物流跟踪。

**验收**：下单可选自提；选配送仍用现有地址；B 端可见方式。

---

## 分支 B · `feat/goods-batch` — 商品批处理 & 批量入库

**Issue 依据**

- To-do 功能闭环：`商品管理页批处理功能`
- 评论填充版：`批量入库`、`管理页批量修改`（上下架 / 推荐 / 公共字段 / 批量删除）

**范围（建议顺序）**

1. [ ] 列表 **多选 + 批量操作** UI
2. [ ] 云函数 `goods.batchUpdate` / `batchRemove`（或 `action: batch`）
3. [ ] **批量入库**：粘贴进货清单 → 解析 → 确认页 → `stock += delta`（填充版流程）

**不做**：平板表格维护（Issue 决策 C · 独立 Issue）。

**验收**：筛选结果多选批量下架；粘贴清单批量加库存。

---

## 分支 C · `feat/member` — 会员体系（不含券）

**Issue 依据**

- To-do：`会员折扣&优惠券`（本分支只做会员，券放 D）
- 功能树：`会员积分制`
- 问题清单：`会员功能做成卡片放在 me 页面`

**范围（建议 P0）**

- [ ] `member` 云函数 + 用户积分/等级读写在云端
- [ ] `pagesCustomer/member/*` 接真实数据（替换写死积分）
- [ ] **我的** Tab：会员卡片入口（问题清单）
- [ ] 签到 / 积分明细 / 等级说明读云端

**不做本分支**：下单抵扣、发券。

---

## 分支 D · `feat/coupon` — 优惠券 & 下单抵扣

**Issue 依据**

- To-do：`会员折扣&优惠券`
- 功能树 · 经营决策：`优惠券`

**依赖**：`feat/member`（或至少用户身份与订单金额）

**范围**

- [ ] 券模板 / 用户券表、`coupon` 云函数
- [ ] 确认页选券、金额试算
- [ ] 订单快照记录优惠额（仍可无微信支付）

---

## 分支 E · `feat/issue1-polish` — 问题清单（可再拆小 PR）

**Issue 依据**：Issue #1 评论 **「问题清单」**（与三环无强依赖，可并行）

| 优先级 | 项 | 建议独立 PR |
|--------|-----|-------------|
| P1 | 花束定制入口（不要藏在单独 Tab） | `fix/customize-entry` |
| P1 | 分类 Tab 预设 + 鲜花/花束/物料逻辑 | `feat/category-presets` |
| P1 | 图片本地缓存闪一下 | `fix/image-cache-flash` |
| P2 | 成组/单支由顾客选、成组优惠 | `feat/sales-unit-choice` |
| P2 | 商品定价策略（自由/梯度） | `feat/pricing-strategy` |
| P2 | 百科：花期、水培、可选条目、养护小知识 | `feat/wiki-enhance` |
| P3 | 多平台库存同步 | 需方案 Issue |
| P3 | 商品信息图片矫正 | `fix/goods-image-aspect` |

---

## 第三批 · 大模块（单独 Issue / 分支，暂不排期）

来自 Issue **基础功能树**，依赖或工作量大：

| 模块 | 分支名建议 |
|------|------------|
| 微信支付 | `feat/wechat-pay` |
| 定制花束完善（若入口改完后仍缺） | `feat/customize-flow` |
| 收货地址体验 / 云同步 | `feat/address-cloud` |
| 商品评价 / 在线客服 / 订单通知 | `feat/trust-*` |
| 节日主题一键替换 | `feat/theme-festival` |
| 盈利试算 / 促销中心 | `feat/merchant-analytics` |
| 交互流程图（To-do） | 文档/FigJam，非代码分支 |
| 隐私协议 | `feat/privacy-consent` |

---

## 建议推进顺序

```text
1. 合并 feat/closed-loop → main
2. feat/order-delivery      （闭环体验完整：怎么交货）
3. feat/goods-batch         （B 端效率）
4. feat/member → feat/coupon（经营体系）
5. issue1-polish 按 P1 逐项拆 PR
6. feat/wechat-pay          （付款确定方案后）
```

---

## 与文档的关系

| 文档 | 说明 |
|------|------|
| [closed-loop-plan.md](./closed-loop-plan.md) | 已完成的三环 |
| [order.md](./order.md) | 订单模块现状 |
| [features.md](./features.md) | 总览索引 |
| **本文档** | Issue #1 闭环之上的分支地图 |

---

## 下一步

1. 将当前未提交代码提交到 **`feat/closed-loop`** 并合并 main。  
2. 选定第一个分支（建议 **`feat/order-delivery`** 或 **`feat/goods-batch`**）。  
3. 在 Issue #1 评论 To-do 中勾选已完成的闭环子项，并新开评论跟踪「闭环之上」分支进度。
