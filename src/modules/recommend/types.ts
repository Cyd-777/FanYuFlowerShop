/**
 * 自选花束与导购模块 · 类型定义
 * @see docs/自选花束与导购策略.md
 */

/** 推荐模式：'guide' = 导购（用户不知买什么），'self_select' = 自选（用户想自己挑花材） */
export type RecommendMode = 'guide' | 'self_select'

/** 导购输入 — 短表单回答 */
export interface GuideInput {
  /** 送谁 */
  recipient?: string
  /** 场合 */
  occasion?: string
  /** 预算 */
  budget?: number
  /** 是否倾向成品花束 */
  preferReadyMade?: boolean
}

/** 自选输入 */
export interface SelfSelectInput {
  /** 主花品种名（可选，空 = 无目标） */
  mainFlower?: string
  /** 主花对应的 wiki kind id */
  wikiKindId?: string
}

export type RecommendInput =
  | { mode: 'guide'; data: GuideInput }
  | { mode: 'self_select'; data: SelfSelectInput }

export type FlowerCategory = 'main' | 'accent' | 'foliage' | 'filler'

export interface FlowerItem {
  id: string
  name: string
  category: FlowerCategory
  wikiKindId?: string
  wikiVarietyId?: string
  price?: number
  imageUrl?: string
  /** 推荐理由 */
  reason?: string
}

export interface BouquetItem {
  id: string
  name: string
  price: number
  imageUrl?: string
  /** true = 成品花束, false = 自选搭配方案 */
  isReadyMade: boolean
  flowers?: FlowerItem[]
}

export interface RecommendResult {
  /** 成品花束推荐 */
  bouquets: BouquetItem[]
  /** 花材搭配方案 */
  flowerSuggestions: FlowerItem[]
}
