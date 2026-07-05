import type { SearchSuggestion } from '@/types/search'
import type { FlowerWikiListItem } from '@/types/wiki'
import type { Goods } from '@/types/goods'
import { getWikiDisplayName, getWikiFullLabel } from '@/types/wiki'
import { suggestGoodsAsSearchItems } from '@/utils/goodsNameSuggest'
import { suggestWikiEntries } from '@/utils/wikiSuggest'
import {
  hasGoodsForLabel,
  hasWikiForLabel,
  isPartialIntentQuery,
  suggestQueryCompletions,
} from '@/utils/customerSearchCompletions'

type SuggestChannel = 'wiki' | 'goods'

function uniqueChannels(channels: SuggestChannel[]): SuggestChannel[] {
  const order: SuggestChannel[] = []
  for (const ch of channels) {
    if (!order.includes(ch)) order.push(ch)
  }
  return order
}

export function channelsForLabel(
  goods: Goods[],
  wiki: FlowerWikiListItem[],
  label: string,
): SuggestChannel[] {
  const channels: SuggestChannel[] = []
  if (hasGoodsForLabel(goods, label)) channels.push('goods')
  if (hasWikiForLabel(wiki, label)) channels.push('wiki')
  return channels
}

export function channelsForGoodsRow(
  goods: Goods[],
  wiki: FlowerWikiListItem[],
  item: Goods,
): SuggestChannel[] {
  const channels: SuggestChannel[] = ['goods']
  const kindId = item.flowerKindId || ''
  const varietyId = item.flowerVarietyId || ''

  const linkedWiki = wiki.some((entry) => {
    if (varietyId && entry.varietyId === varietyId) return true
    if (kindId && entry.kindId === kindId && (!varietyId || !entry.varietyId)) return true
    return false
  })

  if (linkedWiki || hasWikiForLabel(wiki, item.name || '')) {
    channels.push('wiki')
  }

  return uniqueChannels(channels)
}

export function channelsForWikiRow(goods: Goods[], entry: FlowerWikiListItem): SuggestChannel[] {
  const channels: SuggestChannel[] = ['wiki']
  const names = [
    getWikiFullLabel(entry),
    getWikiDisplayName(entry),
    entry.varietyName,
    entry.kindName,
  ].filter((name): name is string => !!name?.trim())

  for (const name of names) {
    if (hasGoodsForLabel(goods, name)) {
      channels.push('goods')
      break
    }
  }

  return uniqueChannels(channels)
}

function buildSuggestRow(
  label: string,
  channels: SuggestChannel[],
  meta?: string,
): SearchSuggestion | null {
  if (!label.trim() || !channels.length) return null
  return {
    id: `suggest:${channels.join('+')}:${label}`,
    label: label.trim(),
    layout: 'dual-tag',
    channels,
    meta,
  }
}

/**
 * 顾客端联合搜索预判：
 * - 实时按输入展示商品行、百科行、问法补全行
 * - 每行右侧仅展示库内确有数据的「百科」「商品」按钮
 */
export function buildCustomerUnifiedSuggestions(
  goods: Goods[],
  wiki: FlowerWikiListItem[],
  query: string,
  limit = 10,
): SearchSuggestion[] {
  const q = query.trim()
  if (!q) return []

  const result: SearchSuggestion[] = []
  const indexByLabel = new Map<string, SearchSuggestion>()

  function upsertRow(row: SearchSuggestion | null) {
    if (!row) return
    const key = row.label.toLowerCase()
    const existing = indexByLabel.get(key)
    if (existing) {
      existing.channels = uniqueChannels([
        ...(existing.channels || []),
        ...(row.channels || []),
      ])
      if (!existing.meta && row.meta) existing.meta = row.meta
      return
    }
    indexByLabel.set(key, row)
    result.push(row)
  }

  const completions = suggestQueryCompletions(goods, wiki, q, limit)
  const goodsItems = suggestGoodsAsSearchItems(goods, q, limit)
  const wikiItems = suggestWikiEntries(wiki, q, limit)
  const partialIntent = isPartialIntentQuery(q)

  const pushCompletion = (text: string) => {
    upsertRow(buildSuggestRow(text, channelsForLabel(goods, wiki, text)))
  }

  const pushGoods = (item: SearchSuggestion) => {
    const goodsDoc = goods.find((g) => g._id === item.id)
    const channels = goodsDoc
      ? channelsForGoodsRow(goods, wiki, goodsDoc)
      : channelsForLabel(goods, wiki, item.label)
    upsertRow(buildSuggestRow(item.label, channels, item.meta))
  }

  const pushWiki = (item: SearchSuggestion) => {
    const wikiDoc = wiki.find((w) => w._id === item.id)
    const channels = wikiDoc
      ? channelsForWikiRow(goods, wikiDoc)
      : channelsForLabel(goods, wiki, item.label)
    upsertRow(buildSuggestRow(item.label, channels, item.meta))
  }

  if (partialIntent) {
    for (const text of completions) pushCompletion(text)
  }

  for (const item of goodsItems) pushGoods(item)
  for (const item of wikiItems) pushWiki(item)

  if (!partialIntent) {
    for (const text of completions) pushCompletion(text)
  }

  const qChannels = channelsForLabel(goods, wiki, q)
  if (qChannels.length) {
    upsertRow(buildSuggestRow(q, qChannels))
  }

  return result.slice(0, limit)
}
