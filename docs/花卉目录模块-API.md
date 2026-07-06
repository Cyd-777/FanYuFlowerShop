# 花卉目录模块 · API

> **模块入口**：`@/modules/flower`  
> **数据源**：智库 `flower_wiki`（经 `wikiRepository.ensurePublicList`）  
> **分层**：业务读路径（与 [商品模块-花材选择](./商品模块-花材选择.md) 配套）  
> **封装状态**：✅ 迭代 3 · 读 API（2026-07-06）

---

## 职责与边界

| 做 | 不做 |
|----|------|
| 从百科词条构建**品类 / 品种**二级目录（支组花材选择） | 智库词条维护写路径（产品暂停） |
| SWR 缓存读取 `ensureFlowerCatalog` | 商品保存、分类衍生（见分类 / 商品模块） |
| 与百科 Tab 共用 `flower_wiki` 列表缓存 | 花卉搜索（花材 picker 内搜仍直引 `wikiRepository.searchPublicList`，待 wiki 模块） |

---

## 前端公开 API

```ts
import { ensureFlowerCatalog, type FlowerKindWithVarieties } from '@/modules/flower'
```

| 函数 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `ensureFlowerCatalog(options?)` | `force?`, `onUpdate?` | `LoadWithCacheResult<FlowerKindWithVarieties[]>` | 智库列表 → `buildFlowerCatalogFromWiki` |

### 公开类型

| 类型 | 说明 |
|------|------|
| `FlowerKindWithVarieties` | 品类 + `varieties[]` |
| `FlowerVariety` | 品种条目 |
| `FlowerKind` | 品类基础字段（经上二者导出） |

定义见 `@/types/flower`。

---

## 数据流（无独立云函数）

```text
flower_wiki（云库）
    ↓ wikiRepository.ensurePublicList
buildFlowerCatalogFromWiki
    ↓
FlowerKindWithVarieties[]
```

缓存键：`CACHE_KEYS.wikiList`；失效事件：`wikiContent` / `flowerCatalog`（见缓存矩阵）。

---

## 依赖模块

| 依赖 | 用途 |
|------|------|
| `data/repository/flowerRepository` | 过渡期内部实现（待迁入 `modules/flower/internal`） |
| `data/repository/wikiRepository` | 百科列表读 |
| `@/utils/wikiFlowerCatalog` | 列表 → 品类树 |

---

## 调用方清单

| 路径 | API |
|------|-----|
| `data/pages/flowerPicker.ts` | `ensureFlowerCatalog`（全量目录）；搜索分支仍用 `wikiRepository` |

---

## 目录结构

```text
src/modules/flower/
  api.ts
  client.ts
  index.ts
```

---

## 变更记录

| 日期 | 摘要 |
|------|------|
| 2026-07-06 | 迭代 3 读 API 封装；花材选择页改引 `@/modules/flower` |
