# 词条 Enrichment 分批计划

> 更新：2026-07-05 · 在 L2 结构 103/103、种类 commonIssues 20/20 已完成后的加厚阶段

## 三层内容（避免重复劳动）

| 层级 | 载体 | 状态 |
|------|------|------|
| **种类养护底稿** | `blocks.json` · `care.*.vase_base` | commonIssues / waterDepth / environment 已齐 |
| **品种 overlay** | `src/data/wiki/varieties/*.json` | L2 结构 + distinguishFrom + cultivar + featureRefs 已齐 |
| **标杆加厚** | 脚本源文件 + 少数 overlay override | 进行中 |

详情页养护「常见现象」**默认来自种类底稿**；overlay 的 `careVaseOverride.commonIssues` 仅用于**品种特例**（如弗洛伊德对水质敏感）。

---

## 批次一览

| 批次 | 主题 | 范围 | 篇数 | 状态 |
|------|------|------|------|------|
| **1** | 数据纠错 | 百合园艺群 block（亚/铁炮/重瓣） | 10 | ✅ 完成 |
| **2** | 图鉴年代 | 玫瑰 `introducedYear`（年代区间） | 24 | ✅ 完成 |
| **3** | 图鉴年代 | 百合 10 + 郁金香 7 + 康乃馨 6 | 23 | ✅ 完成 |
| **4** | 图鉴年代 | 绣球/芍药/菊/风信子/马蹄莲/向日葵/洋桔梗/满天星 + 小品 6 | 39 | ✅ 完成 |
| **5** | 品种养护 override | 标杆 ~15 篇专属 `commonIssues` 1–2 条 | 8+弗洛伊德 | ✅ 首批完成 |
| — | 不配 | 配叶 7 · 盆栽 6（不写 breeder / 推出年） | 13 | 跳过 |
| — | 暂缓 | Hero 配图 · 云库迁移 | — | 暂缓 |

### 年代字段原则

- 只写**年代区间**或**有行业共识的商用时期**（如「1990 年代」「2010 年代起」）
- 不写无依据的精确年份；标杆品种可写具体年（如莎拉 1906）
- 配叶 / 盆栽不写 `introducedYear`

### 批次 5 标杆候选（品种级 commonIssues）

弗洛伊德 · 无尽夏 · 黄天霸 · 西伯利亚 · 马斯特 · 王朝 · 莎拉 · 朱丽叶 · 卡布奇诺 · 卡罗拉 · 铁炮 · 重瓣百合 · 洋桔梗 · 绣球花手鞠 · 芍药

---

## 命令

```bash
npm run sync:wiki-care-common-issues   # 种类 commonIssues → blocks
npm run generate:wiki-all-l2             # 非玫瑰 overlay
node scripts/generate-wiki-rose-l2-overlays.js
npm run audit:wiki-catalog
```
