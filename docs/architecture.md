# 方案 A：主包瘦身 + 分包 NutUI

本项目采用 **NutUI 官方接入方式**，并用 **主包/分包分工** 控制微信主包 2048KB 限制。

## 原则

| 区域 | UI 方案 | 目录 |
|------|---------|------|
| **主包** | 原生 `view` + `@tap`，**禁止 NutUI** | `src/pages/` |
| **顾客分包** | NutUI + `plugin-html` | `src/pagesCustomer/` |
| **商家分包** | NutUI + `plugin-html` | `src/pagesMerchant/` |

## 主包页面（仅这些）

- `pages/login` — 登录
- `pages/home` — 首页 Tab
- `pages/category` — 分类 Tab
- `pages/wiki` — 花卉百科 Tab（智库列表，原生 UI）
- `pages/cart` — 购物车 Tab
- `pages/mine` — 我的 Tab

其余页面一律放在分包。

## 业务模块与目录（约定）

| 模块 | 边界 | 文档 |
|------|------|------|
| 商品 | 点击「结算」之前（浏览、加购、购物车） | [goods.md](./goods.md) |
| 订单 | 确认页填单及之后 | [order.md](./order.md) |

代码尚未按模块拆物理目录，页面仍按 `pages` / `pagesCustomer` / `pagesMerchant` 组织；新功能开发时以模块文档为准划分职责。

## NutUI 官方接入（已配置）

见 `config/index.ts`：

- [x] `@tarojs/plugin-html`（含 `pxtransformBlackList: [/nutui/i]`）
- [x] `NutUIResolver({ taro: true })` 按需引入
- [x] NutUI 组件 `designWidth: 375`，业务页 `750`
- [x] `lazyCodeLoading: 'requiredComponents'`
- [x] `prebundle.enable: false`（NutUI 兼容）

## 开发约束

### 主包 `src/pages/` 中禁止

- [ ] `nut-*` 组件（`nut-button`、`nut-cell` 等）
- [ ] 从 `@nutui/nutui-taro` 手动 import
- [ ] 新增非 Tab 业务页（应放分包）

### 主包推荐写法

```vue
<view class="btn" @tap="onSubmit">{{ submitText }}</view>
```

文案用 `const submitText = '提交'`，避免静态节点优化白屏。

### 分包中可用 NutUI

```vue
<nut-button type="primary" @click="save">保存</nut-button>
```

## 构建与检查

```bash
npm run build:weapp
```

`postbuild` 会自动：

1. 修补 `dist/project.config.json`
2. 删除 `.map` 文件
3. **检查主包体积**（`scripts/check-main-package.js`）

若 `vendors.js > 200KB` 或主包 `> 1600KB`，会输出警告。

## 真机上传前

- [ ] 使用 `npm run build:weapp`（不要用旧 dev 产物）
- [ ] 确认 `wc -c dist/vendors.js` 约 12 万字节量级
- [ ] 微信开发者工具清缓存后编译

## 相关文档

- [环境与部署](./setup.md)
- [业务模块：商品](./goods.md) · [订单](./order.md)
- [本地缓存](./cache.md)
- [Taro 官方 NutUI 接入](https://docs.taro.zone/docs/nutui)
