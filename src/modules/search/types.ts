import type {
  CustomerUnifiedSearchScope,
  SearchSuggestion,
  WikiAnswerSnippet,
} from '@/types/search'
import type { FlowerWikiListItem } from '@/types/wiki'
import type { Goods } from '@/types/goods'

export type { CustomerUnifiedSearchScope, SearchSuggestion, WikiAnswerSnippet }

export interface CustomerUnifiedSearchResult {
  goods: Goods[]
  wiki: FlowerWikiListItem[]
  wikiAnswer?: WikiAnswerSnippet | null
}

export type SuggestChannel = Exclude<CustomerUnifiedSearchScope, 'all'>
