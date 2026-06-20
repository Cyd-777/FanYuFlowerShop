# 梵宇花店小程序

微信花店小程序，包含 **顾客端（A 端）** 与 **商家端（B 端）**，基于 Taro 4 + Vue 3 + NutUI + 微信云开发。

## 文档目录

| 文档 | 说明 |
|------|------|
| [docs/setup.md](docs/setup.md) | 环境配置、编译、部署清单 |
| [docs/cloud.md](docs/cloud.md) | 云函数、数据库集合、云存储 |
| [docs/cache.md](docs/cache.md) | 本地缓存与版本号策略（已实现清单） |
| [docs/data-loading.md](docs/data-loading.md) | **数据加载方案**（分层、调度、三端、文献） |
| [docs/architecture.md](docs/architecture.md) | 方案 A：主包/分包与 NutUI 使用规范 |
| [docs/closed-loop-plan.md](docs/closed-loop-plan.md) | **基础三环闭环 · 分步实施计划** |
| [docs/post-closed-loop-branches.md](docs/post-closed-loop-branches.md) | **闭环之上 · Issue #1 功能分支地图** |
| [docs/features.md](docs/features.md) | 功能总览与模块索引 |
| [docs/goods.md](docs/goods.md) | **商品模块**（至提交订单前） |
| [docs/order.md](docs/order.md) | **订单模块**（提交订单后） |

## 技术栈

- **框架**：Taro 4.2 + Vue 3 + TypeScript
- **UI**：NutUI Taro 4.x
- **状态**：Pinia
- **后端**：微信云开发（云函数 + 云数据库 + 云存储）
- **云环境 ID**：见 `src/config/env.ts`

## 快速开始

```bash
# 安装依赖
npm install

# 编译微信小程序
npm run build:weapp

# 监听模式（开发）
npm run dev:weapp
```

编译产物在 `dist/`，请用微信开发者工具打开**项目根目录**（`project.config.json` 中 `miniprogramRoot` 指向 `dist/`）。

## 项目结构

```
FanYuFlowerShop/
├── cloudfunctions/     # 云函数
├── cloud/database/     # 数据库示例数据
├── src/
│   ├── pages/          # 主包（登录、TabBar 页面）
│   ├── pagesCustomer/  # 顾客端分包
│   ├── pagesMerchant/  # 商家端分包
│   ├── components/     # 公共组件
│   ├── services/       # 云 API 封装
│   ├── stores/         # Pinia 状态
│   └── config/         # 环境配置
├── dist/               # 编译输出（勿手动改）
└── docs/               # 项目文档
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run build:weapp` | 编译微信小程序 |
| `npm run dev:weapp` | 开发模式（watch） |
| `npm run sync:cloud` | 同步云函数公共模块（`common/` → 各函数目录） |
| `npm run deploy:cloud` | 一键部署全部云函数（需 `tcb login`） |
| `tcb fn deploy <name> -e <envId> --force --yes` | 部署单个云函数 |

## 版本

当前版本：`0.1.0`
