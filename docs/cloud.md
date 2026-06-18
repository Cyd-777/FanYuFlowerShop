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
| `goods` | 商品管理 | 商家：`list`, `get`, `add`, `update`, `remove`；用户端：`publicList`, `publicGet` |
| `category` | 分类管理 | 商家：`list`, `get`, `add`, `update`, `remove`；用户端：`publicList` |
| `flower` | 花卉库（品类 / 品种） | 商家：`list`, `search`, `getVariety` |
| `wiki` | 花卉百科智库 | 用户端：`publicList`, `publicGet`, `publicMatch` |
| `meta` | 缓存版本号 | 用户端：返回 `cache_meta.versions` |

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

- [x] 用途：商品封面图
- [x] 上传路径：`goods/{timestamp}_{random}.{ext}`
- [x] 前端通过 `getTempFileURL` 换取临时链接展示
- [ ] 需在云开发控制台开通云存储

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
