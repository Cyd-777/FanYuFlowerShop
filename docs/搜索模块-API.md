# 搜索模块 · API

> **模块入口**：`@/modules/search`  
> **云函数**：`goods`（`search` action）+ `wiki`（`search` action）— 经 Repository 聚合，无独立 CF  
> **分层**：附加  
> **封装状态**：✅ 迭代 3 · 顾客联合搜索门面（2026-07-06）

---

## 职责与边界

| 做 | 不做 |
|----|------|
| 顾客端**商品 + 智库**联合搜索、预判建议 | 商家商品管理搜索（见 `goods` 商家 composable） |
| 联合搜索页 URL 构建 | 百科 Tab 独立搜索 UI（仍经 `wikiRepository`，待 `@/modules/wiki`） |
| 并行编排 `goodsRepository` + `wikiRepository` | 三套搜索框组件统一（UI 层，见 [搜索模块](./搜索模块.md)） |

---

## 前端公开 API

```ts
import {
  searchCustomerUnified,
  suggestCustomerUnified,
  buildCustomerSearchPageUrl,
  matchSuggestChannelsForLabel,
} from '@/modules/search'
```

| 函数 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `searchCustomerUnified(keyword, { exactName? })` | 关键词 | `{ goods, wiki, wikiAnswer? }` | 并行搜商品 + 百科 |
| `suggestCustomerUnified(goods, wiki, query, limit?)` | 已加载目录 + 输入 | `SearchSuggestion[]` | 首页/分类实时预判 |
| `buildCustomerSearchPageUrl(keyword, { exactName?, scope? })` | 关键词 | 小程序 path | 跳转联合搜索页 |
| `matchSuggestChannelsForLabel(goods, wiki, label)` | 目录 + 标签 | `'goods' \| 'wiki'[]` | 预判通道命中检测 |

### 公开类型

| 类型 | 说明 |
|------|------|
| `CustomerUnifiedSearchResult` | `{ goods: Goods[]; wiki: FlowerWikiListItem[]; wikiAnswer? }` |
| `CustomerUnifiedSearchScope` | `'all' \| 'goods' \| 'wiki'`（来自 `@/types/search`） |
| `SearchSuggestion` | 预判条目 `{ id, label, meta? }` |
| `WikiAnswerSnippet` | 百科语义预判答案卡片 |
| `SuggestChannel` | `Exclude<CustomerUnifiedSearchScope, 'all'>` |

`Goods`、`FlowerWikiListItem` 来自 `@/types/goods`、`@/types/wiki`（只读依赖）。

---

## 云侧 action（间接）

本模块不直连云函数；经 Repository 调用：

| 域 | 入口 | 说明 |
|----|------|------|
| 商品 | `goodsRepository.search(query)` | `parseCustomerGoodsSearchQuery` 产出查询结构 |
| 智库 | `wikiRepository.search(query)` | `parseWikiSearchQuery` 产出 `WikiQuery` |

后续封 `@/modules/wiki` / `@/modules/goods` 时，本模块改引模块 API，对外签名不变。

---

## 依赖模块

| 依赖 | 用途 |
|------|------|
| `data/repository`（`goods` / `wiki`） | 读路径聚合（过渡期；待 wiki/goods 模块） |
| `@/utils/parseCustomerGoodsSearchQuery` | 顾客商品查询解析 |
| `@/utils/parseWikiSearchQuery` | 智库查询解析 |
| `@/utils/customerSearchSuggest` | 预判构建 |

---

## 调用方清单

| 路径 | API |
|------|-----|
| `data/pages/home.ts` | `suggestCustomerUnified`, `buildCustomerSearchPageUrl` |
| `data/pages/category.ts` | 同上 |
| `data/pages/customerSearch.ts` | `searchCustomerUnified`, `suggestCustomerUnified` |

---

## 目录结构

```text
src/modules/search/
  api.ts
  types.ts
  client.ts
  index.ts
```

---

## 变更记录

| 日期 | 摘要 |
|------|------|
| 2026-07-06 | 迭代 3 封装；`services/customerUnifiedSearch` 改兼容 re-export |
