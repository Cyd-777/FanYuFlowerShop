# 工作归档

> 自 [🎛️ CURRENT.md](./🎛️%20CURRENT.md) 移出 · 已完成步骤与已验收项目  
> 当前面板只保留**未确定完成**的工作

---

## 页面滚动吸顶

`2026-06-17` · 增补吸顶回归

- 搜索框吸顶（首页、分类、百科 Tab、顾客搜索页、商品列表页）
- 横向 tab 吸顶（首页分类横滑条、百科品类 Tag；分类页左侧 tab 为 fixed 分栏，不随右侧商品列表滚动）
- `usePageSticky` / `useOverlayStickySearch`，页面级 `.page-sticky-search` / `.page-sticky-tabs`
- 横向 Tab `:scroll-x="true"`、`useScrollXTrack`；百科两行 Tag +「全部」
- 吸顶态 statusBar 遮罩、胶囊 `max-width`、Tab 间距修复
- 百科 AppNavBar spacer + `barVisible` 藏 Head；阈值重测 + rect 双判定
- **吸顶回归（体验版）** — 去掉 scroll/rect 双通道，改 scrollTop 单一滞回（进入 −2px / 退出 −24px），消除抖动
- **搜索条与 Tab 1px 缝** — 吸顶后 Tab `sticky-top` 上移 1px 重叠；百科 Tab 吸顶底色与搜索条对齐

---

## 仓储管理优化

`2026-06-17`

- **批量管理** — 未选中时底部批量操作置灰；「全选当前」改 `view`+`@tap`（修复 `text`/`@click` 不触发）
- 批量管理与筛选互斥（点一个自动关闭另一个）

---

## 登录安全（阶段 A）

`2026-06-17`

- 客户端只存 `userId`，不再存 openid
- `login` 响应只回 `userId` + 资料
- `login` 云函数已部署（`npm run sync:cloud` 后上传）；双账号重登，C/B 端权限正常

---

## 搜索×智库 / 自定义 Head

`2026-06-17`

- 自定义 Head（搜索模态内置；Tab 页隐藏底栏）
- 搜索点击 → 全屏白底模态
- 智库详情各字段固定槽位展示（图鉴 / 养殖 / 花语组件）
- 云函数 `wiki` 智库 2.0 schema 与 publicSearch（本地已实现）
- 顾客端 unified search：`parseWikiSearchQuery` / `parseCustomerGoodsSearchQuery` + `searchCustomerUnified` + 联合搜索页
- **搜索使用点 · 顾客端** — 首页混合搜索、商城分类页混合搜索、智库 Tab 词条搜索（Tab 语境 + 预判）
- 商户端商品管理语义搜索（scope 短语 + 关键词，`merchantGoodsSearch`）
- 云开发部署 `wiki`（含 2.0 schema 变更）
- 云开发部署 `goods`（publicSearch 等联调相关变更）
- 商城分类页搜索（范围指引，基本可用）
- 首页搜索的复合预判（商品+百科合并 suggest，基础已有）
- **首页 / 分类 / 联合搜索页预判 v2** — 实时弹出；展示匹配商品行与百科行；问法补全（如「玫瑰怎么」→「玫瑰怎么养」）；按库内数据条件显示「百科」「商品」标签（仅商品 / 仅百科 / 双频道）
- 页内搜索触发条 + 模态内输入自动聚焦（页内非输入框）
- **智库 · 百科式问答 v1** — 语义词典 + answerSlots + 速答卡片（WikiAnswerCard）+ 词条 detailUrl；规则层，小模型暂缓
- 百科详情 **anchor 滚动定位**（速答跳转落点至对应段落并高亮）
- 商品详情 **WikiEntryPanel 内嵌词条内容**（图鉴 / 怎么养 / 花语 Tab，非入口卡片）
- **百科词条品类基础信息维护 v1** — `wikiKindProfiles`（玫瑰/牡丹/百合/康乃馨/向日葵：界门纲目科属 + 学名俗名）；`pickWiki` 品类 profile 优先；图鉴 Tab 展示「生物学分类」「名称」
- **百科词条批量写回 v2** — 扩充品类（郁金香、满天星、绣球、洋桔梗、非洲菊、马蹄莲、雏菊、混搭花束等 14 类）；`syncKindProfiles` 云函数 action + `npm run sync:wiki-profiles`；读路径 profile 合并覆盖错误正文
- **百科词条页容器对齐 wiki 2.0** — `WikiDetailContent` / `WikiDetailHero` 统一详情与内嵌；字段解析 `resolveWiki*`；Tab「怎么养」；分类学分行、careVase/careSoil/bloom 分块

---

## Issue #2（12 条）

`2026-06-17` · 增补 `2026-06-24`

- 我的页增加 Bug 反馈入口与提交指引
- 商品详情展示关联百科词条内容（WikiEntryPanel 内嵌，非仅入口卡片）
- **提示分级** — 轻量反馈改顶部提示条（自定义 fixed 条 + `showToast`）；重要提示模态 + 确认（NutDialog）；全项目 `wx.showToast` 已迁移
- **顶部提示条位置** — 脱离 NutNotify 状态栏位，子页贴 AppNavBar 下沿（`getNotifyBarTopOffsetPx`）；首页/我的贴 statusBar 下
- **主题 Banner 多图** — 主题编辑页多图上传 + 首页 NutSwiper 轮播（本地已实现；待部署 `shop` 云函数并真机验收）
- **订单列表 Tab 白条** — 顾客/商户订单列表用 `OrderListStatusTabs` 替换空 `nut-tabs` 内容区
- **分类商品列表搜索位** — `pagesCustomer/goods/list` 去掉 spacer 页重复的 `page-nav-overlay-safe`；商城 Tab 分栏首帧兜底含 Head 高
- **花材选择器对齐智库** — 商品编辑花卉 picker 以 `flower_wiki` 为数据源，侧栏顺序与百科 Tab 一致（`buildFlowerCatalogFromWiki`）

---

## 项目策略参考（16 段）

`2026-06-17`

- 7.4 图片与性能 — 小图标 Base64 进包；商品图云端懒加载；不用 SVG
- 7.10 购物车 — Tab 保留 Cart；二级页「行囊」半屏（非去掉 Cart Tab）

---

## 人员邀请链接

`2026-06-17`

- 移除身份码，改为邀请链接（`staff` 已部署，生成正常）
- **邀请码加人（未发布可用）** — 店长生成 6 位邀请码发给对方；对方「我的」→「输入邀请码」自行验证并接受；`pages/invite/join`；登录后回跳支持 `code:` 前缀；体验版已验收
