# 智库模块 · API（读路径）

> **模块入口**：`@/modules/wiki`  
> **云函数**：`wiki`（`publicList` / `publicSearch` / `publicGet` / `publicMatch`）  
> **分层**：业务（读路径）  
> **封装状态**：✅ 读路径（2026-07-06）；写路径 / 维护 UI 产品暂停，见 `services/wiki.ts`

---

## 职责与边界

| 做 | 不做 |
|----|------|
| 智库公开列表、详情、匹配、结构化搜索 | 商户端词条 CRUD / 智能粘贴 / 笔记编辑（产品暂停，`services/wiki` 保留） |
| `loadWithCache` 缓存读（列表 / 详情 / 匹配） | 学术数据预填充 `externalPrefill`（写路径附随） |
| 与 ① 智库顾客端展示 Tab / 详情页 / 商品关联共用 | 花卉目录品类树（见 `@/modules/flower`） |

---

## 前端公开 API（读路径）

```ts
import {
  listPublicWiki,
  listPublicWikiCached,
  searchPublicWiki,
  getPublicWiki,
  getPublicWikiCached,
  matchPublicWiki,
  matchPublicWikiCached,
} from '@/modules/wiki'
```

| 函数 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `listPublicWiki(keyword?)` | 关键词 | `FlowerWikiListItem[]` | 直连云 `publicList` |
| `listPublicWikiCached(options?)` | `force?`, `onUpdate?` | `LoadWithCacheResult<FlowerWikiListItem[]>` | 列表缓存 + SWR |
| `searchPublicWiki(query)` | `WikiQuery` | `WikiSearchResult` | 结构化搜索（含语义问答） |
| `getPublicWiki(id)` | 词条 ID | `FlowerWiki` | DB 直读 → 云兜底 |
| `getPublicWikiCached(id, options?)` | ID | `LoadWithCacheResult<FlowerWiki>` | 详情缓存 |
| `matchPublicWiki(kindId, varietyId?)` | 品类/品种 ID | `FlowerWiki \| null` | 按品种匹配词条 |
| `matchPublicWikiCached(kindId, varietyId?, options?)` | 同上 | `LoadWithCacheResult<FlowerWiki \| null>` | 匹配缓存 |

### 公开类型

| 类型 | 说明 |
|------|------|
| `FlowerWiki` | 完整词条（详情页） |
| `FlowerWikiListItem` | 列表投影 |
| `WikiQuery` | 结构化搜索请求 |
| `WikiSearchResult` | `{ list, answer? }` |
| `LoadWithCacheResult` | 缓存包装器 |

定义见 `@/types/wiki`、`@/types/search`。

---

## 云函数 `wiki` · action（读路径）

| action | 鉴权 | 入参 | 成功出参 |
|--------|------|------|----------|
| `publicList` | — | `keyword?` | `list: FlowerWikiListItem[]` |
| `publicSearch` | — | `query: WikiQuery` | `list, answer?` |
| `publicGet` | — | `id` | `wiki: FlowerWiki` |
| `publicMatch` | — | `kindId`, `varietyId` | `wiki: FlowerWiki \| null` |

写路径 action（`list` / `get` / `add` / `update` / `remove` / `externalPrefill`）仍经 `services/wiki.ts`
。

---

## 依赖模块

| 依赖 | 用途 |
|------|------|
| `@/services/cloud` | 云调用 |
| `@/services/wikiDb` | DB 直读兜底 |
| `@/utils/wikiCompose` | `assembleFlowerWiki` / `reassembleFlowerWiki` |
| `@/data/cacheKeys` | 缓存键工厂 |

---

## 调用方清单

| 路径 | API |
|------|-----|
| `data/repository/wikiRepository.ts` | 所有读函数（调度封装） |
| `data/scheduler/CacheSyncScheduler.ts` | `getPublicWikiCached` |
| `data/pages/*` / `data/prefetch/*` | 经 `wikiRepository` 间接引用 |

---

## 目录结构

```text
src/modules/wiki/
  api.ts
  types.ts
  client.ts      ← 读路径实现
  index.ts
```

---

## 变更记录

| 日期 | 摘要 |
|------|------|
| 2026-07-06 | 迭代 4 读路径封装；`services/wiki` 保留写 API + deprecated 读 re-export |
