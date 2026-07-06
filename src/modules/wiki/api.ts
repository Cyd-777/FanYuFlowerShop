/**
 * 智库模块 · 公开 API（读路径）
 * @see docs/智库模块-API.md
 */

export type { FlowerWiki, FlowerWikiListItem, LoadWithCacheResult, WikiQuery, WikiSearchResult } from './types'

export {
  getPublicWiki,
  getPublicWikiCached,
  listPublicWiki,
  listPublicWikiCached,
  matchPublicWiki,
  matchPublicWikiCached,
  searchPublicWiki,
} from './client'
