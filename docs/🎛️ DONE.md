# 工作归档

> 自 [🎛️ CURRENT.md](./🎛️%20CURRENT.md) 移出 · 已完成步骤与已验收项目  
> 当前面板只保留**未确定完成**的工作

---

## 代码质量与模块封装

`2026-07-06/07` · **全部完成**

共 12 个模块 + 2 项 CI 检查；迭代 1–4 分批次封装，每模块 `@/modules/{name}` 公开 API + API 文档。

- ~~**① 人员管理**~~ — `@/modules/staff` + API 文档
- ~~**类 OA 通知（迭代1）**~~ — `@/modules/notify` + API 文档
- ~~**收藏（迭代1）**~~ — `@/modules/favorite` + API 文档
- ~~**启动授权（迭代2）**~~ — `@/modules/auth` + API 文档
- ~~**② 销售策略**~~ — `@/modules/salesStrategy` + API 文档
- ~~**③ 店铺设置**~~ — `@/modules/shop` 读 API + API 文档
- ~~**④ 素材管理**~~ — `@/modules/asset` + API 文档
- ~~**⑤ 可售数与进货**~~ — `@/modules/warehouse` + API 文档
- ~~**⑥ 分类管理**~~ — `@/modules/category` + API 文档
- ~~**⑧ 搜索（迭代3）**~~ — `@/modules/search` + API 文档
- ~~**花卉目录读（迭代3）**~~ — `@/modules/flower` + API 文档
- ~~**⑨ 智库读路径（迭代4）**~~ — `@/modules/wiki` + API 文档
- ~~**⑩ 会员**~~ — `@/modules/member` + API 文档
- ~~**地址**~~ — `@/modules/address` + API 文档
- ~~**购物车**~~ — `@/modules/cart` + API 文档
- ~~**用户资料**~~ — `@/modules/userProfile` + API 文档
- ~~**商品**~~ — `@/modules/goods` + API 文档
- ~~**订单**~~ — `@/modules/order` + API 文档
- ~~**CI import 边界**~~ — `scripts/check-module-import-boundary.js` 接入 prebuild
- ~~**耦合/内聚检测**~~ — `scripts/check-coupling-cohesion.js` 接入 prebuild（5 项检测）

基线 `dd0ccea`（迭代1），收于 `8015715` + 后续修复 commit。

**工作历史**：
- 2026-07-06：`scripts/check-coupling-cohesion.js` 实现 5 项检测，接入 prebuild；修 login 页等违规
- 2026-07-06：迭代 4 — `@/modules/wiki` 读路径 + API 文档
- 2026-07-06：迭代 3 — `@/modules/search`、`@/modules/flower` + API 文档
- 2026-07-06：迭代 2 — `@/modules/auth`、`@/modules/shop` 读 API + 文档
- 2026-07-06：迭代 1 — `@/modules/notify`、`@/modules/favorite` + API 文档
- 2026-07-06：staff 范式 + 升级策略定稿；检查点 `4eac500`

---

## 耦合内聚优化

`2026-07-05` · **已实现待你测**

- **merchantGate** — 单一鉴权；含 `login` / `staff` / order/goods/category/wiki/flower/shop/seedDemo/initDb/notify
- **cacheInvalidation** — 云端矩阵 + 前端 `invalidateCacheEvent` + `prebuild:weapp` 跑 `check-cache-matrix.js`
- **flower-identity** — stable `wiki:kind:*` 分类 ID；`wikiFlowerGoods.ts` 兼容 legacy `wiki:玫瑰`
- **notify 边界** — bizNotifyEmit + subscribeMessage；**即时**订单/库存消息（**无**云端定时触发）
- **goods 拆文件** — handlers + shared.js 路由
- **文档** — [云开发模块-数据库](./云开发模块-数据库.md) 白名单指向 merchantGate
- 全文：[架构耦合内聚优化](./架构耦合内聚优化.md)

---

## 界面与体验优化 · 上传图片体积限制

`2026-07-01` · **已实现待你测**

- `uploadImageLimit.ts`：单张上限 10MB；选图过滤 + `wx.getFileInfo` 上传前校验
- 接入：商品编辑、素材库、Banner、头像保存、智库配图（经 `uploadAndProcessImage` / `uploadGoodsImage` / `saveUserProfile`）

---

## 分类管理优化 · 商品编辑 loadCategories 去模糊匹配

`2026-07-01` · **已实现待你测**

- 商品编辑页 `loadCategories` 删除 `item.name.includes(flowerKindName)` 兜底
- 支/组：`applyAutoCategoryForStemOrGroup` → `wiki:种类名`；束/件：无分类时默认选第一个可选分类，或用户手选

---

## 分类管理优化 · 百科品种列表动态读取

`2026-07-01` · **已实现待你测**

- 移除 `WIKI_KIND_SIDEBAR` 硬编码；`buildWikiKindSidebar(catalog)` 从 `flower_wiki` 按 `sort` 动态构建
- 百科 Tab 浏览流、折叠分组、花卉选择器目录统一走云端智库数据

---

## 分类管理优化 · CategoryForm.enabled 清理

`2026-07-01` · **已实现待你测**

- `CategoryForm` 去掉 `enabled`；商户编辑页启用态仅由 `goodsCount` 计算展示
- 云函数 `normalizeCategoryInput` 不再写入 `enabled`；`pickCategory` 不读库内 enabled
- `resolveCategoryEnabled` / 花束筛选统一为 `goodsCount > 0`

---

## 分类管理优化 · 分类列表请求优化

`2026-07-01` · **已实现待你测**

- `migrateAndSeedCategories` 改为版本门控 `ensureCategoryMigrated`（`app_meta.category.migrationVersion`）
- 日常 `list` / `publicList` 只读库；仅迁移版本落后或有写库变更时才 bump 缓存
- 需**重新部署 `category` 云函数**

---

## 分类管理优化 · 首页与商城 Tab 分类结构统一

`2026-07-01` · **已实现待你测**

- 商城去掉「全部」tab；鲜花/花束/物料（+ 自定义一阶）右侧统一长列表 + 分类文字锚点
- 顶部胶囊与锚点双向联动；>4 胶囊下拉展开
- 分类管理双层：一阶 tab / 二阶胶囊；编辑页升级/降级（`setNavTier`）
- 需部署 `category` 云函数后测升降级

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
- **后台切前台图片过期重载** — App onShow → `notifyAppResume` 计数器递增；`GoodsImage` watch `getAppResumeCount`，缓存过期时自动重新换链；`readCachedImageUrl` 返回空字符串触发异步重解析

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

---

## 门店自提 · 商家自配送 · 核销

`2026-06-30` · **验收通过**

- 订单模型新增 `deliveryMethod`、`verifyToken`、`ready`/`delivering` 状态 + `verifyPickup` action
- 下单页配送方式选择（配送上门 vs 门店自提；自提隐藏地址）
- 顾客端/商户端订单列表和详情增加配送方式标签（自提/配送）
- 自提订单 QR 码展示（canvas px 修复 + typeNumber 8，确保可扫）
- 商户核销页扫码调 `verifyPickup` 完成核销
- 商户详情页已备好 → 扫码核销按钮，核销后订单完成
- 商户端配送选择（备货完成后自配送/呼叫骑手）
- 进度条：取消核销或确认收货前不显示已完成
- 云函数：`accepted→preparing` 不再自动呼叫骑手，由商户手动选择
