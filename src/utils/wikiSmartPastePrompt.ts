import type { WikiArticleEditForm } from '@/utils/wikiMerchantForm'
import {
  listGroupBlockOptions,
  listRegionBlockOptions,
  listTaxonomyBlockOptions,
  listTraitBlockOptions,
  WIKI_OCCASION_OPTIONS,
} from '@/utils/wikiBlockCatalog'
import { resolveTraitLabel } from '@/utils/wikiBlockRegistry'

export interface WikiSmartPastePromptInput {
  kindName: string
  varietyName: string
  plantForm?: WikiArticleEditForm['plantForm']
}

/** 供商家复制到大模型；输出须粘贴进「智能识别」文本框 */
export function buildWikiSmartPastePrompt(input: WikiSmartPastePromptInput): string {
  const kind = input.kindName.trim() || '（请先在表单填写种类）'
  const variety = input.varietyName.trim()
  const target = variety ? `${kind} · ${variety}` : `${kind}（种类级词条）`
  const formHint =
    input.plantForm === 'potted'
      ? '盆栽观赏'
      : input.plantForm === 'foliage'
        ? '配叶'
        : '鲜切花（瓶插零售）'

  const taxonomyHint =
    listTaxonomyBlockOptions()
      .filter((opt) => opt.label.includes(kind) || kind.includes(opt.label.slice(0, 2)))
      .slice(0, 3)
      .map((opt) => opt.label)
      .join('；') || '（介绍段写「科属」完整分类线，如 蔷薇科蔷薇属）'

  const groupLabels = listGroupBlockOptions()
    .slice(0, 12)
    .map((opt) => opt.label.split('（')[0])
    .filter(Boolean)
    .join('、')

  const regionLabels = listRegionBlockOptions()
    .map((opt) => opt.label)
    .join('、')

  const traitLabels = listTraitBlockOptions()
    .map((opt) => resolveTraitLabel(opt.id) || opt.label)
    .filter(Boolean)
    .slice(0, 24)
    .join('、')

  const occasions = WIKI_OCCASION_OPTIONS.join('、')

  return `# 角色
你是「梵宇花店」小程序智库编辑助手。请为下方目标撰写**词条草稿**，供商家粘贴到「智能识别」文本框后自动对照表单字段。

# 目标
- 种类：${kind}
- 品种：${variety || '（无，写种类级通用描述）'}
- 词条：${target}
- 视角：${formHint}；养护写**瓶插**，不要写成地栽/庭院百科。

# 输出硬性要求（违反则无法识别）
1. **只输出正文**，不要前言、不要解释、不要 Markdown 代码块、不要表格。
2. 必须按下面 **7 个章节标题** 依次输出，标题独占一行，格式为「## 标题」（二字标题必须与下列完全一致）：
   - ## 介绍
   - ## 图鉴
   - ## 花期
   - ## 养护
   - ## 花语
   - ## 易混
   - ## 搜索
3. 各章内用「字段名：内容」或自然段；**键名尽量使用下列中文标签**（冒号用全角或半角均可）。
4. 数字范围用 **7—10** 或 **7-10** 形式；花径写 **花径 8—12 cm**；瓶插天数写 **约 7—10 天**。
5. 英文品种名/俗名用中文括号或引号：如 Freud（弗洛伊德）、'Red Naomi'。
6. 不确定处写「约」「待核实」，勿编造具体公司/年份；可留空某字段但保留章节。
7. 全文 800—2000 字；花语、养护各至少 2 句；介绍至少 2 个自然段（段间空一行）。
8. **公共块映射**：图鉴/养护中下列词须从词表**原词**写入正文（系统映射为块 ID，商家对照后勾选应用，不要求输出 ID 字符串）。

# 各章必填字段（智能识别会对照这些键）

## 介绍
- 用 2—4 个自然段写品种背景、市场定位、切花特点（段间空一行）。
- 生物学分类：（须写入完整分类线，用于映射 taxonomy 块）${taxonomyHint}
- 可选行：学名：… / 俗名：… / 育种者：… / 推出年代：2018年 / 育种地：… / 命名说明：…

## 图鉴
- 园艺分类：（从下列择一词写入正文）${groupLabels}
- 主产区：（从下列择一词写入）${regionLabels}
- 花径：… cm / 瓣数：… / 色泽：… / 茎：… / 叶：… / 香气：…
- 特征 chip：（从下列选 2—4 个**标签原词**写入，可夹在形态描述句中）${traitLabels}

## 花期
- 瓶插天数：约 X—Y 天
- 花期说明：一句（如夏季略短、深水位更稳等）
- 土培花期：（可选，鲜切为主可写「以切花为主，土培略长」）

## 养护
- 养护底稿：（写种类中文名，如 ${kind}；用于映射 care 公共块）
- 第一句为养护摘要（12 字以上）。
- 换水：…（含频次）
- 修剪：斜剪… 或 修剪：…
- 水位：…（可写 1/3 瓶高 或 浸没 X cm）
- 另起行写 tips，每行以 **避免** / **注意** / **建议** / **勿** 开头（2—4 条）

## 花语
- 花语：一句核心寓意（4—80 字）
- 再用 1—2 个自然段写送花语境（段间空一行）
- 送花注意：…
- 适用场合：从下列选 2—5 个写入正文（须出现原词）${occasions}
- 色彩寓意：按「红色：…；粉色：…」格式写 1—3 行

## 易混
- 每行一条：**易混品种名—区别说明**（1—3 条；无则写「暂无」）

## 搜索
- 别称：别名1，别名2
- 标签：2—4 个短标签（可与特征词一致）

# 禁止
- 不要输出 JSON、YAML、HTML、链接、参考文献编号。
- 不要写「以上是」「希望对您有帮助」等对话套话。
- 不要用地栽施肥、整株修剪等不切花场景为主的内容。

# 请开始撰写：${target}`
}
