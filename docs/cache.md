> 📂 **文档分类**：架构与技术 · **主索引**：[README.md](../README.md) · **整理规划**：[文档规划.md](./文档规划.md)

# 本地缓存执行清单

> **策略与架构**见 [data-loading.md](./data-loading.md)（分层、优先级调度、三端适配、文献参考）。  
> 本文档记录 **已落地的 SWR 实现** 与运维清单。

## 策略概览

**Stale-While-Revalidate（SWR）**：有缓存先展示 → 后台拉 `meta` 版本号 → 版本变或 TTL 过期再拉业务数据。

## 执行进度

### 阶段 1 · 云端版本号（已完成）

- [x] `cache_meta` 集合 + `cloudfunctions/common/cacheMeta.js`
- [x] `meta` 云函数：返回各模块 `version`
- [x] 商家写操作后 `bump`：`category` / `goods` / `shop`

### 阶段 2 · 前端缓存层（已完成）

- [x] `src/utils/cache/`：`storage` / `meta` / `loadWithCache`
- [x] `src/types/cache.ts`

### 阶段 3 · 业务接入（已完成）

- [x] 分类：`listPublicCategoriesCached` + `usePublicCategories`
- [x] 商品列表：`listPublicGoodsCached` + `usePublicGoods`（搜索不走缓存）
- [x] 百科列表：`listPublicWikiCached` + 百科 Tab 页
- [x] 商家保存后 `invalidateCacheModule`（本机立即清缓存）
- [x] 首页 / 百科下拉刷新：`force: true` 强制拉云端

### 阶段 4 · 详情与花卉库

- [x] 花卉库 `flower` 选择器缓存（`listFlowerCatalogCached`，搜索仍直连接口）
- [x] 百科详情 `getPublicWikiCached` + 商品页 `matchPublicWikiCached`
- [x] 商品详情 `getPublicGoodsCached`
- [x] `shop` store 接入 `fetchShopSettingsCached`（meta 版本 + SWR）
- [x] 云端种子写入时 bump `flower` / `wiki`（`ensureDefaultFlowerCatalog` / `ensureDefaultWiki`）
- [ ] 商家端 `wiki` / `flower` 写操作 bump（待管理后台 CRUD）

### 阶段 5 · 体验补齐（已完成）

- [x] 商家分类/商品列表缓存（全量列表单键 + 客户端 Tab/分类筛选，搜索不走缓存）
- [x] `useMerchantCategories` / `useMerchantGoods` composables
- [x] 顾客商品列表页分类名走 `usePublicCategories` 缓存
- [x] 分类 Tab 下拉刷新 `force: true`
- [x] 启动时预取 `meta` 版本（`app.ts` → `fetchCacheVersions`）

## 部署

```bash
# 部署 meta 及已改动的云函数
cloudfunctions/meta
cloudfunctions/category
cloudfunctions/goods
cloudfunctions/shop
cloudfunctions/flower
cloudfunctions/wiki
```

## 触发条件速查

| 场景 | 行为 |
|------|------|
| 首次打开 / 无本地缓存 | 拉云端 + 写入缓存 |
| 再次打开 | 先读缓存展示；后台比 `meta` 版本 |
| 商家改了数据 | 云端 `version+1`；用户下次进页后台发现版本变 → 静默更新 |
| 下拉刷新 | `force: true`，跳过缓存直拉 |
| TTL 到期（兜底） | 后台静默重拉（分类/百科 24h，商品 10min） |
| 商家本机保存成功 | `invalidateCacheModule` 清本模块缓存 |

## 缓存键约定

| 模块 | 键 |
|------|-----|
| 分类（顾客） | `categories:public` |
| 分类（商家） | `categories:merchant` |
| 商品列表（顾客） | `goods:public:all`（左侧分类 Tab 客户端筛选） |
| 商品列表（商家） | `goods:merchant:all`（在售/下架 Tab 客户端筛选） |
| 商品详情 | `goods:public:detail:{id}` |
| 百科列表 | `wiki:public:list` |
| 百科详情 | `wiki:public:detail:{id}` |
| 百科匹配 | `wiki:public:match:{kindId}:{varietyId}` |
| 花卉库 | `flower:catalog:list` |
| 店铺设置 | `shop:settings` |

存储前缀：`fyfs:cache:v1:`

## 待建设（见 data-loading.md）

- [x] `CacheSyncScheduler`：空闲预取、进页抢占、断点 manifest（`src/data/`）
- [x] Repository 门面：`shop` / `categories` / `goods` / `wiki`
- [ ] 三端 `IStorage` / `IApi` 适配（导出 App 前）
- [ ] 列表 cursor 分页与增量 sync API
- [x] 顾客端商品前台轮询（`goodsLiveSync` + `useGoodsLiveSync`，meta 版本变化局部 patch）
