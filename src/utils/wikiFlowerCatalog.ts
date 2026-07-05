import type { FlowerKindWithVarieties, FlowerVariety, GoodsUnit } from '@/types/flower'
import type { FlowerWikiListItem } from '@/types/wiki'
import {
  filterWikiCatalog,
  filterWikiVarietiesByKind,
  findWikiKindOnlyEntry,
  getWikiDisplayName,
  WIKI_KIND_DEFAULT_ICON,
} from '@/types/wiki'

function defaultUnitFromPlantForm(plantForm?: FlowerWikiListItem['plantForm']): GoodsUnit {
  return plantForm === 'potted' ? '束' : '支'
}

function wikiVarietyToFlowerVariety(item: FlowerWikiListItem): FlowerVariety {
  const description = [item.carePreview, item.languagePreview, item.atlasPreview]
    .filter(Boolean)
    .join(' · ')
  const kindId = String(item.kindId || item._id || '').trim()
  const varietyId = String(item.varietyId || item._id || '').trim()
  return {
    _id: varietyId,
    kindId,
    name: getWikiDisplayName(item),
    aliases: [],
    defaultUnit: defaultUnitFromPlantForm(item.plantForm),
    description,
    sort: Number(item.sort) || 0,
    enabled: true,
  }
}

function kindLevelVarietyFromWiki(
  kindEntry: FlowerWikiListItem,
  kindId: string,
): FlowerVariety {
  const description = [kindEntry.atlasPreview, kindEntry.carePreview].filter(Boolean).join(' · ')
  return {
    _id: String(kindEntry.varietyId || kindEntry._id || '').trim(),
    kindId,
    name: kindEntry.kindName,
    aliases: [],
    defaultUnit: defaultUnitFromPlantForm(kindEntry.plantForm),
    description,
    sort: Number(kindEntry.sort) || 0,
    enabled: true,
  }
}

function collectOrderedKindNames(catalog: FlowerWikiListItem[]): string[] {
  const kindSort = new Map<string, number>()

  for (const item of catalog) {
    const name = String(item.kindName || '').trim()
    if (!name) continue
    const sort = Number(item.sort) || 0
    kindSort.set(name, Math.max(kindSort.get(name) ?? 0, sort))
  }

  return [...kindSort.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'))
    .map(([name]) => name)
}

/** 将智库列表转为商品编辑花卉选择器目录（以 flower_wiki 为唯一数据源） */
export function buildFlowerCatalogFromWiki(list: FlowerWikiListItem[]): FlowerKindWithVarieties[] {
  const catalog = filterWikiCatalog(list)

  return collectOrderedKindNames(catalog)
    .map((kindName) => {
      const kindEntry = findWikiKindOnlyEntry(catalog, kindName)
      const varietyItems = filterWikiVarietiesByKind(catalog, kindName)
      const kindId = String(
        kindEntry?.kindId || kindEntry?._id || varietyItems[0]?.kindId || varietyItems[0]?._id || '',
      ).trim()
      if (!kindId) return null

      const plantForm = kindEntry?.plantForm || varietyItems[0]?.plantForm
      const description = kindEntry
        ? [kindEntry.atlasPreview, kindEntry.carePreview].filter(Boolean).join(' · ')
        : ''

      let varieties = varietyItems.map(wikiVarietyToFlowerVariety)
      if (!varieties.length && kindEntry) {
        varieties = [kindLevelVarietyFromWiki(kindEntry, kindId)]
      }

      return {
        _id: kindId,
        name: kindName,
        icon: kindEntry?.icon || varietyItems[0]?.icon || WIKI_KIND_DEFAULT_ICON,
        sort: Number(kindEntry?.sort ?? varietyItems[0]?.sort) || 0,
        defaultUnit: defaultUnitFromPlantForm(plantForm),
        description,
        enabled: true,
        varieties,
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
