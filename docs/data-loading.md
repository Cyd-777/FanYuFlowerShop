# 数据加载方案

本文档描述梵宇花店 **跨端（微信小程序 → 未来 Android/iOS App）** 的数据加载与本地缓存策略。  
当前实现以 [cache.md](./cache.md) 中的 SWR 单键缓存为主；本文档定义 **目标架构** 与 **分阶段落地清单**。

---

## 1. 设计目标

| 目标 | 说明 |
|------|------|
| **首屏快** | 当前页可展示的数据同步读出，不阻塞 UI 等全量接口 |
| **后台不断** | 空闲时持续预取；进页缺数据时可抢占；完成后断点续跑 |
| **数据可增长** | 商品/百科体量变大时，靠分页与分层而非一次拉全表 |
| **三端可复用** | 调度与 Repository 逻辑与端无关；Storage/API 走适配层 |
| **体验稳定** | 有缓存时不闪屏、不整表替换；图片 URL 稳定复用 |

---

## 2. 参考模式（文献与业界实践）

本方案组合以下成熟模式，而非单一技巧：

| 模式 | 含义 | 参考 |
|------|------|------|
| **Stale-While-Revalidate（SWR）** | 先展示本地旧数据，后台校验后再静默更新 | [web.dev: Stale-while-revalidate](https://web.dev/articles/stale-while-revalidate)；HTTP `Cache-Control: stale-while-revalidate`（RFC 5861 相关实践） |
| **Cache-Aside** | 读：先缓存 miss 再回源；写：更新源后失效缓存 | [Microsoft: Cache-Aside pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside) |
| **Repository** | UI 不直接调 API/Storage，经统一数据入口 | [Martin Fowler: Repository](https://martinfowler.com/eaaCatalog/repository.html) |
| **Cursor Pagination** | 用游标翻页，避免大 offset 与重复/漏项 | [GraphQL Cursor Connections Specification](https://relay.dev/graphql/connections.htm)（思路通用） |
| **Priority Task Queue** | 前台任务抢占后台预取，完成后恢复断点 | 移动 OS 常见调度（Android [WorkManager 约束](https://developer.android.com/develop/background-work/background-tasks/persistent/getting-started)；iOS [Background Tasks](https://developer.apple.com/documentation/backgroundtasks) 为 App 端延伸） |
| **Offline-First / Local-First** | 本地索引为真源展示，网络为同步层 | [Offline First](http://offlinefirst.org/)；[local-first software](https://www.inkandswitch.com/local-first/) |

**与本项目的关系**：  
- 已实现：**SWR + Cache-Aside（meta 版本 bump）+ 按 id 详情缓存**  
- 待建设：**Repository 门面 + 优先级调度队列 + 分页/断点 manifest**

---

## 3. 数据分层

所有模块统一分为三层，**首屏只依赖当前页需要的层**：

```text
L0 索引（瘦数据）     列表、Tab、搜索预判、推荐位
        ↓
L1 详情（胖数据）     按 id 单条；看过即秒进
        ↓
L2 关联（按需）       如 wiki:match:{kindId}:{varietyId}
```

| 模块 | L0 索引 | L1 详情 | L2 关联 |
|------|---------|---------|---------|
| 店铺 | `shop:settings` | — | — |
| 分类 | `categories:public` / `merchant` | — | — |
| 商品 | `goods:public:recommend`、`goods:public:all` | `goods:public:detail:{id}` | — |
| 百科 | `wiki:public:list` | `wiki:public:detail:{id}` | `wiki:public:match:…` |
| 花卉库 | `flower:catalog:list` | — | — |

**字段原则**（对齐 REST/BFF 常见做法）：列表接口不返回长文本、多图数组；详情接口再返回完整字段。

---

## 4. 加载优先级（P0～P3）

```text
P0 Must-Load   当前打开页面渲染所必需的数据（可阻塞首屏，但应尽量 hit 本地）
P1 Warm        首屏完成后立即异步：相邻 Tab、同模块索引
P2 Background  空闲队列：预测高频、百科详情逐条预取
P3 Idle        低优全量同步：Wi‑Fi 可选、弱网可暂停
```

### 4.1 顾客端页面与 P0 映射

| 页面 | P0（Must-Load） | P1 / P2（后台） |
|------|-----------------|-----------------|
| 首页 | `shop:settings`、`goods:public:recommend`、`categories:public` | `goods:public:all` |
| 分类 Tab | `categories:public`、`goods:public:all` | 推荐商品 detail |
| 百科 Tab | `wiki:public:list` | `wiki:public:detail:{id}` 队列 |
| 百科详情 | `wiki:public:detail:{id}` | 相邻条目（可选） |
| 商品详情 | `goods:public:detail:{id}` | `wiki:public:match:…` |
| 购物车 | Pinia 本地 | — |

### 4.2 模块频率与预取策略

| 模块 | 使用频率 | 数据量趋势 | 预取建议 |
|------|----------|------------|----------|
| 商品 | 高 | 可能超过百科 | 索引优先；detail 仅推荐位 + LRU |
| 百科 | 低 | 当前较大 | list 一次；detail **逐条队列**全量或近全量 |
| 分类/店铺 | 高 | 小 | 随 P0 或 P1 即可 |

---

## 5. 调度规则：空闲预取 + 进页抢占 + 断点续跑

这是本项目的 **核心调度契约**（与成熟 App 优先级队列一致）。

### 5.1 状态机

```text
[空闲] ──启动 P2/P3 队列──► [后台同步中]
                                  │
                    用户打开页面 P │
                                  ▼
                    P 的数据是否 L1 可展示？
                         │              │
                        是              否
                         │              │
                         ▼              ▼
                  不抢占，后台继续   pause 队列 + generation++
                         │              │
                         │              ▼
                         │         P0 加载 P
                         │              │
                         │              ▼
                         │         P 完成（L1/L3）
                         │              │
                         └──────┬───────┘
                                ▼
                         resume 队列（从 cursor 续跑）
```

### 5.2 「就绪」三档（是否抢占后台）

| 档位 | 条件 | 进页行为 |
|------|------|----------|
| **L1 可展示** | 本地有缓存，可立即渲染列表/详情 | **不抢占**；版本校验走低优 SWR |
| **L2 需拉取** | 无缓存或业务强制 `force` | **抢占**后台，优先 P0 |
| **L3 已最新** | 缓存存在且 `meta` 版本一致 | **不抢占**；跳过网络 |

加购/下单等 **强一致** 场景（如 `validateGoodsForPurchase`）仍 **直连云端**，不走 idle 队列。

### 5.3 抢占与取消

- 微信小程序 **无法中止** 进行中的 `callFunction`；采用 **generation 令牌**：抢占时 `generation++`，旧请求返回后 **丢弃结果**，不写 Storage。
- 队列 **单 worker 并发 = 1**（Phase 1），降低竞态；后续 App 端可提高到 2。

### 5.4 断点 Manifest（持久化）

```typescript
interface SyncManifest {
  module: 'wiki' | 'goods' | 'flower' | 'categories'
  phase: 'index' | 'details'
  status: 'idle' | 'running' | 'paused' | 'complete' | 'partial'
  serverVersion: number
  generation: number
  cursor: number              // 下次从 pendingIds[cursor] 开始
  pendingIds: string[]
  doneIds: string[]
  updatedAt: number
}
```

- **每完成一条 L1 写入** 即更新 `cursor` 与 `doneIds`（支持进程被杀后续跑）。
- `onHide`：checkpoint + `paused`；`onShow`：若 `partial` 则 `resume`。

---

## 6. 与现有 `loadWithCache` 的关系

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

## 7. 服务端配合（云函数 / 未来 HTTP API）

| 能力 | 现状 | 目标 |
|------|------|------|
| 版本号 | `meta` 云函数 + `cache_meta` | 保持 |
| 列表 | 多数 `publicList` 一次全表 | 增加 `cursor` + `limit` + `hasMore` |
| 增量 | 无 | `sinceVersion` 或 `updatedAfter` 返回 patch |
| 字段裁剪 | wiki list 有 preview | goods list 进一步瘦字段 |
| App 出口 | 仅 `wx.cloud` | HTTP 网关封装云函数（导出 App 前） |

分页响应建议形态：

```json
{
  "success": true,
  "list": [],
  "nextCursor": "opaque-cursor-or-null",
  "hasMore": false
}
```

---

## 8. 三端适配

|  Concern | 微信小程序（当前） | H5 | Taro RN（Android/iOS） |
|----------|-------------------|-----|-------------------------|
| API | `wx.cloud.callFunction` | HTTP | HTTP |
| 存储 | `wx.storage`（~10MB） | `localStorage` / IndexedDB | **SQLite** + 文件缓存 |
| 后台任务 | 仅 foreground + checkpoint | 同 H5 | `AppState` + 原生 Background Task |
| 图片 | `getTempFileURL` + 本地 URL 缓存 | CDN URL | 磁盘缓存 |
| 调度逻辑 | **共用 TypeScript** | 共用 | 共用 |

**适配层接口（目标）**：

```typescript
interface IStorage {
  get<T>(key: string): T | null
  set<T>(key: string, value: T): void
  removeByPrefix(prefix: string): void
}

interface IApi {
  callFunction(name: string, data: Record<string, unknown>): Promise<unknown>
  // App 期：callHttp(method, path, body)
}

interface ILifecycle {
  onForeground(cb: () => void): void
  onBackground(cb: () => void): void
}
```

业务代码 **禁止** 在页面内直接散落 `wx.*`；经 `services/` + Repository 访问。

---

## 9. 存储与淘汰

| 数据类型 | 策略 |
|----------|------|
| L0 索引 | 整键保留；版本变则整键更新 |
| L1 百科详情 | 倾向 **全量预取**（条目有限） |
| L1 商品详情 | **LRU**（如最近 100 条 + 推荐位 id） |
| 图片 URL 缓存 | TTL 90min，独立于业务键 |
| 容量压力 | manifest 标记 `storage_pressure`，暂停 P2/P3，保留 P0 |

小程序阶段 10MB 上限；App 阶段 SQLite 可显著放宽。

---

## 10. 网络策略（可选）

| 条件 | 行为 |
|------|------|
| 弱网 / 2G | 仅 P0；暂停 P2/P3 |
| Wi‑Fi | 允许 P3 百科 detail 全量队列 |
| 用户下拉刷新 | `force: true` → 暂停队列 → 清该模块 manifest → P0 重拉 → 再 resume |

---

## 11. 实施路线

与 [cache.md](./cache.md) 清单配合使用：**cache.md = 已落地项；本文 = 目标与待建项**。

### Phase A · 调度器骨架（前端）

- [x] `src/data/scheduler/CacheSyncScheduler.ts`：单 worker 队列、generation、pause/resume
- [x] `src/data/syncManifest.ts`：manifest 读写
- [x] `app.ts`：`onShow` / `onHide` checkpoint
- [x] 百科：`wiki:public:detail` idle 队列（list 加载后 + App 回前台续跑）
- [x] 进页 `ensure`：L1 命中不抢占，L2 抢占

### Phase B · Repository 门面

- [x] `src/data/repository/`：`shop`、`categories`、`goods`、`wiki`、`merchant*`、`flower`
- [x] 方案 A：`pageRegistry` + `usePageData()` + `src/data/pages/*`（含商品详情、商家分类/选品、销售策略编辑）
- [x] 与快照比较、图片 URL 缓存配合（见 `goodsImage` / `goodsListSnapshot`）

### Phase C · 服务端分页与增量

- [ ] `goods` / `wiki` `publicList` 支持 cursor
- [ ] manifest `phase: index` 支持分页断点
- [ ] 评估 `sinceVersion` 增量接口

### Phase D · 三端适配与 App

- [ ] `IStorage` / `IApi` / `ILifecycle` 实现：`weapp`、`h5`、`rn`
- [ ] RN 侧 SQLite 存 L0/L1
- [ ] 云函数 HTTP 化供 App 调用

---

## 12. 模块速查：当前 vs 目标

| 场景 | 当前行为 | 目标行为 |
|------|----------|----------|
| 二次进首页 | SWR + 图片 URL 缓存 | + 不抢占 idle 队列 |
| 进百科 Tab | 拉整表 list | list L1 直出 + detail 后台队列 |
| 百科详情二次进入 | 单键缓存秒进 | 保持；未访问条目由队列预取 |
| 商品列表变大 | 单键全量 | 索引分页 + detail LRU |
| 导出 App | 依赖 `wx.cloud` | HTTP + SQLite |

---

## 13. 参考文献与延伸阅读

1. **Stale-While-Revalidate** — Google web.dev: https://web.dev/articles/stale-while-revalidate  
2. **Cache-Aside Pattern** — Microsoft Azure Architecture: https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside  
3. **Repository Pattern** — Martin Fowler, *Patterns of Enterprise Application Architecture*: https://martinfowler.com/eaaCatalog/repository.html  
4. **Cursor-based pagination** — GraphQL Relay Connections: https://relay.dev/graphql/connections.htm  
5. **Offline First** — http://offlinefirst.org/  
6. **Local-First Software** — Ink & Switch: https://www.inkandswitch.com/local-first/  
7. **Android WorkManager** — https://developer.android.com/develop/background-work/background-tasks/persistent/getting-started  
8. **Apple Background Tasks** — https://developer.apple.com/documentation/backgroundtasks  
9. **Taro 多端** — https://docs.taro.zone/docs/  
10. **微信云开发存储** — 本地缓存上限约 10MB（见[小程序存储](https://developers.weixin.qq.com/miniprogram/dev/api/storage/wx.setStorageSync.html)文档）

---

## 14. 相关文档

- [cache.md](./cache.md) — 已实现的 SWR 清单、缓存键、部署
- [cloud.md](./cloud.md) — 云函数与集合
- [architecture.md](./architecture.md) — 主包/分包与 NutUI 规范
- [goods.md](./goods.md) — 商品模块边界
