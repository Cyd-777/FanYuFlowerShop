import type { CategoryCustomRole } from './category'

export interface CustomBouquetGoodsItem {
  goodsId: string
  name: string
  price: number
  unit: string
  image: string
}

export interface CustomBouquetDraft {
  flowers: CustomBouquetGoodsItem[]
  packaging: CustomBouquetGoodsItem | null
  card: CustomBouquetGoodsItem | null
  cardMessage: string
}

export type CustomBouquetPickRole = Exclude<CategoryCustomRole, ''>

export const CUSTOM_BOUQUET_ROLE_LABELS: Record<CustomBouquetPickRole, string> = {
  flower: '花材',
  packaging: '包装',
  card: '贺卡',
}

export const CUSTOM_BOUQUET_DRAFT_KEY = 'custom_bouquet_draft'

export function createEmptyCustomBouquetDraft(): CustomBouquetDraft {
  return {
    flowers: [],
    packaging: null,
    card: null,
    cardMessage: '',
  }
}

export function calcCustomBouquetPrice(draft: CustomBouquetDraft): number {
  const flowerTotal = draft.flowers.reduce((sum, item) => sum + item.price, 0)
  const packagingTotal = draft.packaging?.price || 0
  const cardTotal = draft.card?.price || 0
  return flowerTotal + packagingTotal + cardTotal
}

export function isCustomBouquetReady(draft: CustomBouquetDraft): boolean {
  return draft.flowers.length > 0 && !!draft.packaging
}
