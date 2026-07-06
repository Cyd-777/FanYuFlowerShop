# 分类管理模块 · API

> **模块入口**：`@/modules/category`  
> **云函数**：`category`  
> **分层**：强化  
> **封装状态**：✅（2026-07-06）

---

## 职责与边界

| 做 | 不做 |
|----|------|
| 一阶/二阶分类 CRUD、启/禁用、升/降阶 | 商品与分类的关联（由商品模块写入 `categoryId`） |
| 分类排序、`wiki:` 衍生分类只读展示 | 智库品种自动创建衍生分类（由云端 `ensureCategoryMigrated` 处理） |
| 顾客端公开列表缓存、商家端全量列表 | 分类与品种别名归并（见 `flower-identity.json`） |

---

## 前端公开 API

```ts
import {
  listPublicCategories,
  listPublicCategoriesCached,
  listMerchantCategories,
  listMerchantCategoriesCached,
  getMerchantCategory,
  createCategory,
  updateCategory,
  removeCategory,
  reorderMerchantCategories,
  setCategoryNavTier,
  formatCategoryLabel,
} from '@/modules/category'
```

### 顾客端（读）

| 函数 | 说明 |
|------|------|
| `listPublicCategories()` | 顾客端公开分类列表 |
| `listPublicCategoriesCached(options?)` | SWR 缓存 |

### 商家端

| 函数 | 说明 |
|------|------|
| `listMerchantCategories()` | 全量列表（含未启用） |
| `listMerchantCategoriesCached(options?)` | SWR 缓存 |
| `getMerchantCategory(id)` | 单条详情 |
| `createCategory(form)` | 新建分类 |
| `updateCategory(id, form)` | 更新分类 |
| `removeCategory(id)` | 删除分类 |
| `reorderMerchantCategories(orderedIds)` | 排序 |
| `setCategoryNavTier(id, navTier, parentId?)` | 升/降阶 |
| `formatCategoryLabel(category)` | `icon + name` 展示 |
| `toCategoryPayload(form)` | 表单转云 payload |

### 公开类型

| 类型 | 说明 |
|------|------|
| `Category` | 完整分类对象 |
| `CategoryForm` | 分类表单类型 |

定义见 `@/types/category`。

---

## 云函数 `category` · action

| action | 鉴权 | 入参 | 成功出参 |
|--------|------|------|----------|
| `publicList` | — | — | `list: Category[]` |
| `list` | 商家 | — | `list: Category[]` |
| `get` | 商家 | `id` | `category: Category` |
| `add` | 商家 | `category` | `category: Category` |
| `update` | 商家 | `id`, `category` | `category: Category` |
| `remove` | 商家 | `id` | — |
| `reorderSort` | 商家 | `orderedIds` | `list: Category[]` |
| `setNavTier` | 商家 | `id`, `navTier`, `parentId` | `category: Category` |

缓存失效：`categoriesOnly` 事件 → 三方 bump。

---

## 依赖模块

| 依赖 | 用途 |
|------|------|
| `@/services/cloud` | 云调用 |
| `@/utils/cache` | `loadWithCache`、失效矩阵 |

---

## 调用方清单

| 路径 | API |
|------|-----|
| `data/repository/categoriesRepository.ts` | `listPublicCategoriesCached` |
| `data/repository/merchantCategoriesRepository.ts` | `listMerchantCategoriesCached` |
| `composables/useMerchantCategories.ts` | `listMerchantCategories` |
| `pagesMerchant/category/edit.vue` | 商家端 CRUD |

---

## 目录结构

```text
src/modules/category/
  api.ts
  client.ts
  index.ts
```

---

## 变更记录

| 日期 | 摘要 |
|------|------|
| 2026-07-06 | 从 `services/category` 拆出；调用方改引 `@/modules/category` |
