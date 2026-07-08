export type AiRecommendMode = 'guide' | 'self_select'

export interface GuideInput {
  occasion?: string
  recipient?: string
  budget?: string
}

export interface SelfSelectInput {
  mainFlower?: string
  intent?: string
}

export interface FlowerRecommendation {
  name: string
  description: string
  flowers: string
  priceRange: string
  reason: string
}

export interface CompanionFlower {
  name: string
  role: string
  reason: string
}

export interface GuideResult {
  recommendations: FlowerRecommendation[]
}

export interface SelfSelectResult {
  mainFlowerSuggestions?: FlowerRecommendation[]
  companionFlowers?: CompanionFlower[]
  tips?: string
}

export type AiRecommendResult = GuideResult | SelfSelectResult

export interface AISearchParseResult {
  text: string
  scope: 'goods' | 'wiki' | 'knowledge' | 'auto'
  confidence: number
  filters?: {
    occasions?: string[]
    tags?: string[]
    priceMax?: number
    recipient?: string
  }
  expandTerms?: string[]
  answerIntent?: string
}
