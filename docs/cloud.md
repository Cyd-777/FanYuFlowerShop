> 📂 **文档分类**：入门与运维 · **主索引**：[README.md](../README.md) · **整理规划**：[文档规划.md](./文档规划.md)  
> ⚠️ 云函数表可能不全，完整树见 README「云函数结构树」；`address` / `favorite` / `map` / `seedDemo` 等待补入本文。

# 云开发说明

## 环境配置

| 配置项 | 位置 | 说明 |
|--------|------|------|
| 云环境 ID | `src/config/env.ts` | `CLOUD_ENV_ID` |
| 云函数目录 | `project.config.json` | `cloudfunctionRoot: cloudfunctions/` |
| 小程序输出 | `project.config.json` | `miniprogramRoot: dist/` |

## 云函数一览

| 云函数 | 用途 | 主要 action |
|--------|------|-------------|
| `login` | 登录、获取 OpenID、识别商家身份 | （无 action，直接返回 openid + isMerchant） |
| `shop` | 店铺设置读写 | `get`, `update` |
| `staff` | 工作人员管理 | `list`, `add`, `remove`, `updateRole` |
| `initDb` | 初始化数据库（商家权限） | （无 action） |
| `goods` | 商品管理 | 商家：`list`, `get`, `add`, `update`, `remove`；用户端：`publicList`, `publicGet`, `resolveFileUrls` |
| `category` | 分类管理 | 商家：`list`, `get`, `add`, `update`, `remove`；用户端：`publicList` |
| `flower` | 花卉库（品类 / 品种） | 商家：`list`, `search`, `getVariety` |
| `wiki` | 花卉百科智库 | 用户端：`publicList`, `publicGet`, `publicMatch`, `publicSearch`；维护：`syncKindProfiles`（批量写回品类资料） |
| `meta` | 缓存版本号 | 用户端：返回 `cache_meta.versions`；`action: resolveFileUrls` 换图片临时链接 |
| `order` | 订单 | `create`, `get`, `list`, `updateStatus`, `stats` |

## 数据库集合

| 集合 | 说明 | 自动创建 |
|------|------|----------|
| `shops` | 店铺设置（店名、电话、营业时间等） | `shop` / `initDb` 云函数 |
| `merchants` | 商家工作人员（OpenID、姓名、角色） | `initDb` 云函数 |
| `categories` | 商品分类（名称、图标、排序、启用状态） | `category` 云函数（含默认 5 类） |
| `goods` | 商品 | `goods` 云函数 |
| `flower_kinds` | 花卉品类（玫瑰、牡丹等） | `flower` 云函数 |
| `flower_varieties` | 花卉品种（红玫瑰、黄天霸等） | `flower` 云函数 |
| `flower_wiki` | 花卉百科智库（图鉴 / 养殖 / 花语） | `wiki` 云函数，关联 `kindId` / `varietyId` |
| `cache_meta` | 各模块缓存版本号 | `meta` 云函数；写操作自动 bump |
| `orders` | 顾客订单（行快照、地址、状态） | `order` 云函数 |

### categories 字段

```json
{
  "name": "混搭花束",
  "icon": "💐",
  "sort": 100,
  "enabled": true,
  "createdAt": "serverDate",
  "updatedAt": "serverDate"
}
```

### goods 字段

```json
{
  "name": "春日混搭花束",
  "price": 168,
  "stock": 20,
  "description": "商品描述",
  "categoryId": "分类文档 _id",
  "categoryName": "混搭花束",
  "coverImage": "cloud://...",
  "images": ["cloud://..."],
  "onSale": true,
  "sort": 100,
  "createdAt": "serverDate",
  "updatedAt": "serverDate"
}
```

示例见 `cloud/database/goods.example.json`。

## 云存储

- [x] 用途：商品封面图、店铺 banner 等（**商家维护的公有资源**）
- [x] 上传路径：`goods/{timestamp}_{random}.{ext}`（商家端上传，存 `cloud://` fileID）
- [x] **顾客端展示**：`goods.publicList` / `publicGet`、`favorite.list` 在云函数内换好 `coverImageUrl` / `imageUrls`（HTTPS），不依赖顾客身份读存储
- [x] 商家端列表：仍可用客户端或 `resolveFileUrls` 换链（上传者本人通常可读）
- [ ] 需在云开发控制台开通云存储

### 数据归属（读接口约定）

| 类型 | 示例 | 维护方 | 顾客端接口 |
|------|------|--------|------------|
| 公有只读 | 商品、分类、百科 | 商家 | `publicList` / `publicGet` 等，**无需登录**或仅需 OpenID |
| 顾客私有 | 收藏、购物车、订单 | 顾客 | 按 OpenID 隔离；收藏列表中的商品图同样走公有换链 |

**说明**：云存储默认「仅创建者可读」时，顾客不能在前端用 `getTempFileURL` 读商家上传的图；必须在云函数侧换链后下发 HTTPS。

## 权限与角色

### 店长白名单

在以下云函数中配置 `OWNER_OPENIDS`（需保持一致）：

- `cloudfunctions/login/index.js`
- `cloudfunctions/shop/index.js`
- `cloudfunctions/staff/index.js`
- `cloudfunctions/initDb/index.js`
- `cloudfunctions/goods/index.js`
- `cloudfunctions/category/index.js`

### 角色类型

| 角色 | 标识 | 说明 |
|------|------|------|
| 店长 | `owner` | OpenID 白名单或 merchants 集合 |
| 管理员 | `manager` | merchants 集合 |
| 员工 | `staff` | merchants 集合 |
| 顾客 | — | 非 merchants 集合用户 |

## 初始化流程

- [x] 商家登录后进入工作台，`initDb` 自动触发
- [x] 创建默认店铺记录（`shops`）
- [x] 写入店长到 `merchants`
- [x] 创建默认分类（混搭花束、玫瑰、向日葵、礼盒、求婚）

手动验证：

```bash
tcb fn invoke initDb -e <envId> -d '{}'
tcb fn invoke category -e <envId> -d '{"action":"publicList"}'
tcb fn invoke goods -e <envId> -d '{"action":"publicList","keyword":"","categoryId":""}'
tcb fn invoke wiki -e <envId> -d '{"action":"syncKindProfiles"}'
```

百科品类资料批量写回（部署 `wiki` 后）：

```bash
npm run sync:wiki-profiles
```

## 前端 API 封装

| 服务文件 | 说明 |
|----------|------|
| `src/services/cloud.ts` | 云初始化、callFunction 配置 |
| `src/services/auth.ts` | 登录、角色、跳转 |
| `src/services/shop.ts` | 店铺设置 |
| `src/services/staff.ts` | 人员管理 |
| `src/services/goods.ts` | 商品（商家 + 用户端） |
| `src/services/category.ts` | 分类（商家 + 用户端） |
| `src/services/initDb.ts` | 数据库初始化 |

---

## 补充（2026-06 文档整理，与 README 云函数树对齐）

> 本节为**增补**，不替代上文；上文表格仍保留作历史参考。完整结构树见 [README.md](../README.md#一云函数结构树)。

### 云函数增补表

| 云函数 | 用途 | 主要 action / 说明 |
|--------|------|---------------------|
| `address` | 顾客收货地址（按 OpenID） | `list`、`replaceAll` |
| `favorite` | 顾客收藏 | `list`、`add`、`remove`、`check` |
| `map` | 地图 / 选点辅助 | 地理相关（地址场景） |
| `seedDemo` | 演示数据写入 | 开发 / 演示用 |

### `goods` 增补 action（商家端）

- `batchRemove` — 批量删除
- `batchUpdate` — 批量更新（上下架、推荐等）
- `stockIn` — 批量增加可售数
- `publicImage` — 顾客端图片代理（仅创建者可读存储）

### 集合增补

- `user_addresses` — 顾客收货地址
- `favorites` — 顾客收藏记录

### 前端服务增补

- `src/services/address.ts` — 地址云 API
- `src/services/favorite.ts` — 收藏
- `src/services/order.ts` — 订单
- `src/services/wiki.ts` — 百科
- `src/services/map.ts` — 地图
- `src/services/goodsLiveSync.ts` — 商品热字段轮询同步

