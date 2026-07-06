# 收藏模块 · API

> **模块入口**：`@/modules/favorite`  
> **云函数**：`favorite`  
> **分层**：附加（业务目录）  
> **封装状态**：✅ 迭代 1（2026-07-06）

---

## 职责与边界

| 做 | 不做 |
|----|------|
| 顾客收藏商品 CRUD | 购物车同步（由调用方自行 `addGoodsToCart`） |
| 收藏列表返回 `Goods` 快照 | 商品详情/库存实时同步（列表为写入时快照） |

---

## 前端公开 API

```ts
import {
  listFavoriteGoods,
  checkFavorite,
  addFavorite,
  removeFavorite,
  toggleFavorite,
} from '@/modules/favorite'
```

| 函数 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `listFavoriteGoods()` | — | `Goods[]` | 我的收藏列表 |
| `checkFavorite(goodsId)` | 商品 ID | `boolean` | 是否已收藏 |
| `addFavorite(goodsId)` | 商品 ID | `void` | 添加收藏 |
| `removeFavorite(goodsId)` | 商品 ID | `void` | 取消收藏 |
| `toggleFavorite(goodsId, favorited)` | 当前状态 | `boolean` | 切换后状态 |

返回类型 `Goods` 来自 `@/types/goods`（只读依赖，非模块实现细节）。

---

## 云函数 `favorite` · action

| action | 鉴权 | 入参 | 出参 |
|--------|------|------|------|
| `list` | 登录顾客 | — | `list: Goods[]` |
| `check` | 登录 | `goodsId` | `favorited` |
| `add` | 登录 | `goodsId` | — |
| `remove` | 登录 | `goodsId` | — |

---

## 依赖模块

| 依赖 | 用途 |
|------|------|
| `@/services/cloud` | 云调用 |
| `@/types/goods` | 列表项类型（公开契约一部分） |

---

## 调用方清单

| 路径 | API |
|------|-----|
| `pagesCustomer/goods/detail.vue` | `checkFavorite`, `toggleFavorite` |
| `pagesCustomer/favorite/index.vue` | `listFavoriteGoods` |

---

## 目录结构

```text
src/modules/favorite/
  api.ts
  client.ts
  index.ts
```

---

## 变更记录

| 日期 | 摘要 |
|------|------|
| 2026-07-06 | 迭代 1 封装；`services/favorite` 改兼容 re-export |
