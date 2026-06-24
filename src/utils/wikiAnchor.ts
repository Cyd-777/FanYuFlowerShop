import type { WikiTab } from '@/types/wiki'

/** 云函数 detailUrl 中的 anchor → 详情 Tab + 滚动目标 id */
export function resolveWikiAnchor(anchor?: string): {
  tab?: WikiTab
  elementId: string
} {
  const key = String(anchor || '').trim()
  switch (key) {
    case 'taxonomy':
      return { tab: 'atlas', elementId: 'wiki-anchor-taxonomy' }
    case 'names':
      return { tab: 'atlas', elementId: 'wiki-anchor-names' }
    case 'bloom':
      return { tab: 'atlas', elementId: 'wiki-anchor-bloom' }
    case 'atlas':
      return { tab: 'atlas', elementId: 'wiki-anchor-atlas' }
    case 'careVase':
    case 'careGuide':
      return { tab: 'care', elementId: 'wiki-anchor-careVase' }
    case 'careSoil':
      return { tab: 'care', elementId: 'wiki-anchor-careSoil' }
    case 'language':
      return { tab: 'language', elementId: 'wiki-anchor-language' }
    default:
      return { elementId: '' }
  }
}
