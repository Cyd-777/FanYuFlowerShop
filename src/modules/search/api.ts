/**
 * 搜索模块 · 公开 API（顾客联合搜索门面）
 * @see docs/搜索模块-API.md
 */

export type {
  CustomerUnifiedSearchResult,
  CustomerUnifiedSearchScope,
  SearchSuggestion,
  SuggestChannel,
  WikiAnswerSnippet,
} from './types'

export {
  buildCustomerSearchPageUrl,
  matchSuggestChannelsForLabel,
  searchCustomerUnified,
  suggestCustomerUnified,
} from './client'
