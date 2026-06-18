# 功能模块与进度

## 业务模块划分

| 模块 | 边界 | 文档 |
|------|------|------|
| **商品** | 浏览 → 加购 → 购物车（至点击「结算」前） | [goods.md](./goods.md) |
| **订单** | 确认页填单 → 提交订单 → 支付 → 列表/详情 → 商家处理 → 核销 | [order.md](./order.md) |

其他：登录/身份、店铺设置、人员、百科 Tab、会员/收藏等见下文；本地缓存见 [cache.md](./cache.md)。

---

## 总览

| 端 | 说明 |
|----|------|
| A 端（顾客） | TabBar：首页 / 分类 / 百科 / 购物车 / 我的 |
| B 端（商家） | 分包 `pagesMerchant`，从「我的 → 商家工作台」进入 |

---

## 身份与登录

- [x] 微信一键登录（`login` 云函数）
- [x] OpenID 获取与本地缓存
- [x] 商家 / 顾客角色识别
- [x] 登录后按角色跳转（商家 → 工作台，顾客 → 首页）
- [x] 我的身份码弹窗（OpenID 展示 + 复制）
- [ ] 身份码二维码生成

## 商家端 — 工作台

- [x] 快捷入口、预览顾客端、`initDb`
- [ ] 真实订单/收入统计（依赖订单模块）

## 商家端 — 店铺 / 人员

- [x] 店铺设置（`shop` 云函数）
- [x] 人员管理（`staff` 云函数）

## 商品模块（摘要）

详见 [goods.md](./goods.md)。

- [x] 分类与商品 CRUD、花卉选择、顾客浏览与缓存
- [x] 购物车 store、详情加购、购物车 Tab

## 订单模块（摘要）

> **当前搁置**：付款方式未确定，暂不实现确认页填单、提交订单、支付及商家订单处理。购物车「去结算」可保留跳转，待付款方案明确后再启动订单 P0。

详见 [order.md](./order.md)。

- [ ] （搁置）确认页、提交订单、列表/详情、支付、核销

## 花卉百科（独立 Tab）

- [x] 百科列表 Tab、详情、云函数 `wiki`
- [x] 商品详情链百科卡片

## 会员 / 收藏

- [ ] 会员中心、积分、签到（等级花卉命名已定义）
- [ ] 收藏（骨架；加购归商品模块）

---

## 页面路由速查

### 主包 TabBar

| 路径 | 页面 | 模块 |
|------|------|------|
| `pages/home/index` | 首页 | 商品 |
| `pages/category/index` | 分类 | 商品 |
| `pages/wiki/index` | 百科 | 百科 |
| `pages/cart/index` | 购物车 | 商品 |
| `pages/mine/index` | 我的 | — |

### 顾客分包 · 商品流

| 路径 | 模块 |
|------|------|
| `pagesCustomer/goods/list` | 商品 |
| `pagesCustomer/goods/detail` | 商品 |
| `pagesCustomer/order/confirm` | 订单 |

### 顾客分包 · 订单流

| 路径 | 模块 |
|------|------|
| `pagesCustomer/order/list` | 订单 |
| `pagesCustomer/order/detail` | 订单 |
| `pagesCustomer/address/*` | 订单（下单支撑） |

### 商家分包

| 路径 | 模块 |
|------|------|
| `pagesMerchant/category/*` | 商品 |
| `pagesMerchant/goods/*` | 商品 |
| `pagesMerchant/flower/picker` | 商品 |
| `pagesMerchant/order/*` | 订单 |
| `pagesMerchant/verify/index` | 订单 |

---

## 建议推进顺序

**当前重点：商品 P1 + 会员 + 百科**（订单模块搁置，见 [order.md](./order.md)）

1. **商品 P1**：下架/售罄 UI、下拉刷新、商家多图、收藏
2. **会员 P0**：`member` 云函数、积分/签到/等级读云端
3. **百科 P1**：商家端百科维护（或完善云库录入流程）、缓存 bump
4. **商品 P2**：列表分页、搜索扩展
5. **（待付款方案确定后）订单 P0**：确认页 → `order.create` → 列表/详情
