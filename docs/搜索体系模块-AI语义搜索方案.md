# 搜索体系 · AI 语义搜索方案

> **更新**：2026-07-08  
> **关联**：AI 导管模块 · 智库模块 · 搜索模块

---

## 架构

```
用户输入（口语/关键词）
    │
    ├── 短精确词（≤2字/品牌名/SKU）
    │   └── 直接走关键词搜索（现有逻辑，不改）
    │
    └── 长查询/口语化
        │
        ▼
      AI Query Parse（cloudfunctions/ai）
        │  口语 → 结构化搜索参数
        │  "送长辈的花，预算200"
        │  → { text: "康乃馨 百合",
        │      filters: { occasions: ["长辈"], priceMax: 200 },
        │      scope: "goods|wiki|auto",
        │      confidence: 0.85 }
        │
        ▼
      多路执行
        ├── 关键词路（现有 searchText/aliases AND 匹配）
        └── 条件路（occasions / tags / price 结构化筛选）
        │
        ▼
      结果融合 → 排序 → 输出
```

## 三个搜索面

| 搜索面 | AI 返回 scope | 匹配方式 |
|--------|--------------|---------|
| **商品搜索** | `goods` | 现有商品 haystack + 结构化条件 |
| **词条搜索** | `wiki` | 现有百科 haystack + 结构化条件 |
| **知识搜索** | `knowledge` | 意图匹配 → 返回问答片段 |

## AI Query Parse 输出格式

```typescript
interface AISearchParseResult {
  text: string              // 关键词（去口语化后）
  filters?: {
    occasions?: string[]    // 适用场合
    tags?: string[]         // 特征标签
    priceMin?: number
    priceMax?: number
    recipient?: string      // 送花对象
  }
  scope: 'goods' | 'wiki' | 'knowledge' | 'auto'
  confidence: number        // 0-1
  expandTerms?: string[]    // 扩展搜索词
}
```

## 预判

用户输入时实时显示预判建议按钮。AI 在输入阶段即产出候选项：

```
用户输入 "送" → 预判：[送长辈] [送女朋友] [送朋友]
用户输入 "玫" → 预判：[玫瑰] [玫瑰养护] [玫瑰 花语]
```

预判使用现有 suggest 引擎（前缀匹配），不变。

## 实现步骤

1. `cloudfunctions/ai` 新增 `aiParseSearch` action
2. 前端搜索入口调用 AI parse → 回退现有搜索
3. 结果展示：知识搜索走问答卡片，商品/词条走现有列表
