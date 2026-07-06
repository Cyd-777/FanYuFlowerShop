import type { WikiAtlasDistinguish, WikiLanguagePairing, WikiPlantForm } from '@/types/wiki'
import type { WikiAtlasIntro, WikiBlockId } from '@/types/wikiBlocks'
import { composeAtlasIntroParagraphs } from '@/utils/wikiCompose'
import {
  defaultCareBaseRef,
  defaultGroupRef,
  defaultTaxonomyRef,
} from '@/utils/wikiBlockCatalog'
import { resolveGroupLabel, resolveRegionLabel, resolveTaxonomyLine, resolveTraitLabel } from '@/utils/wikiBlockRegistry'
import type { FlowerWiki } from '@/types/wiki'

export interface WikiColorMeaningRow {
  color: string
  meaning: string
}

export interface WikiPairingRow {
  style: string
  flowersText: string
  note: string
}

/** 商家词条编辑 · 与顾客端文章结构对齐 */
export interface WikiArticleEditForm {
  kindName: string
  varietyName: string
  icon: string
  enabled: boolean
  sort: number
  plantForm: WikiPlantForm
  aliasesText: string
  tagsText: string
  keywordsText: string
  /** 笔记式编辑 · 介绍正文（段间空行）；有值时优先于自动拼装段落 */
  atlasIntroParagraphsText: string

  taxonomyRef: WikiBlockId
  scientificName: string
  commonNamesText: string
  horticulturalGroup: WikiBlockId
  breeder: string
  introducedYear: string
  namingNote: string
  breedingOrigin: string
  productionRegions: WikiBlockId[]
  flowerForm: WikiBlockId[]
  featureRefs: WikiBlockId[]
  petalCount: string
  bloomDiameterCm: string
  color: string
  stem: string
  foliage: string
  scent: string
  distinguishFrom: WikiAtlasDistinguish[]

  bloomVase: string
  bloomVaseNote: string
  bloomSoil: string

  careBaseRef: WikiBlockId
  careSummary: string
  careWaterChange: string
  careTrim: string
  careWaterDepth: string
  careAdditives: string
  careTipsText: string

  languageMeaning: string
  languageParagraphsText: string
  languageCaution: string
  occasions: string[]
  colorMeanings: WikiColorMeaningRow[]
  pairing: WikiPairingRow[]
}

export function emptyWikiArticleEditForm(
  partial?: Partial<Pick<WikiArticleEditForm, 'kindName' | 'varietyName' | 'icon'>>,
): WikiArticleEditForm {
  const kindName = partial?.kindName || ''
  return {
    kindName,
    varietyName: partial?.varietyName || '',
    icon: partial?.icon || '🌷',
    enabled: true,
    sort: 0,
    plantForm: 'cut',
    aliasesText: '',
    tagsText: '',
    keywordsText: '',
    atlasIntroParagraphsText: '',
    taxonomyRef: defaultTaxonomyRef(kindName),
    scientificName: '',
    commonNamesText: '',
    horticulturalGroup: defaultGroupRef(kindName),
    breeder: '',
    introducedYear: '',
    namingNote: '',
    breedingOrigin: '',
    productionRegions: ['region.yunnan', 'region.colombia'],
    flowerForm: [],
    featureRefs: [],
    petalCount: '',
    bloomDiameterCm: '',
    color: '',
    stem: '',
    foliage: '',
    scent: '',
    distinguishFrom: [],
    bloomVase: '',
    bloomVaseNote: '',
    bloomSoil: '',
    careBaseRef: defaultCareBaseRef(kindName),
    careSummary: '',
    careWaterChange: '',
    careTrim: '',
    careWaterDepth: '',
    careAdditives: '',
    careTipsText: '',
    languageMeaning: '',
    languageParagraphsText: '',
    languageCaution: '',
    occasions: [],
    colorMeanings: [],
    pairing: [],
  }
}

export function joinList(items: string[] | undefined): string {
  return (items || []).filter(Boolean).join('，')
}

export function joinParagraphs(items: string[] | undefined): string {
  return (items || []).filter(Boolean).join('\n\n')
}

export function joinLines(items: string[] | undefined): string {
  return (items || []).filter(Boolean).join('\n')
}

export function splitList(text: string): string[] {
  return String(text || '')
    .split(/[,，、\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function splitParagraphs(text: string): string[] {
  return String(text || '')
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function splitLines(text: string): string[] {
  return String(text || '')
    .split(/\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildIntroFromForm(form: WikiArticleEditForm): WikiAtlasIntro {
  return {
    taxonomyRef: form.taxonomyRef || undefined,
    identity: {
      scientificName: form.scientificName.trim(),
      horticulturalGroup: form.horticulturalGroup || undefined,
      breeder: form.breeder.trim(),
      introducedYear: form.introducedYear.trim(),
      namingNote: form.namingNote.trim(),
    },
    origin: {
      breedingOrigin: form.breedingOrigin.trim(),
      productionRegions: form.productionRegions.filter(Boolean),
    },
    morphology: {
      flowerForm: form.flowerForm.filter(Boolean),
      petalCount: form.petalCount.trim(),
      bloomDiameterCm: form.bloomDiameterCm.trim(),
      color: form.color.trim(),
      stem: form.stem.trim(),
      foliage: form.foliage.trim(),
      scent: form.scent.trim(),
    },
  }
}

export function wikiToArticleEditForm(wiki: FlowerWiki & { careBaseRef?: string }): WikiArticleEditForm {
  const intro = wiki.atlas?.intro
  const identity = intro?.identity
  const morph = intro?.morphology
  const origin = intro?.origin
  const kindName = wiki.kindName || ''

  const distinguishFrom = (wiki.atlas?.distinguishFrom || [])
    .map((item) => ({
      name: String(item?.name || '').trim(),
      difference: String(item?.difference || '').trim(),
    }))
    .filter((item) => item.name || item.difference)

  return {
    kindName,
    varietyName: wiki.varietyName || '',
    icon: wiki.icon || '🌷',
    enabled: wiki.enabled !== false,
    sort: Number(wiki.sort) || 0,
    plantForm: wiki.plantForm || 'cut',
    aliasesText: joinList(wiki.aliases),
    tagsText: joinList(wiki.tags),
    keywordsText: joinList(wiki.keywords),
    atlasIntroParagraphsText: joinParagraphs(wiki.atlas?.paragraphs),
    taxonomyRef: (intro?.taxonomyRef || defaultTaxonomyRef(kindName)) as WikiBlockId,
    scientificName: identity?.scientificName || wiki.names?.scientificName || '',
    commonNamesText: joinList(wiki.names?.commonNames),
    horticulturalGroup: (identity?.horticulturalGroup ||
      defaultGroupRef(kindName)) as WikiBlockId,
    breeder: identity?.breeder || wiki.atlas?.cultivar?.breeder || '',
    introducedYear: identity?.introducedYear || wiki.atlas?.cultivar?.introducedYear || '',
    namingNote: identity?.namingNote || wiki.atlas?.cultivar?.namingNote || '',
    breedingOrigin: origin?.breedingOrigin || '',
    productionRegions: (origin?.productionRegions?.length
      ? origin.productionRegions
      : ['region.yunnan', 'region.colombia']) as WikiBlockId[],
    flowerForm: (morph?.flowerForm || []) as WikiBlockId[],
    featureRefs: (wiki.atlas?.featureRefs || []) as WikiBlockId[],
    petalCount: morph?.petalCount || '',
    bloomDiameterCm: morph?.bloomDiameterCm || '',
    color: morph?.color || '',
    stem: morph?.stem || '',
    foliage: morph?.foliage || '',
    scent: morph?.scent || '',
    distinguishFrom: distinguishFrom.length
      ? distinguishFrom
      : [{ name: '', difference: '' }],
    bloomVase: wiki.bloom?.vase || '',
    bloomVaseNote: wiki.bloom?.vaseNote || '',
    bloomSoil: wiki.bloom?.soil || '',
    careBaseRef: (wiki.careBaseRef || defaultCareBaseRef(kindName)) as WikiBlockId,
    careSummary: wiki.careVase?.summary || '',
    careWaterChange: wiki.careVase?.waterChange || '',
    careTrim: wiki.careVase?.trim || '',
    careWaterDepth: wiki.careVase?.waterDepth || '',
    careAdditives: wiki.careVase?.additives || '',
    careTipsText: joinLines(wiki.careVase?.tips),
    languageMeaning: wiki.language?.meaning || '',
    languageParagraphsText: joinParagraphs(wiki.language?.paragraphs),
    languageCaution: wiki.language?.caution || '',
    occasions: wiki.language?.occasions?.length
      ? [...wiki.language.occasions]
      : [...(wiki.occasions || [])],
    colorMeanings: (wiki.language?.colorMeanings || []).map((item) => ({
      color: item.color || '',
      meaning: item.meaning || '',
    })),
    pairing: (wiki.language?.pairing || []).map((item) => ({
      style: item.style || '',
      flowersText: joinList(item.flowers),
      note: item.note || '',
    })),
  }
}

export function articleEditFormToWikiPayload(form: WikiArticleEditForm) {
  const displayName = form.varietyName.trim() || form.kindName.trim()
  const distinguishFrom = form.distinguishFrom
    .map((item) => ({
      name: item.name.trim(),
      difference: item.difference.trim(),
    }))
    .filter((item) => item.name && item.difference)

  const intro = buildIntroFromForm(form)
  const composedParagraphs = composeAtlasIntroParagraphs(intro, displayName, distinguishFrom)
  const customIntro = splitParagraphs(form.atlasIntroParagraphsText)
  const paragraphs = customIntro.length ? customIntro : composedParagraphs
  const features = form.featureRefs.map(resolveTraitLabel).filter(Boolean)
  const originParts = [
    form.breedingOrigin.trim() ? `育种${form.breedingOrigin.trim()}` : '',
    form.productionRegions.length
      ? `主产区${form.productionRegions.map(resolveRegionLabel).filter(Boolean).join('、')}`
      : '',
  ].filter(Boolean)

  const colorMeanings = form.colorMeanings
    .map((item) => ({
      color: item.color.trim(),
      meaning: item.meaning.trim(),
    }))
    .filter((item) => item.color && item.meaning)

  const pairing: WikiLanguagePairing[] = form.pairing
    .map((item) => ({
      style: item.style.trim(),
      flowers: splitList(item.flowersText),
      note: item.note.trim(),
    }))
    .filter((item) => item.style || item.flowers.length)

  return {
    kindName: form.kindName.trim(),
    varietyName: form.varietyName.trim(),
    icon: form.icon.trim() || '🌷',
    enabled: form.enabled,
    sort: Number(form.sort) || 0,
    plantForm: form.plantForm,
    aliases: splitList(form.aliasesText),
    tags: splitList(form.tagsText),
    keywords: splitList(form.keywordsText),
    occasions: form.occasions.filter(Boolean),
    careBaseRef: form.careBaseRef || '',
    names: {
      scientificName: form.scientificName.trim(),
      commonNames: splitList(form.commonNamesText),
    },
    bloom: {
      vase: form.bloomVase.trim(),
      vaseNote: form.bloomVaseNote.trim(),
      soil: form.bloomSoil.trim(),
    },
    atlas: {
      intro,
      featureRefs: form.featureRefs.filter(Boolean),
      paragraphs,
      features,
      origin: originParts.join('；'),
      distinguishFrom,
      cultivar: {
        horticulturalGroup: resolveGroupLabel(form.horticulturalGroup),
        breeder: form.breeder.trim(),
        introducedYear: form.introducedYear.trim(),
        namingNote: form.namingNote.trim(),
      },
    },
    language: {
      meaning: form.languageMeaning.trim(),
      paragraphs: splitParagraphs(form.languageParagraphsText),
      caution: form.languageCaution.trim(),
      occasions: form.occasions.filter(Boolean),
      colorMeanings,
      pairing,
    },
    careVase: {
      summary: form.careSummary.trim(),
      waterChange: form.careWaterChange.trim(),
      trim: form.careTrim.trim(),
      waterDepth: form.careWaterDepth.trim(),
      additives: form.careAdditives.trim(),
      tips: splitLines(form.careTipsText),
    },
  }
}

export const WIKI_PLANT_FORM_OPTIONS: { value: WikiPlantForm; label: string }[] = [
  { value: 'cut', label: '鲜切花' },
  { value: 'potted', label: '盆栽' },
  { value: 'both', label: '兼有' },
]

export function syncKindDefaults(form: WikiArticleEditForm) {
  const kind = form.kindName.trim()
  if (!kind) return
  if (!form.taxonomyRef) form.taxonomyRef = defaultTaxonomyRef(kind)
  if (!form.horticulturalGroup) form.horticulturalGroup = defaultGroupRef(kind)
  if (!form.careBaseRef) form.careBaseRef = defaultCareBaseRef(kind)
}

/** @deprecated 旧 Tab 表单别名 */
export type WikiMerchantForm = WikiArticleEditForm
export const emptyWikiMerchantForm = emptyWikiArticleEditForm
export const wikiToMerchantForm = wikiToArticleEditForm
export const merchantFormToWikiPayload = articleEditFormToWikiPayload
