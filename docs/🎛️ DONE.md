# 工作归档

> 自 [🎛️ CURRENT.md](./🎛️%20CURRENT.md) 移出 · 已完成步骤与已验收项目  
> 当前面板只保留**未确定完成**的工作

---

## 页面滚动吸顶（二期）

`2026-06-28` · **验收通过**

- `useStickyStack` composable: `order[]` 栈式吸顶、元素绑定、触发/释放
- 首页（flow-sticky）与百科（整页滚 + CSS sticky）统一，滚动路径完全一致
- 百科 Head 改整页滚、`overlay` 模式、padding-top 适配
- 搜索框胶囊让位、多吸顶元素紧挨叠放
- 下拉刷新与吸顶冲突消除（shared scrollTop 拆分）
- 体验版验收通过

---

## 仓储管理优化

`2026-06-29` · **验收通过**

- 商品管理页搜索+工具栏吸顶、筛选模态 UX、人员页/核销页/设置页按钮宽度修复
- 出库与批量出库、仓储历史记录与查看
- 订单出库写入 `warehouse_ledger` 统一流水
- 素材管理（上传、多分辨率生成、重命名、删除、批量上传、智库配图 Tab）
- 仓储历史按批次显示（时间轴、grid/flex 布局、人员头像/订单号、入库/出库标签）
- 云函数批号分组、测试数据生成与清理

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
- **批量出库** — 商品列表批量管理 → `stock-out` 计数器页 → `goods.stockOut`；可售数不足服务端拦截
- **仓储流水** — 云库 `warehouse_ledger`（`stock_in` / `stock_out`、操作人、前后库存）；入库 `stockIn` 同步写入

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

## 加载策略（Banner / 进页即见 / 缓存）

`2026-06-17` · **体验版暂且通过** · 自 CURRENT 暂时归档 · **Banner 空白问题 2026-06-17 结案**

- **进页即见** + 全局加载权重（[data-loading §4.0](./data-loading.md#40-进页即见--定义定稿)）；预取强度 **拉满**（§4.0.6）
- P0 链：`onLaunch` / home `ensure` 100→110→120→200；Tab/路由 P0-Sync；Banner `img:banner`（110）
- P0 后 `startAggressivePrefetch` — goods:all、wiki:list、全 Tab P0、detail 队列、batch cover URL
- 下拉刷新 SWR（顶栏 loading 条 + 回弹后刷新）
- **Phase C** — `goods.publicList` cursor；`fetchAllPublicGoodsIndexPages` 流式 onUpdate；`GoodsImage` 同 URL 不 blank
- 云处理 preview/full 双档 URL（imageMogr2 零控制台配置）；详情 **首次** preview→full、**再次**直出 full；列表 nav preview 防占位闪
- Issue #1 SWR 深路径防闪 — 主线已覆盖，不再单独做；**Phase C 续**（滚动成组 + intersection）搁置，列表量上来再议
- ~~商家双上传 thumb~~ 已取消（同一 `coverImage` 分阶段清晰度）
- **Banner 顾客端不显示（Issue #2）** — 多轮体验版复测已无复现；根因倾向 **加载逻辑**（`ensure` 未 await `img:banner` 即展示），非 ACL；权重 110 为辅助。若复发：查 home ensure 链与 `img:banner` 缓存。

**复开条件**（非必做）：弱网/Banner 边缘 case 复现；列表规模上来再评估 Phase C 续  
**2026-06-26 已复开**：CURRENT **加载策略 · 图片加载**（商品封面 / preview-full / 懒加载，真机仍不达标）

---

## 加载策略 · 图片加载修复

`2026-06-28` · **用户验收通过**

- **Banner 缓存过期修复** — `isBannerUrlsEntryFresh` 判断移除，SWR 模式（先显示缓存，后台刷新）；`saveThemeConfig`/`setActiveTheme` 返回也带 `bannerImageUrls`；`@error` 重试机制
- **详情页缓存过期修复** — `buildPreviewDisplayUrls` 优先用商品自带 `coverImageUrl`/`imageUrls`，不再只看 90min 小缓存
- **GoodsImage 双层叠加** — 预览层（缩略图）始终显示 + 标准层 opacity 淡入，消除升级闪烁
- **列表仅缩略图** — 列表/卡片只传 `preview-src`，不触发升级，不闪
- **详情推入秒出** — swiper 容器加 `background-image`（CSS 背景在组件挂载前即可见）
- **图片预取** — `aggressivePrefetch` 和 `CacheSyncScheduler` 预取 goods detail 后同步 `wx.getImageInfo` 预热图片到微信缓存
- **WebP 转换** — 云函数内 `sharp` 缩放 + webp（部署安装依赖后生效；原生 JPG 方案亦可接受）
- **双图叠加（行业标准）** — preview（160px）→ standard（750px），详情秒出不白

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
