/**
 * 自选花束与导购模块 · 公开 API
 * @see docs/自选花束与导购策略.md
 */

export type {
  RecommendMode,
  GuideInput,
  SelfSelectInput,
  RecommendInput,
  FlowerCategory,
  FlowerItem,
  BouquetItem,
  RecommendResult,
} from './types'

export { recommend } from './rule-engine'
