import type { Goods, GoodsSalesType } from '@/types/goods'
import { GOODS_SALES_TYPE_OPTIONS, getSalesTypeOption, inferSalesType } from '@/types/goods'
import { getGoodsFlowerDisplayLabel } from '@/types/wiki'
import { isNewListing } from '@/utils/goodsNewListing'
import { getRecommendCategoryLabel } from '@/utils/goodsSalesTags'
import type {
  MerchantGoodsFilterState,
  MerchantShelfStatus,
  MerchantStockStatus,
} from '@/utils/goodsListFilter'
import { normalizeSearchQueryText } from '@/utils/searchQueryNormalize'

export type MerchantSearchMatchMode = 'auto' | 'exact'

export interface MerchantGoodsSearchContext {
  categories: Array<{ _id: string; name: string }>
  catalog: Goods[]
}

export type RecommendFilter = 'only' | 'exclude'

export interface ParsedMerchantSearchScope {
  priceMin?: number
  priceMax?: number
  stockMin?: number
  stockMax?: number
  shelfStatus?: MerchantShelfStatus
  stockStatus?: MerchantStockStatus
  recommend?: RecommendFilter
  newListingOnly?: boolean
  salesType?: GoodsSalesType
  categoryId?: string
  flowerKindId?: string
  flowerVarietyId?: string
}

export interface ParsedMerchantSearch {
  scope: ParsedMerchantSearchScope
  /** 剩余关键词，AND 匹配商品各字段 */
  textTokens: string[]
}

/** 口语填充词，解析后剔除，避免干扰 token */
const FILLER_WORDS =
  /(?:当前|现在|目前|所有|全部|哪些|有哪些|是什么|多少|几个|列出|列表|查询|搜索|查找|找|看看|显示|筛选|过滤|一下|请|帮我|给我|我要|想要|有没有|还有|以及|关于|相关|的|了|吗|呢|啊|呀|吧|嘛|么|？|\?|。)/g

const PRICE_RANGE =
  /(?:价格|售价|单价)?(?:在|为|是)?\s*(\d+(?:\.\d+)?)\s*(?:到|至|~|—|-)\s*(\d+(?:\.\d+)?)\s*(?:元|块|块钱)?/i
const PRICE_BETWEEN_SUFFIX =
  /(\d+(?:\.\d+)?)\s*(?:到|至|~|—|-)\s*(\d+(?:\.\d+)?)\s*(?:元|块|块钱)?\s*(?:之间|区间|范围)/i
const PRICE_BELOW =
  /(?:低于|少于|小于|不超过|不高于|<=?|under)\s*(\d+(?:\.\d+)?)\s*(?:元|块|块钱)?/i
const PRICE_ABOVE =
  /(?:高于|超过|大于|不少于|不低于|>=?|above)\s*(\d+(?:\.\d+)?)\s*(?:元|块|块钱)?/i
const PRICE_UNDER_SUFFIX = /(\d+(?:\.\d+)?)\s*(?:元|块|块钱)?\s*(?:以下|以内|之内|往下)/i
const PRICE_OVER_SUFFIX = /(\d+(?:\.\d+)?)\s*(?:元|块|块钱)?\s*(?:以上|起|往上)/i
const PRICE_EXACT = /(?:价格|售价|单价)\s*(?:是|为)?\s*(\d+(?:\.\d+)?)\s*(?:元|块|块钱)?/i

interface PhraseRule {
  /** 按长度从长到短匹配 */
  pattern: RegExp
  apply: (scope: ParsedMerchantSearchScope) => void
}

/** 长短语优先，避免「未推荐」被「推荐」误伤 */
const PHRASE_RULES: PhraseRule[] = [
  {
    pattern: /未在主页推荐|没在首页推荐|不在首页推荐|未上主页推荐|没有主页推荐/g,
    apply: (s) => { s.recommend = 'exclude' },
  },
  {
    pattern: /未推荐|非推荐|不是推荐|没推荐|不推荐|取消推荐|未设推荐/g,
    apply: (s) => { s.recommend = 'exclude' },
  },
  {
    pattern: /主页推荐|首页推荐|主页的推荐|首页的推荐|推荐位|设了推荐|已推荐|推荐商品|推荐中/g,
    apply: (s) => { s.recommend = 'only' },
  },
  {
    pattern: /有哪些推荐|有没有推荐|还有推荐|有推荐的|哪些是推荐/g,
    apply: (s) => { s.recommend = 'only' },
  },
  {
    pattern: /(?:^|\s)推荐(?:商品|款|花束)?(?=\s|$)/g,
    apply: (s) => { s.recommend = 'only' },
  },
  {
    pattern: /新上架|刚上架|新品|新上的|最近上架/g,
    apply: (s) => { s.newListingOnly = true },
  },
  {
    pattern: /(?:^|\s)下架(?:$|\s|商品|的)/g,
    apply: (s) => { s.shelfStatus = 'offShelf' },
  },
  {
    pattern: /已下架|下架中|未上架|停售|不在售|下架商品|下架的/g,
    apply: (s) => { s.shelfStatus = 'offShelf' },
  },
  {
    pattern: /(?:^|\s)上架(?:$|\s|商品|的)/g,
    apply: (s) => { s.shelfStatus = 'onShelf' },
  },
  {
    pattern: /已上架|上架中|在上架|当前上架|正在上架|上架商品|上架的|在售|正在售|售卖中|销售中/g,
    apply: (s) => { s.shelfStatus = 'onShelf' },
  },
  {
    pattern: /(?:^|\s)售罄(?:$|\s|商品|的)/g,
    apply: (s) => { s.stockStatus = 'soldOut' },
  },
  {
    pattern: /售罄|卖光|卖完了|没库存|无库存|零库存|缺货|没货|卖完/g,
    apply: (s) => { s.stockStatus = 'soldOut' },
  },
  {
    pattern: /有库存|有货|还能卖|库存充足|未售罄/g,
    apply: (s) => { s.stockStatus = 'inStock' },
  },
  {
    pattern: /未分类|没分类|无分类/g,
    apply: (s) => { s.categoryId = '__none__' },
  },
]

const STOCK_MIN = /库存(?:大于|超过|多于|不少于|至少)?\s*(\d+)/i
const STOCK_MAX = /库存(?:小于|少于|低于|不超过|至多)?\s*(\d+)/i

function normalizeQuery(query: string) {
  return normalizeSearchQueryText(query)
}

function stripMatched(text: string, pattern: RegExp, replaceWith = ' ') {
  return text.replace(pattern, replaceWith)
}

function parsePriceScope(text: string) {
  const scope: ParsedMerchantSearchScope = {}
  let remaining = text

  let m = remaining.match(PRICE_BETWEEN_SUFFIX)
  if (m) {
    scope.priceMin = Number(m[1])
    scope.priceMax = Number(m[2])
    remaining = stripMatched(remaining, PRICE_BETWEEN_SUFFIX)
  }

  m = remaining.match(PRICE_RANGE)
  if (m) {
    scope.priceMin = Number(m[1])
    scope.priceMax = Number(m[2])
    remaining = stripMatched(remaining, PRICE_RANGE)
  }

  m = remaining.match(PRICE_EXACT)
  if (m) {
    const p = Number(m[1])
    scope.priceMin = p
    scope.priceMax = p
    remaining = stripMatched(remaining, PRICE_EXACT)
  }

  m = remaining.match(PRICE_UNDER_SUFFIX)
  if (m) {
    scope.priceMax = Number(m[1])
    remaining = stripMatched(remaining, PRICE_UNDER_SUFFIX)
  }

  m = remaining.match(PRICE_OVER_SUFFIX)
  if (m) {
    scope.priceMin = Number(m[1])
    remaining = stripMatched(remaining, PRICE_OVER_SUFFIX)
  }

  m = remaining.match(PRICE_BELOW)
  if (m) {
    scope.priceMax = Number(m[1])
    remaining = stripMatched(remaining, PRICE_BELOW)
  }

  m = remaining.match(PRICE_ABOVE)
  if (m) {
    scope.priceMin = Number(m[1])
    remaining = stripMatched(remaining, PRICE_ABOVE)
  }

  return { scope, remaining: remaining.trim() }
}

function parseStockBounds(text: string) {
  const scope: ParsedMerchantSearchScope = {}
  let remaining = text

  let m = remaining.match(STOCK_MIN)
  if (m) {
    scope.stockMin = Number(m[1])
    scope.stockStatus = 'inStock'
    remaining = stripMatched(remaining, STOCK_MIN)
  }

  m = remaining.match(STOCK_MAX)
  if (m) {
    scope.stockMax = Number(m[1])
    remaining = stripMatched(remaining, STOCK_MAX)
  }

  return { scope, remaining: remaining.trim() }
}

function parsePhraseScope(text: string) {
  const scope: ParsedMerchantSearchScope = {}
  let remaining = text

  for (const rule of PHRASE_RULES) {
    if (!rule.pattern.test(remaining)) continue
    rule.pattern.lastIndex = 0
    rule.apply(scope)
    remaining = stripMatched(remaining, rule.pattern)
  }

  for (const option of GOODS_SALES_TYPE_OPTIONS) {
    if (remaining.includes(option.label)) {
      scope.salesType = option.value
      remaining = remaining.replaceAll(option.label, ' ')
      break
    }
    const short = option.label.replace(/售卖/g, '')
    if (short.length >= 2 && remaining.includes(short)) {
      scope.salesType = option.value
      remaining = remaining.replaceAll(short, ' ')
      break
    }
  }

  return { scope, remaining: remaining.trim() }
}

function matchEntityByName(
  remaining: string,
  entities: Array<{ id: string; name: string }>,
) {
  const sorted = [...entities].sort((a, b) => b.name.length - a.name.length)
  for (const entity of sorted) {
    const name = entity.name.trim()
    if (!name || name.length < 2) continue
    if (!remaining.includes(name)) continue
    return { id: entity.id, remaining: remaining.replaceAll(name, ' ').trim() }
  }
  return null
}

function collectFlowerEntities(catalog: Goods[]) {
  const kinds = new Map<string, string>()
  const varieties = new Map<string, string>()

  for (const item of catalog) {
    if (item.flowerKindId && item.flowerKindName) {
      kinds.set(item.flowerKindId, item.flowerKindName.trim())
    }
    if (item.flowerVarietyId) {
      const label = getGoodsFlowerDisplayLabel(item).trim()
      if (label) varieties.set(item.flowerVarietyId, label)
    }
  }

  return {
    kinds: Array.from(kinds.entries()).map(([id, name]) => ({ id, name })),
    varieties: Array.from(varieties.entries()).map(([id, name]) => ({ id, name })),
  }
}

function stripFillers(text: string) {
  return text.replace(FILLER_WORDS, ' ').replace(/\s+/g, ' ').trim()
}

function tokenizeRemaining(text: string) {
  const cleaned = stripFillers(text)
  if (!cleaned) return []
  return cleaned
    .split(/[\s,，、]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 1 && !/^商品|货品|花束$/.test(t))
}

/** 解析搜索框口语化条件（覆盖上架/下架/推荐/未推荐/售罄/价格等） */
export function parseMerchantGoodsSearchQuery(
  query: string,
  context: MerchantGoodsSearchContext,
): ParsedMerchantSearch {
  let remaining = normalizeQuery(query)
  const scope: ParsedMerchantSearchScope = {}

  const parts = [
    parsePriceScope,
    parseStockBounds,
    parsePhraseScope,
  ]

  for (const parse of parts) {
    const part = parse(remaining)
    Object.assign(scope, part.scope)
    remaining = part.remaining
  }

  const categoryEntities = context.categories.map((c) => ({
    id: c._id,
    name: c.name,
  }))
  const categoryHit = matchEntityByName(remaining, categoryEntities)
  if (categoryHit) {
    scope.categoryId = categoryHit.id
    remaining = categoryHit.remaining
  }

  const { kinds, varieties } = collectFlowerEntities(context.catalog)
  const varietyHit = matchEntityByName(remaining, varieties)
  if (varietyHit) {
    scope.flowerVarietyId = varietyHit.id
    remaining = varietyHit.remaining
  }

  const kindHit = matchEntityByName(remaining, kinds)
  if (kindHit) {
    scope.flowerKindId = kindHit.id
    remaining = kindHit.remaining
  }

  const textTokens = tokenizeRemaining(remaining)

  return { scope, textTokens }
}

export function isExactCatalogProductName(query: string, catalog: Goods[]) {
  const q = normalizeQuery(query)
  if (!q) return false
  return catalog.some((item) => (item.name || '').trim() === q)
}

/** 可搜索字段：覆盖商品主要信息 */
function searchableHaystack(item: Goods) {
  const salesLabel = getSalesTypeOption(inferSalesType(item)).label
  const recommendLabel = item.recommend ? getRecommendCategoryLabel(item) : ''
  const flags = [
    item.recommend
      ? `${recommendLabel || '推荐'} 首页推荐 主页推荐`
      : '未推荐 非推荐',
    item.onSale === false ? '下架 已下架 未上架' : '上架 已上架 在售',
    item.stock <= 0 ? '售罄 没库存 无库存' : '有库存 有货',
    isNewListing(item) ? '新上架 新品' : '',
  ]

  return [
    item.name,
    item.categoryName,
    item.flowerKindName,
    item.flowerVarietyName,
    item.description,
    item.unit,
    salesLabel,
    String(item.price),
    String(item.stock),
    ...flags,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

/** 范围搜索：每个 token 至少命中一个商品信息字段 */
export function matchGoodsScopeTokens(item: Goods, tokens: string[]) {
  if (!tokens.length) return true
  const haystack = searchableHaystack(item)
  return tokens.every((token) => haystack.includes(token.toLowerCase()))
}

export function matchGoodsExactName(item: Goods, name: string) {
  const q = name.trim()
  if (!q) return true
  return (item.name || '').trim() === q
}

function applyParsedScopeOnItem(item: Goods, parsed: ParsedMerchantSearch) {
  const s = parsed.scope
  const price = Number(item.price) || 0
  const stock = Number(item.stock) || 0

  if (s.priceMin != null && price < s.priceMin) return false
  if (s.priceMax != null && price > s.priceMax) return false

  if (s.stockMin != null && stock < s.stockMin) return false
  if (s.stockMax != null && stock > s.stockMax) return false

  if (s.shelfStatus === 'onShelf' && item.onSale === false) return false
  if (s.shelfStatus === 'offShelf' && item.onSale !== false) return false

  if (s.stockStatus === 'inStock' && item.stock <= 0) return false
  if (s.stockStatus === 'soldOut' && item.stock > 0) return false

  if (s.recommend === 'only' && !item.recommend) return false
  if (s.recommend === 'exclude' && item.recommend) return false

  if (s.newListingOnly && !isNewListing(item)) return false

  if (s.salesType && inferSalesType(item) !== s.salesType) return false

  if (s.categoryId) {
    if (s.categoryId === '__none__' && item.categoryId) return false
    if (s.categoryId !== '__none__' && item.categoryId !== s.categoryId) return false
  }

  if (s.flowerKindId && item.flowerKindId !== s.flowerKindId) return false
  if (s.flowerVarietyId && item.flowerVarietyId !== s.flowerVarietyId) return false

  return matchGoodsScopeTokens(item, parsed.textTokens)
}

/** 口语化问句（如「当前上架的商品有哪些」）解析后仅按 scope 筛选 */
export function isScopeOnlyParsedQuery(parsed: ParsedMerchantSearch) {
  return parsed.textTokens.length === 0 && Object.keys(parsed.scope).length > 0
}

export function matchMerchantGoodsSearch(
  item: Goods,
  filter: MerchantGoodsFilterState,
  context: MerchantGoodsSearchContext,
) {
  const query = filter.searchQuery.trim()
  if (!query) return true

  if (filter.searchMatchMode === 'exact') {
    return matchGoodsExactName(item, query)
  }

  if (isExactCatalogProductName(query, context.catalog)) {
    return matchGoodsExactName(item, query)
  }

  const parsed = parseMerchantGoodsSearchQuery(query, context)
  return applyParsedScopeOnItem(item, parsed)
}

/** 当前支持的口语化范围维度（供 UI 提示 / 文档） */
export const MERCHANT_SEARCH_SCOPE_HINTS = [
  '上架 / 下架 / 在售',
  '推荐 / 未推荐 / 首页推荐',
  '售罄 / 有库存',
  '新上架 / 新品',
  '价格：低于100元、50到200、100元以上、壹佰到贰佰元',
  '库存：库存大于10',
  '分类 / 花材 / 品种 / 销售类型',
  '商品名关键词（如：百合）',
  '问句：当前上架的商品有哪些、主页推荐的有哪些',
] as const
