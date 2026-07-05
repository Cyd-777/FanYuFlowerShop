# SWR 与 loadWithCache

> **所属**：[数据加载模块](./数据加载模块.md)  
> **状态**：已迁入

落地清单见 [本地缓存](./本地缓存模块.md)。

```text
页面.vue
       ↓
usePageData()                           ← 生命周期 + route 解析（`src/composables/usePageData.ts`）
       ↓
pageRegistry → setupXxxPageData()       ← 页面 P0 配置（`src/data/pages/` + `registerPages.ts`）
       ↓
Repository.ensure(module, scope, id?)   ← 统一入口（`src/data/repository/`）
       ↓
CacheSyncScheduler                      ← 优先级、抢占、断点（`src/data/scheduler/`）
       ↓
loadWithCache / loadRemote              ← 单键 SWR（已有）
       ↓
IStorage / IApi                         ← 端适配（待抽象）
```

| 层级 | 职责 |
|------|------|
| `loadWithCache` | 单键读写、meta 版本、TTL、`onUpdate` |
| `CacheSyncScheduler` | 多键顺序、P0～P3、generation、manifest |
| `Repository` | 业务语义：`ensureHome()`、`prefetchWikiDetails()` |

**UI 更新原则**（避免卡片闪动）：

- 有缓存时 **同步 hydrate** 再异步补图（见 `attachGoodsCoverImagesFromCache`）。
- 列表 **快照相等** 时不整表替换（见 `isSameGoodsListSnapshot`）。
- 云 fileID → 临时 URL **本地 TTL 缓存**（约 90min）。

---

