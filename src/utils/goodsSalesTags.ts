import type { Goods } from '@/types/goods'
import { getSalesTypeOption, inferSalesType } from '@/types/goods'
import { getGoodsFlowerDisplayLabel } from '@/types/wiki'
import { LOW_STOCK_THRESHOLD } from '@/utils/goodsAvailability'
import { isNewListing } from '@/utils/goodsNewListing'

/** 销售信息标签样式（卡片名称下方一行） */
type GoodsSalesTagTone = 'new' | 'recommend' | 'category' | 'salesType'

interface GoodsSalesTagItem {
  key: string
  label: string
  tone: GoodsSalesTagTone
}

export type GoodsSalesTagSource = Pick<
  Goods,
  | 'onSale'
  | 'listedAt'
  | 'createdAt'
  | 'recommend'
  | 'categoryName'
  | 'salesType'
  | 'unit'
  | 'flowerKindId'
  | 'flowerKindName'
  | 'flowerVarietyId'
  | 'flowerVarietyName'
>

interface CollectGoodsSalesTagsOptions {
  /** 展示分类名（商户列表另有分类行时可关闭） */
  includeCategory?: boolean
  /** 展示销售类型（默认关闭，单位改在价格行展示） */
  includeSalesType?: boolean
}

/**
 * 首页推荐位展示的分类标签：优先鲜花种类（如百合、牡丹），缺失时回退后台分类名。
 */
export function getRecommendCategoryLabel(
  goods: Pick<Goods, 'flowerKindName' | 'flowerVarietyName' | 'categoryName'>,
) {
  const flower = getGoodsFlowerDisplayLabel(goods)
  if (flower) return flower
  return goods.categoryName?.trim() || ''
}

/**
 * 从商品字段汇总「销售信息标签」（名称下方一行）。
 *
 * - 新上架：createdAt，首次入库 4 天内且在售
 * - 推荐：recommend + 首页展示 → 显示种类/分类名（非「推荐」二字）
 * - 分类：非推荐商品或未作推荐标签时展示 categoryName
 * - 销售类型：salesType → 单支/成组/捆扎/其他
 *
 * 图片角标（叠在图片左上角）见 goodsAvailability。
 */
export function collectGoodsSalesTags(
  goods: GoodsSalesTagSource,
  options: CollectGoodsSalesTagsOptions = {},
): GoodsSalesTagItem[] {
  const { includeCategory = true, includeSalesType = false } = options
  const list: GoodsSalesTagItem[] = []

  if (isNewListing(goods)) {
    list.push({ key: 'new', label: '新上架', tone: 'new' })
  }

  const recommendLabel =
    goods.recommend && goods.onSale !== false ? getRecommendCategoryLabel(goods) : ''
  if (recommendLabel) {
    list.push({ key: 'recommend', label: recommendLabel, tone: 'recommend' })
  }

  if (includeCategory) {
    const category = goods.categoryName?.trim()
    if (category && category !== recommendLabel) {
      list.push({ key: 'category', label: category, tone: 'category' })
    }
  }

  if (includeSalesType) {
    const salesLabel = getSalesTypeOption(inferSalesType(goods)).label
    if (salesLabel) {
      list.push({ key: 'salesType', label: salesLabel, tone: 'salesType' })
    }
  }

  return list
}

/** 供文档 / 调试：当前系统支持的销售信息标签类型 */
const GOODS_SALES_TAG_CATALOG = [
  { key: 'new', label: '新上架', source: 'createdAt，首次入库 4 天内' },
  { key: 'recommend', label: '种类/分类名', source: 'recommend + 首页展示 → flowerKindName / categoryName' },
  { key: 'category', label: '分类', source: 'categoryName（与推荐标签去重）' },
  { key: 'salesType', label: '销售类型', source: 'salesType → 单支/成组/捆扎/其他' },
] as const

/** 图片角标（重点状态，叠在图片左上角） */
const GOODS_IMAGE_OVERLAY_TAG_CATALOG = [
  { key: 'soldOut', label: '售罄 / 售罄商品', source: 'stock <= 0 且在售' },
  { key: 'offSale', label: '下架商品', source: 'onSale === false（商户端）' },
  { key: 'lowStock', label: '即将售罄', source: `stock 1–${LOW_STOCK_THRESHOLD} 且在售（顾客端）` },
] as const
