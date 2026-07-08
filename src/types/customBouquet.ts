import type { CategoryCustomRole } from './category'

export type CustomBouquetFlowerCategory =
  | 'self_select_main'
  | 'self_select_accent'
  | 'self_select_foliage'
  | 'self_select_filler'

export const FLOWER_CATEGORIES: CustomBouquetFlowerCategory[] = [
  'self_select_main',
  'self_select_accent',
  'self_select_foliage',
  'self_select_filler',
]

export const FLOWER_CATEGORY_META: Record<
  CustomBouquetFlowerCategory,
  {
    label: string
    sectionTitle: string
    emptyTip: string
    pickTip: string
  }
> = {
  self_select_main: {
    label: '主花',
    sectionTitle: '主花（必选）',
    emptyTip: '尚未选择主花',
    pickTip: '选择主花作为花束主角',
  },
  self_select_accent: {
    label: '点缀花',
    sectionTitle: '点缀花（选填）',
    emptyTip: '尚未选择点缀花',
    pickTip: '选择点缀花丰富层次',
  },
  self_select_foliage: {
    label: '配叶',
    sectionTitle: '配叶（选填）',
    emptyTip: '尚未选择配叶',
    pickTip: '选择配叶衬托主花',
  },
  self_select_filler: {
    label: '填充花',
    sectionTitle: '填充花（选填）',
    emptyTip: '尚未选择填充花',
    pickTip: '选择填充花完善花束',
  },
}

export interface CustomBouquetGoodsItem {
  goodsId: string
  name: string
  price: number
  unit: string
  image: string
  category?: CustomBouquetFlowerCategory
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
