# Repository

> **所属**：[数据加载模块](./数据加载模块.md)  
> **状态**：已迁入

### Phase B · Repository 门面

- [x] `src/data/repository/`：`shop`、`categories`、`goods`、`wiki`、`merchant*`、`flower`
- [x] 方案 A：`pageRegistry` + `usePageData()` + `src/data/pages/*`（含商品详情、商家分类/选品、销售策略编辑）
- [x] 与快照比较、图片 URL 缓存配合（见 `goodsImage` / `goodsListSnapshot`）



完整调度与 Phase 清单见 [架构](./数据加载模块-架构.md)。
