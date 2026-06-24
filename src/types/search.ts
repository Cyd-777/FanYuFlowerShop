import type { FlowerWikiListItem, WikiIntent, WikiTab } from '@/types/wiki'

/** 搜索使用场景（按页面切换词典与执行方式） */
export type SearchProfile = 'merchant-goods' | 'customer-goods' | 'wiki' | 'customer-unified'

/** 统一搜索预判条目 */
export type SearchSuggestionLayout = 'default' | 'dual-tag'

export interface SearchSuggestion {
  id: string
  label: string
  meta?: string
  /** dual-tag：一行关键词 + 右侧频道标签（由 channels 决定显示哪些） */
  layout?: SearchSuggestionLayout
  /** 该关键词在库中可搜到的频道；dual-tag 时控制显示「百科」「商品」 */
  channels?: Exclude<CustomerUnifiedSearchScope, 'all'>[]
}

export type CustomerUnifiedSearchScope = 'all' | 'wiki' | 'goods'

/** 顾客端商品结构化查询 */
export interface GoodsQuery {
  text?: string
  textTokens?: string[]
  categoryId?: string
  exactName?: boolean
  source?: 'user' | 'rules' | 'ai' | 'suggestion'
}

export type WikiQueryMode = 'list' | 'answer' | 'auto'

export interface WikiAnswerSubject {
  kindId: string
  varietyId?: string
  kindName: string
  varietyName?: string
  wikiId: string
}

/** 百科式问答短答（含跳转词条链接） */
export interface WikiAnswerSnippet {
  type: 'snippet'
  title: string
  answer: string
  note?: string
  intent: WikiIntent
  subject: WikiAnswerSubject
  detailUrl: string
  provenance: 'slot' | 'kind_aggregate'
  confidence: 'high' | 'medium' | 'low'
}

export interface WikiSearchResult {
  list: FlowerWikiListItem[]
  answer?: WikiAnswerSnippet | null
}

/** 智库结构化查询（搜索框 / 未来 AI 导管共用） */
export interface WikiQuery {
  /** 用户原始输入，展示用 */
  text?: string
  /** 归一化后的分词，AND 匹配 */
  textTokens?: string[]
  /** list=仅列表；answer=仅问答；auto=先尝试问答再列表 */
  mode?: WikiQueryMode
  /** 规则或 AI 解析出的意图 */
  intent?: WikiIntent
  /** 剥掉意图短语后的主体，如「玫瑰」 */
  subjectText?: string
  /** 当前百科 Tab，用于搜索加权 */
  tab?: WikiTab
  tags?: string[]
  kindId?: string
  varietyId?: string
  /** 来源：手输 / 规则 / AI / 识图 / 商品匹配 */
  source?: 'user' | 'rules' | 'ai' | 'vision' | 'match'
}
