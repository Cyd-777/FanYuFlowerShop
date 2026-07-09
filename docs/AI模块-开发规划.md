# AI 模块 — 开发规划

> 关联：§7.2 AI 导管 · 工作面板 §AI 导管模块
> 创建：2026-07-09

---

## 当前状态总览

| 管线 | 状态 | 说明 |
|------|------|------|
| 云函数 `cloudfunctions/ai/index.js` | ✅ 已实现 | DeepSeek API，支持 guide/self_select 推荐 + 搜索解析 |
| 前端 client `src/modules/ai/` | ✅ 已实现 | `aiRecommend()` `aiParseSearch()` |
| 推荐模块 `src/modules/recommend/` | ✅ 已实现 | `recommend()` 封装规则引擎 + AI 兜底 |
| 导购推荐 → 导购结果页 | ✅ 已接通 | `pagesCustomer/guide/result.vue` 调 `recommend('guide')` |
| 语义搜索 → 顾客搜索框 | ✅ 已接通 | `searchWithAI()` → `customerSearch.ts` |
| 自选推荐 → 自定义花束页 | ❌ 未接通 | 见 §1 |
| 智库预填充 → 智库编辑页 | ❌ 未实现 | 见 §2 |
| 拍照入库 | ❌ 未实现 | 见 §3 |
| 隐式推荐 | ❌ 未实现 | 见 §4 |
| RAG 向量生成 | ❌ 未实现 | 见 §5 |

---

## §1 自选花束页接通 AI 搭配推荐

### 现状
- `recommend('self_select', { mainFlower, intent })` 已实现，无人调
- `customize/index.vue` 有花材分类区（主花/配花/配叶/填充），选主花后没有 AI 辅助

### 方案
1. 新增 `useSelfSelectRecommend(mainFlowerName)` composable
   - 监听主花名称变化 → 自动调 `recommend('self_select')`
   - 返回 `{ aiLoading, aiResult, aiError }`
2. 新增 `AISelfSelectSuggestions.vue` 展示组件
   - 显示 AI 推荐的配花列表（花材名 + 角色 + 推荐理由）
3. 在 `customize/index.vue` 主花分类区之后插入该组件

### 涉及文件
- 新建：`src/composables/useSelfSelectRecommend.ts`
- 新建：`src/components/AISelfSelectSuggestions.vue`
- 修改：`src/pagesCustomer/customize/index.vue`

### 预估工作量
小（≈1 小时），已有管线直接对接 UI

---

## §2 智库词条自动预填充

### 现状
- AI 云函数支持调用 DeepSeek 获取植物学信息
- 智库编辑页 `pagesMerchant/wiki/edit.vue` 有「智能粘贴」功能（从剪贴板结构化解析）
- 但没有"输入品种名 → AI 自动填字段"的按钮

### 方案
1. 在云函数新增 `action: 'wikiPrefill'`
   - 输入品种名 → DeepSeek → 返回品种描述/花语/养护要点等结构化字段
2. 前端增加「AI 自动填充」按钮
   - 调 `aiWikiPrefill(kindName)` → 回填到编辑表单

### 关联能力
- 智库标签体系（tags/occasions/aliases）已完备
- 同义词映射字典已存在

### 涉及文件
- 修改：`cloudfunctions/ai/index.js`（新增 action）
- 新建/修改：`src/modules/ai/client.ts`（新增 client 方法）
- 修改：`src/pagesMerchant/wiki/edit.vue`（新增按钮 + 回填逻辑）

### 预估工作量
中等（≈2 小时），需新增云函数 action + 表单对接

---

## §3 拍照入库

### 现状
- 新建商品页 `pagesMerchant/goods/edit.vue` 手动填写表单
- 无图片识别链路

### 方案
1. 云函数新增 `action: 'imageRecognition'`
   - 接收图片 URL → DeepSeek Vision API → 输出特征词
2. 前端拍照 → 上传云存储 → 调 AI 识别 → 预填商品表单

### 关联能力
- 需接入 DeepSeek Vision API（或多模态模型）
- 需上传图片临时 URL（云存储临时链接）
- 同义词映射字典匹配智库标签

### 涉及文件
- 修改：`cloudfunctions/ai/index.js`
- 新建：商品拍照入库页面或修改现有编辑页
- 修改：`src/modules/ai/`

### 预估工作量
中等（≈3 小时），新链路，需图片上传 + API 联调

---

## §4 隐式推荐

### 现状
- 商品详情页无"猜你喜欢"等推荐模块
- 无用户行为追踪

### 方案
1. 端侧：记录浏览/购买/收藏的商品 tags
2. 端侧：当前商品 tags × 用户历史 tags → 余弦相似度
3. 显示"看了这束花的人还看了"

### 关联能力
- 智库标签体系（tags）是匹配基础
- 需在端侧存储用户行为（localStorage）

### 涉及文件
- 新建：`src/composables/useImplicitRecommend.ts`
- 修改：商品详情页 `pagesCustomer/goods/detail.vue`
- 新建：`src/utils/userBehaviorTracker.ts`

### 预估工作量
中等（≈3 小时），纯端侧逻辑 + UI

---

## §5 RAG 向量生成

### 现状
- 无 embedding 模型
- 无向量数据库
- 有两个预备文件：`scripts/precompute-wiki-embeddings.py` `src/utils/wikiVectorSearch.ts`

### 方案
1. 用 DeepSeek Embedding API 将智库词条转向量
2. 存入云数据库的 `wiki_embeddings` 集合
3. 搜索时：用户 query → embedding → 余弦相似度匹配 → 返回最相关词条

### 关联能力
- 智库全文 `searchText` 字段已存在（云函数自动拼接）
- 需要 DeepSeek Embedding API 接入

### 涉及文件
- 新建/修改：`cloudfunctions/ai/index.js`（新增 embedding action）
- 修改：`scripts/precompute-wiki-embeddings.py`
- 修改：`src/utils/wikiVectorSearch.ts`
- 修改：`cloudfunctions/wiki/index.js`（索引同步）

### 预估工作量
较大（≈4 小时），需要向量模型选型 + 索引构建 + 搜索接口

---

## 建议开发顺序

| 序号 | 任务 | 优先级 | 理由 |
|------|------|--------|------|
| 1 | 自选推荐接通 | P0 | 管线已有，零基建投入，快速见效 |
| 2 | 智库预填充 | P1 | 商家高频操作，AI 明显提效 |
| 3 | 拍照入库 | P2 | 新链路，需图片 API + 上传 |
| 4 | 隐式推荐 | P3 | 纯端侧，但数据积累需时间 |
| 5 | RAG 向量 | P4 | 基建量大，最后做 |
