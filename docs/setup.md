# 环境与部署

## 前置要求

- [x] Node.js 18+
- [x] 微信开发者工具（稳定版）
- [x] 微信小程序 AppID
- [x] 微信云开发环境
- [ ] CloudBase CLI（`npm i -g @cloudbase/cli`，用于命令行部署云函数）

## 首次配置清单

- [x] 克隆 / 打开项目 `FanYuFlowerShop`
- [x] 执行 `npm install`
- [ ] 在 `src/config/env.ts` 确认 `CLOUD_ENV_ID` 与云开发控制台一致
- [ ] 微信开发者工具 → 导入项目 → 选择**仓库根目录**
- [ ] 开发者工具 → 云开发 → 开通云开发并绑定环境
- [ ] 部署全部云函数（见 [cloud.md](./cloud.md)）
- [ ] 执行 `npm run build:weapp` 后点击「编译」
- [ ] 使用店长账号登录，进入工作台验证

## 日常开发流程

- [ ] 修改 `src/` 下源码
- [ ] 运行 `npm run build:weapp`（或使用 `npm run dev:weapp` 监听）
- [ ] 微信开发者工具点击「编译」
- [ ] 若云函数有改动，重新部署对应云函数
- [ ] 若页面异常，尝试「工具 → 清除缓存 → 清除全部」后重新编译

## 云函数部署清单

环境 ID 示例：`cloud1-d4gygenkwbed9bb6c`（以 `src/config/env.ts` 为准）

```bash
cd cloudfunctions/login   && tcb fn deploy login   -e <envId> --force --yes
cd cloudfunctions/shop    && tcb fn deploy shop    -e <envId> --force --yes
cd cloudfunctions/staff   && tcb fn deploy staff   -e <envId> --force --yes
cd cloudfunctions/initDb  && tcb fn deploy initDb  -e <envId> --force --yes
cd cloudfunctions/goods   && tcb fn deploy goods   -e <envId> --force --yes
cd cloudfunctions/category && tcb fn deploy category -e <envId> --force --yes
cd cloudfunctions/flower  && tcb fn deploy flower  -e <envId> --force --yes
cd cloudfunctions/wiki    && tcb fn deploy wiki    -e <envId> --force --yes
cd cloudfunctions/meta    && tcb fn deploy meta    -e <envId> --force --yes
```

部署进度：

- [x] `login` — 登录、OpenID、角色识别
- [x] `shop` — 店铺设置
- [x] `staff` — 人员管理
- [x] `initDb` — 初始化 shops / merchants / categories
- [x] `goods` — 商品 CRUD + 用户端公开列表
- [x] `category` — 分类 CRUD + 用户端公开列表
- [x] `flower` — 花卉库（品类 / 品种）
- [x] `wiki` — 花卉百科智库（图鉴 / 养殖 / 花语）
- [x] `meta` — 缓存版本号（`cache_meta` 集合）

## 云开发控制台检查

- [ ] 云存储已开通（商品封面上传需要）
- [ ] 数据库集合可正常读写（首次由云函数自动创建）
- [ ] 云函数列表中 6 个函数均为「部署完成」

## 常见问题

### 提示「项目根目录下没有找到 app.json」

Taro 会把小程序产物编译到 `dist/`，**仓库根目录本身没有 `app.json`**，按下面顺序排查：

1. **先编译**：在项目根执行 `npm run dev:weapp`（开发）或 `npm run build:weapp`（上传前），等终端出现 `Compiled successfully`。
2. **打开正确目录**：微信开发者工具导入 **`FanYuFlowerShop` 仓库根目录**（含 `package.json`、`project.config.json` 的那一层），不要只打开 `dist/` 或 `src/`。
3. **确认产物存在**：根目录下应有 `dist/app.json`（`dist/` 在 `.gitignore` 中，克隆后需先编译才会生成）。
4. 仍报错时：开发者工具 → **关闭项目** → 重新导入根目录 → 「清缓存 → 全部」→ 再点编译。

### 上传时提示「无依赖文件」或 `.LICENSE.txt (packOptions.ignore)`

- **无依赖文件**：多为分包页面路径与编译产物不一致（例如旧的 `mine/other` 路由）。重新执行 `npm run build:weapp` 后，`dist/pagesCustomer/other/` 下应有完整的 `index.js / json / wxml / wxss`。
- **`.LICENSE.txt`**：Webpack 生成的许可证旁注文件，构建脚本会自动删除且已在 `packOptions.ignore` 中忽略，不影响上传，可忽略。

### 真机调试「代码包超过 2048KB」

- [ ] 确认采用 [方案 A](architecture.md)：主包 `src/pages/` **不使用 NutUI**
- [ ] **保留** `@tarojs/plugin-html`（分包 NutUI 需要；删了会交互失效）
- [ ] 执行 `npm run build:weapp`，查看 `[check-main]` 主包体积
- [ ] `wc -c dist/vendors.js` 正常约 12 万字节；若约 120 万说明主包误引 NutUI
- [ ] 商家/顾客页面在分包 `pagesMerchant` / `pagesCustomer`

### 页面白屏

- [ ] 确认已重新编译（不是只保存源码）
- [ ] 清除开发者工具缓存后重编译
- [ ] 查看 Console 红色报错
- [ ] 确认 `dist/` 目录存在且为最新构建

### 商品 / 分类不显示

- [ ] 确认 `goods`、`category` 云函数已部署
- [ ] 商家端先进入「分类管理」，确认有启用中的分类
- [ ] 商品编辑页选择分类并保存，且「立即上架」为开启
- [ ] 用户端进入首页 Tab（非仅停留在商家工作台）

### 云函数调用失败

- [ ] 检查 `CLOUD_ENV_ID` 是否与当前云环境一致
- [ ] 开发者工具云开发面板选中正确环境
- [ ] 运行 `npm run sync:cloud` 同步公共模块后，**重新上传部署**对应云函数（`goods`、`meta` 等）
- [ ] 若提示 `Cannot find module`，说明云端缺少 `common/cacheMeta.js`，务必先 sync 再部署
