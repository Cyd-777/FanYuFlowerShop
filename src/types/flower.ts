import type { GoodsUnit } from './goods'

export interface FlowerKind {
  _id: string
  name: string
  icon: string
  sort: number
  defaultUnit: GoodsUnit
  description: string
  enabled: boolean
}

export interface FlowerVariety {
  _id: string
  kindId: string
  name: string
  aliases: string[]
  defaultUnit: GoodsUnit | ''
  description: string
  sort: number
  enabled: boolean
}

export interface FlowerKindWithVarieties extends FlowerKind {
  varieties: FlowerVariety[]
}

export interface FlowerGoodsSuggestion {
  name: string
  unit: GoodsUnit
  description: string
  flowerKindId: string
  flowerKindName: string
  flowerVarietyId: string
  flowerVarietyName: string
}

export interface FlowerPickResult extends FlowerGoodsSuggestion {
  pickedAt: number
}

export const FLOWER_PICK_STORAGE_KEY = 'flower_pick_result'
