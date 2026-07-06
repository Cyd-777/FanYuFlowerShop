import type { CustomerUnifiedSearchScope } from '@/types/search'
import type { FlowerWikiListItem } from '@/types/wiki'
import type { Goods } from '@/types/goods'
import { goodsRepository, wikiRepository } from '@/data/repository'
import { parseCustomerGoodsSearchQuery } from '@/utils/parseCustomerGoodsSearchQuery'
import { parseWikiSearchQuery } from '@/utils/parseWikiSearchQuery'
import {
  buildCustomerUnifiedSuggestions,
  channelsForLabel,
} from '@/utils/customerSearchSuggest'
import type { CustomerUnifiedSearchResult, SuggestChannel } from './types'

/** 当前库内：该关键词能否命中商品 / 百科 */
export function matchSuggestChannelsForLabel(
  goods: Goods[],
  wiki: FlowerWikiListItem[],
  label: string,
): SuggestChannel[] {
  return channelsForLabel(goods, wiki, label)
}

/** 顾客端联合搜索页 URL（首页 / 分类等跳转共用） */
export function buildCustomerSearchPageUrl(
  keyword: string,
  options?: { exactName?: boolean; scope?: CustomerUnifiedSearchScope },
): string {
  const trimmed = keyword.trim()
  if (!trimmed) return ''
  let url = `/pagesCustomer/search/index?keyword=${encodeURIComponent(trimmed)}`
  if (options?.exactName) url += '&exact=1'
  if (options?.scope && options.scope !== 'all') url += `&scope=${options.scope}`
  return url
}

/** 并行搜索商品 + 智库 */
export async function searchCustomerUnified(
  keyword: string,
  options?: { exactName?: boolean },
): Promise<CustomerUnifiedSearchResult> {
  const trimmed = keyword.trim()
  if (!trimmed) {
    return { goods: [], wiki: [] }
  }

  const goodsQuery = parseCustomerGoodsSearchQuery(trimmed, '', {
    exactName: options?.exactName,
  })
  const wikiQuery = parseWikiSearchQuery(trimmed, undefined, 'auto')

  const [goods, wikiResult] = await Promise.all([
    goodsRepository.search(goodsQuery),
    wikiRepository.search(wikiQuery),
  ])

  return { goods, wiki: wikiResult.list, wikiAnswer: wikiResult.answer }
}

/** 首页 / 分类 / 联合搜索页：实时输入预判 */
export function suggestCustomerUnified(
  goods: Goods[],
  wiki: FlowerWikiListItem[],
  query: string,
  limit = 10,
): SearchSuggestion[] {
  return buildCustomerUnifiedSuggestions(goods, wiki, query, limit)
}
