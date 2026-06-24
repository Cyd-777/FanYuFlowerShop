# 梵宇花店小程序

微信花店小程序，包含 **顾客端（A 端）** 与 **商家端（B 端）**。技术栈：Taro 4 + Vue 3 + NutUI + 微信云开发。

> **版本**：当前 **0.1.x**（`package.json` 为 `0.1.4`）；**推进目标** [0.2.0](docs/versions/0.2.0.md)（三环闭环，必做项完成后才改号）。详见 [docs/versions/README.md](docs/versions/README.md)。

---

## 一、云函数结构树

云函数根目录：`cloudfunctions/`（部署前可执行 `npm run sync:cloud` 同步公共模块）

```
cloudfunctions/
├── common/                 # 公共模块源码（同步到各函数下的 common/）
│   ├── cacheMeta.js        # 缓存版本号 bump
│   └── fileUrls.js         # 云存储 fileID → 临时 HTTPS 链接
│
├── login/                  # 登录：微信/手机号、users + user_auth 账号体系
├── initDb/                 # 初始化：默认店铺、店长、默认分类（工作台首次进入触发）
├── meta/                   # 元数据：各模块缓存版本号；批量换图片链接
│
├── shop/                   # 店铺设置：店名、电话、Banner、营业信息等
├── staff/                  # 人员管理：店长 / 管理员 / 员工
│
├── category/               # 商品分类：商家 CRUD；顾客 publicList
├── goods/                  # 商品：商家 CRUD / 批量 / 进货加库存；顾客 publicList / publicGet / 图片代理
├── flower/                 # 花卉库：品类（百合、牡丹）与品种（白百合、黄天霸）
├── favorite/               # 顾客收藏：按 OpenID 增删查
│
├── order/                  # 订单：创建、列表、详情、改状态、扣/回滚可售数、工作台统计
├── address/                # 收货地址：按 OpenID 列表与全量替换（微信地址导入）
│
├── wiki/                   # 花卉百科：图鉴 / 养殖 / 花语；publicList / publicGet / publicMatch
├── map/                    # 地图辅助：选点、地理相关（地址场景）
│
└── seedDemo/               # 演示数据种子（开发 / 演示用，非日常业务）
```

### 云函数 ↔ 数据库集合（速查）

- `shop` — `shops`
- `staff` / `login` / `initDb` — `merchants`、`users`、`user_auth`、`sms_codes`
- `category` — `categories`
- `goods` — `goods`
- `flower` — `flower_kinds`、`flower_varieties`
- `wiki` — `flower_wiki`
- `order` — `orders`
- `address` — `user_addresses`
- `favorite` — `favorites`（及关联商品换链）
- `meta` — `cache_meta`

集合字段、action 明细、权限白名单见 [docs/cloud.md](docs/cloud.md)。

---

## 二、页面结构树

路由注册见 `src/app.config.ts`。路径写法：`pages/…` 为主包，`pagesCustomer/…`、`pagesMerchant/…` 为分包。

### 2.1 主包（TabBar + 登录）

主包页面 **不使用 NutUI**（控制主包体积），见 [docs/architecture.md](docs/architecture.md)。

```
src/pages/
├── login/index           # 登录页：微信授权登录 / 手机号验证码登录（并列）
├── home/index            # 首页 Tab：推荐商品、分类入口、主题 Banner
├── category/index        # 商城 Tab：按分类浏览商品列表
├── wiki/index            # 百科 Tab：花卉智库列表（原生 UI）
├── cart/index            # 购物车 Tab：勾选、改数量、去结算
└── mine/index            # 我的 Tab：身份、入口（商家工作台、订单、收藏等）
```

### 2.2 顾客分包 `pagesCustomer/`

使用 NutUI，承载顾客侧非 Tab 业务页。

```
src/pagesCustomer/
├── goods/
│   ├── list              # 商品列表（分类 / 搜索进入）
│   └── detail            # 商品详情：轮播图、加购、收藏、百科卡片
├── customize/
│   ├── index             # 定制花束入口
│   ├── pick              # 选配花材
│   └── preview           # 定制预览与加入购物车
├── order/
│   ├── confirm           # 下单确认：地址、备注、提交订单
│   ├── list              # 我的订单列表
│   └── detail            # 订单详情：状态步骤、取消（待处理）
├── address/
│   ├── list              # 收货地址列表（含从微信导入）
│   └── edit              # 编辑 / 新增地址
├── favorite/
│   └── index             # 我的收藏
├── member/               # 会员相关（骨架 / 待完善）
│   ├── index             # 会员中心
│   ├── points            # 积分
│   ├── level             # 等级
│   └── signin            # 签到
├── wiki/
│   └── detail            # 百科详情
├── other/
│   └── index             # 其它入口 / 占位
└── theme/
    └── index             # 主题预览（代码存在；是否在 app.config 注册以实际配置为准）
```

### 2.3 商家分包 `pagesMerchant/`

商家从「我的 → 商家工作台」进入。

```
src/pagesMerchant/
├── dashboard/
│   └── index             # 工作台：快捷入口、订单统计、预览顾客端、initDb
├── goods/
│   ├── list              # 商品管理列表：筛选、口语搜索、批量操作
│   ├── edit              # 新建 / 编辑商品：图、价、可售数、推荐、花卉选品
│   ├── stock-in          # 批量增加可售数（进货单式录入）
│   └── stock-in-import   # 从进货单导入批量加库存
├── category/
│   ├── list              # 分类管理列表
│   └── edit              # 分类编辑
├── flower/
│   └── picker            # 花卉库选择器（写入商品的种类 / 品种）
├── order/
│   ├── list              # 商家订单列表
│   └── detail            # 订单详情：接单、完成、步骤条
├── verify/
│   └── index             # 扫码核销（后续阶段）
├── staff/
│   ├── index             # 人员列表
│   └── detail            # 人员详情 / 角色
└── shop/
    ├── setting           # 店铺基础设置
    ├── sales-strategy/   # 销售策略（折扣 / 陈列相关）
    │   ├── index
    │   └── edit
    └── goods-picker      # 策略选品：从商品库勾选
```

### 2.4 页面 ↔ 业务模块（速查）

- **商品** — 浏览 → 加购 → 购物车（至点击「结算」前）；详见 [docs/goods.md](docs/goods.md)
- **订单** — 确认页填单及之后；详见 [docs/order.md](docs/order.md)

---

## 三、项目文件结构树

仓库根目录概览（`node_modules/`、`dist/` 为生成目录，不展开）。

```
FanYuFlowerShop/
├── cloudfunctions/         # 云函数（见上一节结构树）
├── cloud/
│   └── database/           # 数据库示例 JSON（shops、goods、merchants 等）
├── config/                 # Taro 构建配置（dev / prod、NutUI 按需、分包）
├── docs/                   # 项目文档（专题说明；主索引即本 README + 文档规划）
├── images/                 # 静态资源（如 Tab 图标源图）
├── scripts/                # 构建脚本：主包体积检查、云函数部署、Tab 图标同步等
├── types/                  # 全局 TS 类型补充
├── project.config.json     # 微信开发者工具：miniprogramRoot → dist/
│
└── src/                    # 小程序源码
    ├── app.config.ts       # 页面路由、TabBar、分包、权限声明
    ├── app.ts / app.less   # 应用入口与全局样式
    │
    ├── pages/              # 主包页面（登录 + 5 个 Tab）
    ├── pagesCustomer/      # 顾客分包页面
    ├── pagesMerchant/      # 商家分包页面
    │
    ├── components/         # 跨页面公共组件
    │   ├── GoodsImage.vue          # 商品图（含云 fileID 本地代理）
    │   ├── GoodsSalesTagRow.vue    # 名称下方销售标签行
    │   ├── GoodsSoldOutBadge.vue   # 图片角标：售罄 / 即将售罄（顾客端）
    │   ├── GoodsCardSkeleton.vue   # 商品卡片骨架屏
    │   ├── OrderStatusSteps.vue    # 订单状态步骤条
    │   └── …
    │
    ├── composables/        # 组合式逻辑（usePublicGoods、useMerchantGoods 等）
    ├── services/           # 云 API 封装（goods、order、auth、address…）
    ├── stores/             # Pinia：cart、user、shop
    ├── types/              # 业务 TS 类型（goods、order、goodsBatch、stockIn…）
    ├── utils/              # 工具：缓存、标签、搜索、可售状态等
    │   └── cache/          # 本地 SWR 缓存（storage、meta、loadWithCache）
    │
    ├── data/               # 数据层（加载调度、Repository、按页注册）
    │   ├── pages/          # 各页面的数据加载 / 刷新策略
    │   ├── repository/     # 按领域封装的数据仓库
    │   └── scheduler/      # 后台缓存同步调度
    │
    ├── config/
    │   └── env.ts          # 云环境 ID 等环境变量
    └── styles/             # 全局 Less 变量与混入
```

---

## 四、文档索引

完整分类、过时项标注与后续整理建议见 **[docs/文档规划.md](docs/文档规划.md)**。

### 4.1 入门与运维

- [docs/setup.md](docs/setup.md) — 环境要求、首次配置、日常编译、云函数部署命令与清单。
- [docs/cloud.md](docs/cloud.md) — 云函数 action、数据库集合字段、云存储读法、店长白名单与 initDb 流程。

### 4.2 架构与技术

- [docs/architecture.md](docs/architecture.md) — 主包 / 分包分工、NutUI 使用规范、主包体积约束与构建检查。
- [docs/app-nav-bar.md](docs/app-nav-bar.md) — 自定义 Head（`AppNavBar`）API：overlay / spacer 模式、尺寸公式、路由配置、`AppIcon` base64 图标与新页接入。
- [docs/data-loading.md](docs/data-loading.md) — 数据加载目标架构：SWR、Repository、调度队列、**§4.3 静态资源 / Base64 图标**与分阶段落地清单。
- [docs/cache.md](docs/cache.md) — 已实现的本地缓存与 meta 版本号策略、模块接入进度与运维项。

### 4.3 业务功能

- [docs/features.md](docs/features.md) — 全项目功能总览、模块进度勾选、页面路由速查与建议推进顺序。
- [docs/goods.md](docs/goods.md) — **商品模块**边界：商家 CRUD / 分类 / 花卉库、顾客浏览加购购物车。
- [docs/order.md](docs/order.md) — **订单模块**边界：确认页、创建订单、列表详情、商家履约与库存扣减。

### 4.4 规划与进度（历史 + 路线图）

- [docs/功能实施策略.md](docs/功能实施策略.md) — **跨模块实施策略**与 **§7 十六段原话归档**（智库、AI、加载、OA、支付过渡等）。
- [docs/bugs.md](docs/bugs.md) — **重大代码缺陷**台账（根因、修法、复发对照）。
- [docs/ux-improvements.md](docs/ux-improvements.md) — **体验优化**与策略调整台账（非 bug）。
- [docs/closed-loop-plan.md](docs/closed-loop-plan.md) — **基础三环闭环**分步计划（商品维护 → 顾客下单 → 商家处理）；步骤 1–6 已完成记录。
- [docs/post-closed-loop-branches.md](docs/post-closed-loop-branches.md) — 闭环之上的 Git 功能分支地图（Issue #1：会员、批处理、配送方式等）。
- [docs/👥-feature-layers.md](docs/👥-feature-layers.md) — **你 ↔ AI 协作用**功能分层清单；可随手改标记，与专题文档互补。

### 4.5 版本记录

- [docs/versions/README.md](docs/versions/README.md) — 当前 0.1.x vs 推进目标 0.2.0 的关系说明
- [docs/versions/0.1.0.md](docs/versions/0.1.0.md) — **当前 0.1.x 版本线**（能力与范围）
- [docs/versions/0.2.0.md](docs/versions/0.2.0.md) — **发版目标**：推进到 0.2.0 的必做项（非当前版本号）
- [docs/versions/0.3.0.md](docs/versions/0.3.0.md) — **更后目标**：会员 / 优惠券

---

## 五、快速开始

```bash
npm install
npm run build:weapp    # 编译 → dist/
npm run dev:weapp      # 监听模式
```

用微信开发者工具打开**仓库根目录**（`miniprogramRoot` 指向 `dist/`）。

- `npm run sync:cloud` — 同步云函数公共模块
- `npm run deploy:cloud` — 部署全部云函数（需 `tcb login`）

云环境 ID：`src/config/env.ts` 中的 `CLOUD_ENV_ID`。

---

## 六、版本

- **当前**：**0.1.x**（`package.json` 为 `0.1.4`）
- **推进目标**：[docs/versions/0.2.0.md](docs/versions/0.2.0.md)（三环闭环；必做项完成后才改号为 0.2.0）
- **更后**：[docs/versions/0.3.0.md](docs/versions/0.3.0.md)（会员 / 优惠券）
- **说明**：[docs/versions/README.md](docs/versions/README.md)（当前 vs 目标）
- **0.1.x 范围**：[docs/versions/0.1.0.md](docs/versions/0.1.0.md)
