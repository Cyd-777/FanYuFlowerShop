# 素材管理模块 · API

> **模块入口**：`@/modules/asset`  
> **云函数**：`goods`（`processImageUpload` / `assetList` / `assetRename` / `assetDelete` / `assetCleanup`）  
> **分层**：强化  
> **封装状态**：✅（2026-07-06）

---

## 职责与边界

| 做 | 不做 |
|----|------|
| 图片上传 → 云存储 → 多分辨率处理 | 智库配图自动命名（由调用方自行决定 name） |
| 素材列表、重命名、删除、全量清理 | 商品主图 / Banner 写入业务字段（由调用方关联） |
| 上传前体积限制（`assertLocalImageWithinLimit`） | 素材与商品/智库的关联映射 |

---

## 前端公开 API

```ts
import {
  uploadAndProcessImage,
  fetchAssetList,
  renameAsset,
  deleteAsset,
  cleanupAllAssets,
  type AssetItem,
} from '@/modules/asset'
```

| 函数 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `uploadAndProcessImage(localPath, name, type?)` | 本地路径、名称、类型 | `{ originalFileId, previewFileId, standardFileId }` | 上传 + 云处理（默认 type `'goods'`） |
| `fetchAssetList(type?)` | 可选类型过滤 | `AssetItem[]` | 素材列表（已换链） |
| `renameAsset(assetId, name)` | ID、新名称 | `void` | 重命名 |
| `deleteAsset(assetId)` | ID | `void` | 删除云端三份文件 + 元数据 |
| `cleanupAllAssets()` | — | `{ deletedFileCount, deletedMetaCount }` | 全量清理 |

### 公开类型

| 类型 | 字段摘要 |
|------|----------|
| `AssetItem` | `_id`, `name`, `type`, `previewUrl`, `standardUrl` |

---

## 云函数 `goods` · action

| action | 鉴权 | 入参 | 成功出参 |
|--------|------|------|----------|
| `processImageUpload` | 商家 | `fileId`, `name`, `type` | `previewFileId`, `standardFileId`, `originalFileId`, `degraded?` |
| `assetList` | 商家 | `type?` | `list: AssetItem[]` |
| `assetRename` | 商家 | `assetId`, `name` | — |
| `assetDelete` | 商家 | `assetId` | — |
| `assetCleanup` | 商家 | — | `deletedFileCount`, `deletedMetaCount` |

所有 action 鉴权经 `common/merchantGate.js`。

---

## 依赖模块

| 依赖 | 用途 |
|------|------|
| `@/services/cloud` | 云调用 + 云文件上传 |
| `@/utils/uploadImageLimit` | 上传前体积校验 |

---

## 调用方清单

| 路径 | API |
|------|-----|
| `pagesMerchant/asset/index.vue` | 上传、列表、删除 |
| `pagesMerchant/goods/edit.vue` | `uploadAndProcessImage`（上传商品图） |
| `pagesMerchant/shop/sales-strategy/edit.vue` | `uploadAndProcessImage`（上传 Banner） |

---

## 目录结构

```text
src/modules/asset/
  api.ts
  client.ts
  index.ts
```

---

## 变更记录

| 日期 | 摘要 |
|------|------|
| 2026-07-06 | 从 `services/asset` 拆出；调用方改引 `@/modules/asset` |
