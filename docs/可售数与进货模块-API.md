# 可售数与进货模块 · API

> **模块入口**：`@/modules/warehouse`  
> **云函数**：`goods`（`listWarehouseLedger` / `seedWarehouseTestData` / `cleanupWarehouseTestData`）  
> **分层**：强化  
> **封装状态**：✅（2026-07-06）

---

## 职责与边界

| 做 | 不做 |
|----|------|
| 可售数仓储流水查询（出入库记录） | WMS 级库位管理（本模块仅为「门面售货」可售数台账） |
| 测试数据生成/清理 | 商品库存实际扣减（下单扣减在 order/goods 云 handler） |

---

## 前端公开 API

```ts
import {
  listWarehouseLedger,
  seedWarehouseTestData,
  cleanupWarehouseTestData,
} from '@/modules/warehouse'
```

| 函数 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `listWarehouseLedger({ type?, limit?, skip? })` | 筛选/分页 | `WarehouseLedgerBatch[]` | 仓储流水列表 |
| `seedWarehouseTestData()` | — | `{ count }` | 生成测试数据 |
| `cleanupWarehouseTestData()` | — | `{ deleted }` | 清理测试数据 |

### 公开类型

| 类型 | 说明 |
|------|------|
| `WarehouseLedgerBatch` | 单批次流水（含商品、数量、操作类型） |
| `WarehouseLedgerFilter` | `'all' \| 'stock_in' \| 'shipment' \| 'adjustment' \| 'void'` |

定义见 `@/types/stockOut`。

---

## 云函数 `goods` · action

| action | 鉴权 | 入参 | 成功出参 |
|--------|------|------|----------|
| `listWarehouseLedger` | 商家 | `type`, `limit`, `skip` | `list: WarehouseLedgerBatch[]` |
| `seedWarehouseTestData` | 商家 | — | `count` |
| `cleanupWarehouseTestData` | 商家 | — | `deleted` |

---

## 依赖模块

| 依赖 | 用途 |
|------|------|
| `@/services/cloud` | 云调用 |

---

## 调用方清单

| 路径 | API |
|------|-----|
| `data/pages/merchantWarehouseHistory.ts` | `listWarehouseLedger` |

---

## 目录结构

```text
src/modules/warehouse/
  api.ts
  client.ts
  index.ts
```

---

## 变更记录

| 日期 | 摘要 |
|------|------|
| 2026-07-06 | 从 `services/warehouse` 拆出 |
