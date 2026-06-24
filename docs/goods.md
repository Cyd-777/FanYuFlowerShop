> 📂 **文档分类**：业务功能 · **主索引**：[README.md](../README.md) · **整理规划**：[文档规划.md](./文档规划.md)  
> ⚠️ 待办/已完成列表可能未含批处理、进货单、口语搜索等近期能力，查看时请对照 [文档规划.md §4](./文档规划.md#4-与代码不一致的常见项供你改文档时对照)。

# 商品模块

## 边界定义

**商品模块**覆盖商家侧商品/分类/花卉库管理，以及顾客从浏览到购物车管理的链路。

```text
商家上架 → 顾客浏览 → 详情 → 加购 → 购物车（勾选、改数量）
                                              ↓
                                    点击「结算」进入订单模块
```

**确认页填单**（地址、备注、核对商品、点击「提交订单」）及之后的创建订单、支付、订单列表/详情、商家处理、核销，归属 **[订单模块](./order.md)**。

---

## 范围清单

### 顾客端

| 页面 / 能力 | 路径 | 状态 |
|-------------|------|------|
| 首页商品展示 | `pages/home` | ✅ |
| 分类 Tab 商品列表 | `pages/category` | ✅ |
| 商品列表 | `pagesCustomer/goods/list` | ✅ |
| 商品详情 | `pagesCustomer/goods/detail` | ✅ 浏览 + 加购 |
| 购物车 Tab | `pages/cart` | ✅ 持久化、改数量、去结算 |
| 收藏 | `pagesCustomer/favorite` | ✅ 详情收藏 + 列表加购 |

### 商家端

| 页面 / 能力 | 路径 | 状态 |
|-------------|------|------|
| 分类管理 | `pagesMerchant/category/*` | ✅ |
| 商品列表 | `pagesMerchant/goods/list` | ✅ |
| 商品编辑 | `pagesMerchant/goods/edit` | ✅（含花卉选择持久化） |
| 花卉选择器 | `pagesMerchant/flower/picker` | ✅ |

### 云端

| 云函数 | 职责 |
|--------|------|
| `goods` | 商品 CRUD；`publicList` / `publicGet` |
| `category` | 分类 CRUD；`publicList` |
| `flower` | 花卉库（商家选品） |
| `favorite` | 顾客收藏 `list` / `add` / `remove` / `check` |
| `meta` | 缓存版本（含 `goods` 模块） |

部署前执行：`npm run sync:cloud`

### 前端代码

| 类型 | 路径 |
|------|------|
| 服务 | `src/services/goods.ts`、`category.ts`、`flower.ts`、`favorite.ts` |
| Composables | `usePublicGoods`、`useMerchantGoods`、`usePublicCategories`、`useMerchantCategories` |
| 缓存 | `docs/cache.md` 中 `goods:*`、`categories:*`、`flower:catalog:*` |
| 类型 | `src/types/goods.ts`、`category.ts`、`flower.ts`、`cart.ts` |
| Store | `src/stores/cart.ts` |
| 服务 | `src/services/cart.ts`（同步、加购） |
| Composable | `src/composables/useAddToCart.ts` |

---

## 已完成

- [x] 商家商品 CRUD、上下架、搜索、Tab 筛选（本地筛 + 单键缓存）
- [x] 花卉选择器与商品字段持久化（`flowerKind*` / `flowerVariety*`）
- [x] 分类管理并与商品、顾客端 Tab 联动
- [x] 顾客端列表/详情浏览、百科卡片、商品相关 SWR 缓存
- [x] 云函数 `goods` / `category` / `flower` + `sync:cloud` 部署约定
- [x] `cart` store：本地持久化、加购快照价与库存
- [x] 详情：数量选择、加购前云端校验（`validateGoodsForPurchase`）
- [x] 购物车 Tab：商品行、改数量、删除、跳转详情、去结算
- [x] 进入购物车时云端同步（下架移除、库存/价格更新）
- [x] Tab 角标显示购物车商品总数
- [x] 加购 composable（详情、收藏复用）
- [x] 收藏：`favorite` 云函数 + 详情收藏 + 收藏列表
- [x] 首页推荐：`recommend` 字段 + 商家配置 + 仅推荐且有库存商品展示

## 待办（商品模块内）

### P1 · 体验与数据

- [ ] 热字段更新：`onSale` / `stock` / `price`（`publicAvailability` 或加购前强刷）
- [ ] 详情/列表下拉刷新；下架态 UI（浏览缓存与加购校验分离）
- [x] 商家多图上传（编辑页网格上传，详情轮播展示）
- [x] 售罄 / 下架区分：`onSale` 控制下架隐藏；`stock=0` 仍展示并标注「售罄」
- [x] 首页推荐仅展示有库存商品；分类页展示售罄商品

### P2 · 规模

- [ ] 列表分页；搜索扩展至花卉名/简介
- [ ] 商家列表快捷上/下架、复制商品

---

## 模块外（勿放入商品模块）

- 确认页填单、提交订单、支付、订单列表/详情 → [订单模块](./order.md)
- 会员积分、地址簿长期管理（地址选择在确认页，属订单流）
- 花卉百科 Tab 内容 → 百科模块（仅商品详情链到百科卡片）

---

## 与订单模块的接口

| 时点 | 商品模块 | 订单模块 |
|------|----------|----------|
| 加购 / 改购物车 | 写入 `cart` store，含快照价、库存 | — |
| 点击「结算」 | 校验已勾选行，跳转确认页 | 确认页读取 `checkedItems` |
| 提交订单 | — | `order.create`、扣库存、清空已下单项 |

**原则**：商品模块负责「想买什么」；订单模块负责「填单、成交及之后的一切」。
