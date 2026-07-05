import type {
  WikiAtlasCultivar,
  WikiAtlasDistinguish,
  WikiBloom,
  WikiCareVase,
  WikiLanguage,
  WikiNames,
  WikiTaxonomy,
} from '@/types/wiki'

/** 公共块编码，如 taxonomy.rose、trait.cup_heart */
export type WikiBlockId = string

export interface WikiTaxonomyBlock extends WikiTaxonomy {
  /** 展示用：「蔷薇科蔷薇属」 */
  line?: string
}

export interface WikiGroupBlock {
  label: string
  latin?: string
}

export interface WikiTraitBlock {
  label: string
}

export interface WikiRegionBlock {
  label: string
}

export type WikiBlockValue =
  | WikiTaxonomyBlock
  | WikiGroupBlock
  | WikiTraitBlock
  | WikiRegionBlock
  | WikiCareVase
  | Record<string, unknown>

export type WikiBlockRegistry = Record<WikiBlockId, WikiBlockValue>

/** 图鉴简介 · 结构化（渲染时 compose 为 paragraphs） */
export interface WikiAtlasIntroIdentity {
  /** 覆盖展示名，默认用 varietyName */
  displayName?: string
  scientificName?: string
  /** 块编码，如 group.hybrid_tea */
  horticulturalGroup?: WikiBlockId
  breeder?: string
  introducedYear?: string
  namingNote?: string
}

export interface WikiAtlasIntroOrigin {
  breedingOrigin?: string
  /** 块编码列表，如 region.ecuador */
  productionRegions?: WikiBlockId[]
}

export interface WikiAtlasIntroMorphology {
  /** 块编码列表，如 trait.cup_heart */
  flowerForm?: WikiBlockId[]
  petalCount?: string
  bloomDiameterCm?: string
  color?: string
  stem?: string
  foliage?: string
  scent?: string
}

export interface WikiAtlasIntro {
  /** 块编码，如 taxonomy.rose */
  taxonomyRef?: WikiBlockId
  identity: WikiAtlasIntroIdentity
  origin?: WikiAtlasIntroOrigin
  morphology?: WikiAtlasIntroMorphology
}

/** 内置 JSON · 品种级 overlay（DB 词条 + overlay → 前端拼装） */
export interface WikiVarietyOverlay {
  names?: WikiNames
  bloom?: Partial<WikiBloom>
  /** 养护底稿块编码，默认 care.rose.vase_base */
  careBaseRef?: WikiBlockId
  careVaseOverride?: Partial<WikiCareVase>
  atlas?: {
    intro?: WikiAtlasIntro
    /** 特征 chip · 块编码 */
    featureRefs?: WikiBlockId[]
    distinguishFrom?: WikiAtlasDistinguish[]
    origin?: string
    cultivar?: WikiAtlasCultivar
  }
  /** 花语沿用原模型，不做块引用 */
  language?: WikiLanguage
}

/** DB 文档可携带的结构化图鉴（逐步迁入云库） */
export interface WikiAtlasDocFields {
  intro?: WikiAtlasIntro
  featureRefs?: WikiBlockId[]
  paragraphs?: string[]
  features?: string[]
  origin?: string
  cultivar?: WikiAtlasCultivar
  productionRegions?: string[]
  distinguishFrom?: WikiAtlasDistinguish[]
}
