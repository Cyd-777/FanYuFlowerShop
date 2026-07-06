import type { WikiBlockId } from '@/types/wikiBlocks'
import { getWikiBlockRegistry, resolveCareVaseBlock, resolveGroupLabel, resolveRegionLabel, resolveTaxonomyLine, resolveTraitLabel } from '@/utils/wikiBlockRegistry'

export interface WikiBlockOption {
  id: WikiBlockId
  label: string
  hint?: string
}

const KIND_CARE_SLUG: Record<string, string> = {
  玫瑰: 'rose',
  百合: 'lily',
  康乃馨: 'carnation',
  绣球: 'hydrangea',
  芍药: 'peony',
  洋桔梗: 'eustoma',
  郁金香: 'tulip',
  菊花: 'chrysanthemum',
  马蹄莲: 'calla',
  向日葵: 'sunflower',
  洋牡丹: 'ranunculus',
  银莲花: 'anemone',
  翠珠: 'greenbell',
  蕾丝花: 'laceflower',
  紫罗兰: 'violet',
  勿忘我: 'forget-me-not',
  满天星: 'gypsophila',
  风信子: 'hyacinth',
  配叶: 'foliage',
  盆栽: 'potted',
}

function blockIds(prefix: string): WikiBlockId[] {
  const registry = getWikiBlockRegistry()
  return Object.keys(registry)
    .filter((id) => id.startsWith(`${prefix}.`))
    .sort((a, b) => a.localeCompare(b, 'zh'))
}

function toTaxonomyOption(id: WikiBlockId): WikiBlockOption {
  return { id, label: resolveTaxonomyLine(id) || id, hint: id }
}

function toGroupOption(id: WikiBlockId): WikiBlockOption {
  return { id, label: resolveGroupLabel(id) || id, hint: id }
}

function toTraitOption(id: WikiBlockId): WikiBlockOption {
  return { id, label: resolveTraitLabel(id) || id, hint: id }
}

function toRegionOption(id: WikiBlockId): WikiBlockOption {
  return { id, label: resolveRegionLabel(id) || id, hint: id }
}

function toCareOption(id: WikiBlockId): WikiBlockOption {
  const care = resolveCareVaseBlock(id)
  const summary = care?.summary?.trim()
  return {
    id,
    label: id.replace(/^care\./, '').replace(/\.vase_base$/, ''),
    hint: summary ? summary.slice(0, 48) : id,
  }
}

export function listTaxonomyBlockOptions(): WikiBlockOption[] {
  return blockIds('taxonomy').map(toTaxonomyOption)
}

export function listGroupBlockOptions(): WikiBlockOption[] {
  return blockIds('group').map(toGroupOption)
}

export function listTraitBlockOptions(): WikiBlockOption[] {
  return blockIds('trait').map(toTraitOption)
}

export function listRegionBlockOptions(): WikiBlockOption[] {
  return blockIds('region').map(toRegionOption)
}

export function listCareBaseBlockOptions(): WikiBlockOption[] {
  return blockIds('care').filter((id) => id.endsWith('.vase_base')).map(toCareOption)
}

export function defaultTaxonomyRef(kindName: string): WikiBlockId {
  const slug = KIND_CARE_SLUG[kindName.trim()]
  return slug ? (`taxonomy.${slug}` as WikiBlockId) : ''
}

export function defaultCareBaseRef(kindName: string): WikiBlockId {
  const slug = KIND_CARE_SLUG[kindName.trim()]
  return slug ? (`care.${slug}.vase_base` as WikiBlockId) : ''
}

export function defaultGroupRef(kindName: string): WikiBlockId {
  const map: Record<string, WikiBlockId> = {
    玫瑰: 'group.hybrid_tea',
    郁金香: 'group.tulip_single',
    绣球: 'group.hydrangea_mophead',
    芍药: 'group.herbaceous_peony',
    康乃馨: 'group.carnation_cut',
    菊花: 'group.chrysanthemum_cut',
    风信子: 'group.hyacinth_cut',
    马蹄莲: 'group.calla_cut',
    向日葵: 'group.sunflower_cut',
    洋桔梗: 'group.eustoma_cut',
    满天星: 'group.gypsophila_cut',
    洋牡丹: 'group.ranunculus_cut',
    银莲花: 'group.anemone_cut',
    配叶: 'group.cut_foliage',
    盆栽: 'group.potted_ornamental',
  }
  return map[kindName.trim()] || ''
}

export const WIKI_OCCASION_OPTIONS = [
  '表白',
  '求婚',
  '纪念日',
  '情人节',
  '生日',
  '毕业',
  '婚礼',
  '开业',
  '探望',
  '道歉',
  '复合',
  '送长辈',
  '送友人',
  '家居',
  '儿童节',
  '母亲节',
  '教师节',
  '庆典',
  '悼念',
] as const

export function formatBlockSelection(ids: WikiBlockId[], resolver: (id: WikiBlockId) => string): string {
  const labels = ids.map(resolver).filter(Boolean)
  return labels.length ? labels.join('、') : '未选择'
}
