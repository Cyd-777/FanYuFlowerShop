import blocksJson from '@/data/wiki/blocks.json'
import type {
  WikiBlockId,
  WikiBlockRegistry,
  WikiGroupBlock,
  WikiRegionBlock,
  WikiTaxonomyBlock,
  WikiTraitBlock,
} from '@/types/wikiBlocks'
import type { WikiCareVase } from '@/types/wiki'

const REGISTRY = blocksJson as WikiBlockRegistry

export function getWikiBlockRegistry(): WikiBlockRegistry {
  return REGISTRY
}

export function getWikiBlock(id: WikiBlockId | undefined): unknown {
  if (!id) return undefined
  return REGISTRY[id]
}

export function resolveTraitLabel(id: WikiBlockId): string {
  const block = getWikiBlock(id) as WikiTraitBlock | undefined
  return block?.label?.trim() || ''
}

export function resolveRegionLabel(id: WikiBlockId): string {
  const block = getWikiBlock(id) as WikiRegionBlock | undefined
  return block?.label?.trim() || ''
}

export function resolveGroupLabel(id: WikiBlockId): string {
  const block = getWikiBlock(id) as WikiGroupBlock | undefined
  if (!block?.label) return ''
  return block.latin ? `${block.label}（${block.latin}）` : block.label
}

export function resolveTaxonomyBlock(id: WikiBlockId | undefined): WikiTaxonomyBlock | null {
  const block = getWikiBlock(id) as WikiTaxonomyBlock | undefined
  if (!block) return null
  return block
}

export function resolveTaxonomyLine(id: WikiBlockId | undefined): string {
  const block = resolveTaxonomyBlock(id)
  if (!block) return ''
  if (block.line?.trim()) return block.line.trim()
  return [block.family, block.genus].filter(Boolean).join('')
}

export function resolveTraitLabels(ids: WikiBlockId[] | undefined): string[] {
  return (ids || []).map(resolveTraitLabel).filter(Boolean)
}

export function resolveRegionLabels(ids: WikiBlockId[] | undefined): string[] {
  return (ids || []).map(resolveRegionLabel).filter(Boolean)
}

export function resolveCareVaseBlock(id: WikiBlockId | undefined): WikiCareVase | null {
  const block = getWikiBlock(id)
  if (!block || typeof block !== 'object') return null
  return block as WikiCareVase
}
