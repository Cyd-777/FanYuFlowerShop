import { getWikiVarietyOverlay } from '@/data/wiki/varieties'
import type {
  WikiAtlasDocFields,
  WikiAtlasIntro,
  WikiBlockId,
  WikiVarietyOverlay,
} from '@/types/wikiBlocks'
import {
  resolveCareVaseBlock,
  resolveGroupLabel,
  resolveRegionLabels,
  resolveTaxonomyBlock,
  resolveTaxonomyLine,
  resolveTraitLabel,
  resolveTraitLabels,
} from '@/utils/wikiBlockRegistry'
import type {
  FlowerWiki,
  WikiAtlas,
  WikiAtlasDistinguish,
  WikiCareEnvironment,
  WikiCareVase,
  WikiIntroSegment,
  WikiNames,
} from '@/types/wiki'
import { getWikiDisplayName, normalizeFlowerWiki } from '@/types/wiki'

const ROSE_KIND_NAME = '玫瑰'
const DEFAULT_ROSE_CARE_REF: WikiBlockId = 'care.rose.vase_base'
const DEFAULT_ROSE_TAXONOMY_REF: WikiBlockId = 'taxonomy.rose'

function isRoseKind(kindName: string): boolean {
  return String(kindName || '').trim() === ROSE_KIND_NAME
}

function mergeCareVase(base: WikiCareVase, override?: Partial<WikiCareVase>): WikiCareVase {
  if (!override) return base
  const baseEnv =
    base.environment && typeof base.environment === 'object' ? base.environment : ({} as WikiCareEnvironment)
  const overrideEnv =
    override.environment && typeof override.environment === 'object'
      ? override.environment
      : undefined

  return {
    ...base,
    ...override,
    wakeUp: override.wakeUp ? { ...(base.wakeUp || {}), ...override.wakeUp } : base.wakeUp,
    environment: overrideEnv ? { ...baseEnv, ...overrideEnv } : override.environment ?? base.environment,
    emergency: override.emergency
      ? { ...(base.emergency || {}), ...override.emergency }
      : base.emergency,
    commonIssues: override.commonIssues?.length
      ? [...override.commonIssues, ...(base.commonIssues || [])]
      : base.commonIssues,
    tips: override.tips?.length ? override.tips : base.tips,
  }
}

function composeMorphologySentence(intro: WikiAtlasIntro, displayName: string): string {
  const morph = intro.morphology
  if (!morph) return ''

  const parts: string[] = []
  const forms = (morph.flowerForm || []).map(resolveTraitLabel).filter(Boolean)
  if (forms.length) {
    parts.push(`${displayName}拥有标志性的${forms.join('、')}`)
  }
  if (morph.petalCount) {
    parts.push(`花瓣数量约在 ${morph.petalCount} 之间`)
  }
  if (morph.bloomDiameterCm) {
    parts.push(`完全绽放后花径可达 ${morph.bloomDiameterCm} 厘米`)
  }
  if (morph.color) {
    parts.push(`最引人注目的是${morph.color}`)
  }
  const detail: string[] = []
  if (morph.stem) detail.push(morph.stem)
  if (morph.foliage) detail.push(morph.foliage)
  if (morph.scent) detail.push(morph.scent)
  if (detail.length) parts.push(detail.join('；'))

  return parts.join('。').replace(/。+/g, '。') + (parts.length ? '。' : '')
}

function composeDistinguishParagraph(items: WikiAtlasDistinguish[]): string {
  if (!items.length) return ''
  if (items.length === 1) {
    return `辨识要点：${items[0].name}——${items[0].difference}。`
  }
  const head = items.slice(0, -1)
  const tail = items[items.length - 1]
  const compareNames = head.map((item) => item.name).join('和')
  const headText = head
    .map((item) => `${item.name}的${item.difference}`)
    .join('；')
  const tailText = `${tail.name}那种${tail.difference}`
  return `在日常购买中，它常被拿来与${compareNames}混淆。${headText}；${tailText}，是它最核心的辨识特征，也正因如此，它成为许多顶级花艺师在秀场上钟爱的花材。`
}

/** 将 atlas.intro 结构拼成例文规模的三段 paragraphs */
export function composeAtlasIntroParagraphs(
  intro: WikiAtlasIntro,
  displayName: string,
  distinguishFrom: WikiAtlasDistinguish[] = [],
): string[] {
  const paragraphs: string[] = []
  const identity = intro.identity
  const taxonomyLine = resolveTaxonomyLine(intro.taxonomyRef)
  const groupLine = identity.horticulturalGroup
    ? resolveGroupLabel(identity.horticulturalGroup)
    : ''

  let p1 = `${displayName}，学名 ${identity.scientificName || ''}`
  if (taxonomyLine) p1 += `，是${taxonomyLine}的典型代表`
  if (groupLine) p1 += `，在园艺分类上归属于${groupLine}`
  p1 += '。'
  if (identity.breeder && identity.introducedYear) {
    p1 += `它由${identity.breeder}在 ${identity.introducedYear} 推出。`
  } else if (identity.breeder) {
    p1 += `它由${identity.breeder}推出。`
  }
  if (identity.namingNote) p1 += `${identity.namingNote}。`
  paragraphs.push(p1.trim())

  const origin = intro.origin
  let p2 = ''
  if (origin?.breedingOrigin) {
    p2 += `它的原产地为${origin.breedingOrigin}`
    const regions = resolveRegionLabels(origin.productionRegions)
    if (regions.length) p2 += `，目前全球主要产区集中在${regions.join('、')}`
    p2 += '。'
  }
  const morphSentence = composeMorphologySentence(intro, displayName)
  if (morphSentence) p2 += `在植物学特征上，${morphSentence}`
  if (p2.trim()) paragraphs.push(p2.trim())

  const p3 = composeDistinguishParagraph(distinguishFrom)
  if (p3.trim()) paragraphs.push(p3.trim())

  return paragraphs.filter(Boolean)
}

function pushIntroText(segments: WikiIntroSegment[], text: string, source?: string) {
  if (!text) return
  segments.push(source ? { kind: 'text', text, source } : { kind: 'text', text })
}

function pushIntroFeatureRefs(segments: WikiIntroSegment[], refs: string[] = []) {
  refs.forEach((ref, index) => {
    const label = resolveTraitLabel(ref)
    if (!label) return
    if (index > 0) pushIntroText(segments, '、')
    segments.push({
      kind: 'marker',
      type: 'feature',
      value: label,
      source: `block:${ref}`,
    })
  })
}

function pushIntroRegionRefs(segments: WikiIntroSegment[], refs: string[] = []) {
  refs.forEach((ref, index) => {
    const label = resolveRegionLabels([ref])[0]
    if (!label) return
    if (index > 0) pushIntroText(segments, '、')
    segments.push({
      kind: 'marker',
      type: 'region',
      value: label,
      source: `block:${ref}`,
    })
  })
}

/** 将 atlas.intro 结构拼成带标记的长文（学名斜体、块引用高亮） */
export function composeAtlasIntroSegments(
  intro: WikiAtlasIntro,
  displayName: string,
  distinguishFrom: WikiAtlasDistinguish[] = [],
  names?: WikiNames,
): WikiIntroSegment[] {
  const segments: WikiIntroSegment[] = []
  const identity = intro.identity
  const scientificName =
    identity.scientificName?.trim() || names?.scientificName?.trim() || ''
  const taxonomyLine = resolveTaxonomyLine(intro.taxonomyRef)
  const groupLine = identity.horticulturalGroup
    ? resolveGroupLabel(identity.horticulturalGroup)
    : ''

  pushIntroText(segments, displayName, 'varietyName')
  pushIntroText(segments, '，学名 ')
  if (scientificName) {
    segments.push({
      kind: 'marker',
      type: 'scientificName',
      value: scientificName,
      source: identity.scientificName
        ? 'atlas.intro.identity.scientificName'
        : 'names.scientificName',
    })
  }
  pushIntroText(segments, '，是')
  if (taxonomyLine) {
    segments.push({
      kind: 'marker',
      type: 'taxonomy',
      value: taxonomyLine,
      source: intro.taxonomyRef ? `block:${intro.taxonomyRef}` : 'taxonomy',
    })
  } else {
    pushIntroText(segments, '常见栽培花卉类群')
  }
  pushIntroText(segments, '的典型代表')
  if (groupLine) {
    pushIntroText(segments, '，在园艺分类上归属于')
    segments.push({
      kind: 'marker',
      type: 'group',
      value: groupLine,
      source: identity.horticulturalGroup
        ? `block:${identity.horticulturalGroup}`
        : 'atlas.cultivar.horticulturalGroup',
    })
  }
  pushIntroText(segments, '。')

  if (identity.breeder && identity.introducedYear) {
    pushIntroText(
      segments,
      `它由${identity.breeder}在 ${identity.introducedYear} 推出。`,
      'atlas.intro.identity',
    )
  } else if (identity.breeder) {
    pushIntroText(segments, `它由${identity.breeder}推出。`, 'atlas.intro.identity.breeder')
  }
  if (identity.namingNote) {
    pushIntroText(segments, `${identity.namingNote}。`, 'atlas.intro.identity.namingNote')
  }

  const origin = intro.origin
  const morph = intro.morphology
  let p2Started = false

  if (origin?.breedingOrigin || origin?.productionRegions?.length) {
    segments.push({ kind: 'break' })
    p2Started = true
    if (origin.breedingOrigin) {
      pushIntroText(segments, `它的原产地为${origin.breedingOrigin}`, 'atlas.intro.origin.breedingOrigin')
      const regionRefs = origin.productionRegions || []
      if (regionRefs.length) {
        pushIntroText(segments, '，目前全球主要产区集中在')
        pushIntroRegionRefs(segments, regionRefs)
      }
      pushIntroText(segments, '。')
    } else {
      const regionRefs = origin.productionRegions || []
      if (regionRefs.length) {
        pushIntroText(segments, '目前全球主要产区集中在')
        pushIntroRegionRefs(segments, regionRefs)
        pushIntroText(segments, '。')
      }
    }
  }

  if (morph) {
    if (!p2Started) segments.push({ kind: 'break' })
    pushIntroText(segments, p2Started ? '在植物学特征上，' : '')

    const formRefs = morph.flowerForm || []
    if (formRefs.length) {
      pushIntroText(segments, `${displayName}拥有标志性的`)
      pushIntroFeatureRefs(segments, formRefs)
    }
    if (morph.petalCount) {
      pushIntroText(
        segments,
        `${formRefs.length ? '，' : ''}花瓣数量约在 ${morph.petalCount} 之间`,
        'atlas.intro.morphology.petalCount',
      )
    }
    if (morph.bloomDiameterCm) {
      pushIntroText(
        segments,
        `，完全绽放后花径可达 ${morph.bloomDiameterCm} 厘米`,
        'atlas.intro.morphology.bloomDiameterCm',
      )
    }
    if (morph.color) {
      pushIntroText(
        segments,
        `，最引人注目的是${morph.color}`,
        'atlas.intro.morphology.color',
      )
    }
    const detail: { text: string; source: string }[] = []
    if (morph.stem) detail.push({ text: morph.stem, source: 'atlas.intro.morphology.stem' })
    if (morph.foliage) detail.push({ text: morph.foliage, source: 'atlas.intro.morphology.foliage' })
    if (morph.scent) detail.push({ text: morph.scent, source: 'atlas.intro.morphology.scent' })
    if (detail.length) {
      detail.forEach((item, index) => {
        pushIntroText(segments, `${index === 0 ? '；' : '；'}${item.text}`, item.source)
      })
    }
    pushIntroText(segments, '。')
  }

  const p3 = composeDistinguishParagraph(distinguishFrom)
  if (p3.trim()) {
    segments.push({ kind: 'break' })
    pushIntroText(segments, p3, 'atlas.distinguishFrom')
  }

  return segments
}

function toWikiAssemblySeed(raw: Record<string, unknown>): Record<string, unknown> {
  const atlas = (raw.atlas || {}) as WikiAtlasDocFields
  return {
    _id: raw._id,
    kindId: raw.kindId,
    varietyId: raw.varietyId,
    kindName: raw.kindName,
    varietyName: raw.varietyName,
    icon: raw.icon,
    coverImage: raw.coverImage,
    plantForm: raw.plantForm,
    enabled: raw.enabled,
    sort: raw.sort,
    keywords: raw.keywords,
    aliases: raw.aliases,
    tags: raw.tags,
    occasions: raw.occasions,
    seasonMonths: raw.seasonMonths,
    restockHints: raw.restockHints,
    searchText: raw.searchText,
    searchVersion: raw.searchVersion,
    taxonomy: raw.taxonomy,
    atlas: atlas.summary ? { summary: atlas.summary } : {},
  }
}

function prepareRawDocForAssembly(
  raw: Record<string, unknown>,
  overlay: WikiVarietyOverlay | null,
): Record<string, unknown> {
  if (!overlay) return raw
  return toWikiAssemblySeed(raw)
}

function buildAtlasFromSources(
  docAtlas: WikiAtlasDocFields | undefined,
  overlayAtlas: WikiVarietyOverlay['atlas'] | undefined,
  displayName: string,
): WikiAtlas {
  const intro = overlayAtlas?.intro || docAtlas?.intro
  const distinguishFrom = overlayAtlas?.distinguishFrom || docAtlas?.distinguishFrom || []
  const featureRefs = overlayAtlas?.featureRefs || docAtlas?.featureRefs
  const features = featureRefs?.length
    ? resolveTraitLabels(featureRefs)
    : (docAtlas?.features || []).filter(Boolean)

  let paragraphs: string[] | undefined
  if (overlayAtlas?.intro) {
    paragraphs = composeAtlasIntroParagraphs(intro!, displayName, distinguishFrom)
  } else {
    paragraphs = docAtlas?.paragraphs?.filter(Boolean)
    if (!paragraphs?.length && intro) {
      paragraphs = composeAtlasIntroParagraphs(intro, displayName, distinguishFrom)
    }
  }

  const origin =
    docAtlas?.origin ||
    overlayAtlas?.origin ||
    (intro?.origin
      ? [
          intro.origin.breedingOrigin ? `育种${intro.origin.breedingOrigin}` : '',
          resolveRegionLabels(intro.origin.productionRegions).length
            ? `主产区${resolveRegionLabels(intro.origin.productionRegions).join('、')}`
            : '',
        ]
          .filter(Boolean)
          .join('；')
      : '')

  const productionRegions =
    docAtlas?.productionRegions ||
    resolveRegionLabels(intro?.origin?.productionRegions || overlayAtlas?.intro?.origin?.productionRegions)

  const cultivar =
    docAtlas?.cultivar ||
    overlayAtlas?.cultivar ||
    (intro?.identity
      ? {
          horticulturalGroup: intro.identity.horticulturalGroup
            ? resolveGroupLabel(intro.identity.horticulturalGroup)
            : '',
          breeder: intro.identity.breeder,
          introducedYear: intro.identity.introducedYear,
          namingNote: intro.identity.namingNote,
        }
      : undefined)

  return {
    summary: docAtlas?.summary,
    intro,
    paragraphs,
    features,
    origin,
    cultivar,
    productionRegions,
    distinguishFrom,
  }
}

function applyOverlayCare(
  wiki: FlowerWiki,
  overlay: WikiVarietyOverlay | null,
): void {
  const careRef =
    overlay?.careBaseRef ||
    (isRoseKind(wiki.kindName) && wiki.varietyName.trim() ? DEFAULT_ROSE_CARE_REF : '')
  if (!careRef) return

  const base = resolveCareVaseBlock(careRef)
  if (base) {
    wiki.careVase = mergeCareVase(base, overlay?.careVaseOverride)
  }
}

function applyTaxonomyFromBlocks(wiki: FlowerWiki, intro?: WikiAtlasIntro): void {
  const ref = intro?.taxonomyRef || (isRoseKind(wiki.kindName) ? DEFAULT_ROSE_TAXONOMY_REF : '')
  const block = resolveTaxonomyBlock(ref)
  if (!block) return
  wiki.taxonomy = {
    ...(wiki.taxonomy || {}),
    order: wiki.taxonomy?.order || block.order,
    family: wiki.taxonomy?.family || block.family,
    genus: wiki.taxonomy?.genus || block.genus,
  }
}

/**
 * 云库 flower_wiki 原始 doc + 内置品种 overlay + blocks.json → 可渲染 FlowerWiki
 */
export function assembleFlowerWiki(raw: Record<string, unknown>): FlowerWiki {
  const kindName = String(raw.kindName || '').trim()
  const varietyName = String(raw.varietyName || '').trim()
  const overlay = varietyName ? getWikiVarietyOverlay(kindName, varietyName) : null
  const prepared = prepareRawDocForAssembly(raw, overlay)
  const displayName = getWikiDisplayName({ kindName, varietyName })

  const docAtlas = (prepared.atlas || {}) as WikiAtlasDocFields
  const atlas = buildAtlasFromSources(docAtlas, overlay?.atlas, displayName)

  const wiki = normalizeFlowerWiki({
    ...(prepared as FlowerWiki),
    names: {
      scientificName: overlay?.names?.scientificName || (prepared.names as FlowerWiki['names'])?.scientificName,
      commonNames:
        overlay?.names?.commonNames ||
        (prepared.names as FlowerWiki['names'])?.commonNames ||
        [],
    },
    bloom: { ...((prepared.bloom as FlowerWiki['bloom']) || {}), ...(overlay?.bloom || {}) },
    atlas,
    language: overlay?.language
      ? { ...((prepared.language as FlowerWiki['language']) || {}), ...overlay.language }
      : (prepared.language as FlowerWiki['language']),
    careVase: (prepared.careVase as FlowerWiki['careVase']) || {},
  })

  applyTaxonomyFromBlocks(wiki, docAtlas.intro || overlay?.atlas?.intro)
  applyOverlayCare(wiki, overlay)

  if (wiki.atlas?.intro?.identity) {
    wiki.atlas.introSegments = composeAtlasIntroSegments(
      wiki.atlas.intro,
      displayName,
      wiki.atlas.distinguishFrom || [],
      wiki.names,
    )
  }

  return wiki
}

/** 缓存/云函数 pickWiki 结果再次拼装，确保内置 overlay 覆盖旧版云侧正文 */
export function reassembleFlowerWiki(wiki: FlowerWiki): FlowerWiki {
  return assembleFlowerWiki(wiki as unknown as Record<string, unknown>)
}
