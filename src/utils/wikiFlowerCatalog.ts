import type { FlowerKindWithVarieties, FlowerVariety, GoodsUnit } from '@/types/flower'
import type { FlowerWikiListItem } from '@/types/wiki'
import {
  filterWikiCatalog,
  filterWikiVarietiesByKind,
  findWikiKindOnlyEntry,
  WIKI_KIND_SIDEBAR,
} from '@/types/wiki'

function defaultUnitFromPlantForm(plantForm?: FlowerWikiListItem['plantForm']): GoodsUnit {
  return plantForm === 'potted' ? '束' : '支'
}

function wikiVarietyToFlowerVariety(item: FlowerWikiListItem): FlowerVariety {
  const description = [item.carePreview, item.languagePreview, item.atlasPreview]
    .filter(Boolean)
    .join(' · ')
  return {
    _id: item.varietyId,
    kindId: item.kindId,
    name: String(item.varietyName || '').trim(),
    aliases: [],
    defaultUnit: defaultUnitFromPlantForm(item.plantForm),
    description,
    sort: Number(item.sort) || 0,
    enabled: true,
  }
}

function collectOrderedKindNames(catalog: FlowerWikiListItem[]): string[] {
  const names = new Set(
    catalog.map((item) => String(item.kindName || '').trim()).filter(Boolean),
  )
  const ordered: string[] = []

  for (const kind of WIKI_KIND_SIDEBAR) {
    if (names.has(kind.name)) {
      ordered.push(kind.name)
      names.delete(kind.name)
    }
  }

  const rest = [...names].sort((a, b) => a.localeCompare(b, 'zh-CN'))
  return [...ordered, ...rest]
}

/** 将智库列表转为商品编辑花卉选择器目录（以 flower_wiki 为唯一数据源） */
export function buildFlowerCatalogFromWiki(list: FlowerWikiListItem[]): FlowerKindWithVarieties[] {
  const catalog = filterWikiCatalog(list)

  return collectOrderedKindNames(catalog)
    .map((kindName) => {
      const kindEntry = findWikiKindOnlyEntry(catalog, kindName)
      const varietyItems = filterWikiVarietiesByKind(catalog, kindName).filter(
        (item) => String(item.varietyId || '').trim(),
      )
      const sidebar = WIKI_KIND_SIDEBAR.find((item) => item.name === kindName)
      const kindId = String(kindEntry?.kindId || varietyItems[0]?.kindId || '').trim()
      if (!kindId) return null

      const plantForm = kindEntry?.plantForm || varietyItems[0]?.plantForm
      const description = kindEntry
        ? [kindEntry.atlasPreview, kindEntry.carePreview].filter(Boolean).join(' · ')
        : ''

      return {
        _id: kindId,
        name: kindName,
        icon: kindEntry?.icon || sidebar?.icon || '🌷',
        sort: Number(kindEntry?.sort ?? varietyItems[0]?.sort) || 0,
        defaultUnit: defaultUnitFromPlantForm(plantForm),
        description,
        enabled: true,
        varieties: varietyItems.map(wikiVarietyToFlowerVariety),
      }
    })
    .filter((item): item is FlowerKindWithVarieties => item != null)
}

function matchKeyword(text: string, keyword: string) {
  return text.toLowerCase().includes(keyword)
}

/** 在已构建目录上按关键词过滤（兜底）；优先使用智库 keyword 搜索 */
export function filterFlowerCatalogByKeyword(
  catalog: FlowerKindWithVarieties[],
  keyword: string,
): FlowerKindWithVarieties[] {
  const text = String(keyword || '').trim().toLowerCase()
  if (!text) return catalog

  return catalog
    .map((kind) => {
      const kindMatched = matchKeyword(kind.name, text)
      const matchedVarieties = kind.varieties.filter(
        (item) =>
          matchKeyword(item.name, text)
          || item.aliases.some((alias) => matchKeyword(alias, text)),
      )
      if (kindMatched) return kind
      if (matchedVarieties.length) {
        return { ...kind, varieties: matchedVarieties }
      }
      return null
    })
    .filter((item): item is FlowerKindWithVarieties => item != null)
}
