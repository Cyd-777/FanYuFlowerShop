export type WikiTab = 'atlas' | 'care' | 'language'

export interface WikiColorMeaning {
  color: string
  meaning: string
}

export interface WikiAtlas {
  summary?: string
  features?: string[]
  bloomSeason?: string
  origin?: string
}

export interface WikiCareGuide {
  summary?: string
  light?: string
  water?: string
  soil?: string
  temperature?: string
  tips?: string[]
}

export interface WikiLanguage {
  summary?: string
  meaning?: string
  occasions?: string[]
  colorMeanings?: WikiColorMeaning[]
}

export interface FlowerWiki {
  _id: string
  kindId: string
  varietyId: string
  kindName: string
  varietyName: string
  icon: string
  coverImage: string
  atlas: WikiAtlas
  careGuide: WikiCareGuide
  language: WikiLanguage
  enabled: boolean
  sort: number
}

export interface FlowerWikiListItem {
  _id: string
  kindId: string
  varietyId: string
  kindName: string
  varietyName: string
  icon: string
  coverImage: string
  sort: number
  atlasPreview: string
  carePreview: string
  languagePreview: string
}

export function getWikiDisplayName(item: Pick<FlowerWikiListItem, 'kindName' | 'varietyName'>) {
  if (item.varietyName) return item.varietyName
  return item.kindName
}

export function getWikiSubtitle(item: Pick<FlowerWikiListItem, 'kindName' | 'varietyName'>) {
  if (item.varietyName && item.kindName) return item.kindName
  return '花卉品类'
}

export function getWikiTabPreview(item: FlowerWikiListItem, tab: WikiTab) {
  if (tab === 'atlas') return item.atlasPreview
  if (tab === 'care') return item.carePreview
  return item.languagePreview
}
