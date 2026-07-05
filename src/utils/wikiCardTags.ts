import { getWikiVarietyOverlay } from '@/data/wiki/varieties'
import { WIKI_CATALOG_FEATURES } from '@/data/wiki/varietyCatalogFeatures'
import type { FlowerWikiListItem, WikiPlantForm } from '@/types/wiki'
import { getWikiDisplayName, wikiEntryIdentityKey } from '@/types/wiki'
import { resolveGroupLabel, resolveTraitLabel } from '@/utils/wikiBlockRegistry'
import { parseVaseLifeRange } from '@/utils/wikiVaseLife'

export type WikiCardTagKind =
  | 'plant_form'
  | 'identity'
  | 'flower_form'
  | 'horticulture'
  | 'vase_life'
  | 'scent'

/** 卡片上单独展示种类 + 品种 tag（品种名即主标题时不重复） */
const VARIETY_TAG_KINDS = new Set(['玫瑰', '百合'])

export interface WikiCardTag {
  label: string
  kind: WikiCardTagKind
}

/** 种类默认瓶插天数（无 overlay / 列表 preview 时回退） */
const KIND_VASE_DEFAULT: Record<string, string> = {
  玫瑰: '约 5—10 天',
  百合: '约 7—14 天',
  康乃馨: '约 7—14 天',
  绣球: '约 5—10 天',
  芍药: '约 3—5 天',
  洋桔梗: '约 7—12 天',
  郁金香: '约 5—7 天',
  菊花: '约 10—14 天',
  马蹄莲: '约 7—10 天',
  向日葵: '约 5—8 天',
  洋牡丹: '约 5—7 天',
  银莲花: '约 5—7 天',
  翠珠: '约 7—10 天',
  蕾丝花: '约 7—10 天',
  紫罗兰: '约 5—7 天',
  勿忘我: '约 7—10 天',
  满天星: '约 10—14 天',
  风信子: '约 7—10 天',
  配叶: '约 7—14 天',
  盆栽: '盆栽观赏',
}

export type WikiVaseLifeTier = 'long' | 'medium' | 'short' | 'non_cut'

const VASE_LIFE_TIER_LABEL: Record<WikiVaseLifeTier, string> = {
  long: '花期长',
  medium: '花期中等',
  short: '花期短',
  non_cut: '非瓶插',
}

export type WikiScentTier = 'strong' | 'light' | 'none'

const SCENT_TIER_LABEL: Record<WikiScentTier, string> = {
  strong: '浓香',
  light: '淡香',
  none: '无香',
}

/** 无 overlay 香气字段时，按种类回退（配叶/盆栽不默认展示香气 tag） */
const KIND_SCENT_DEFAULT: Partial<Record<string, WikiScentTier>> = {
  玫瑰: 'light',
  百合: 'strong',
  康乃馨: 'light',
  郁金香: 'none',
  绣球: 'none',
  芍药: 'strong',
  洋桔梗: 'none',
  菊花: 'none',
  马蹄莲: 'none',
  向日葵: 'none',
  洋牡丹: 'light',
  银莲花: 'none',
  翠珠: 'none',
  蕾丝花: 'none',
  紫罗兰: 'light',
  勿忘我: 'none',
  满天星: 'none',
  风信子: 'strong',
}

const SCENT_TRAIT_TIER: Record<string, WikiScentTier> = {
  'trait.strong_scent': 'strong',
  'trait.gentle_scent': 'light',
  'trait.light_sweet_scent': 'light',
}

const PLANT_FORM_LABEL: Record<WikiPlantForm | 'foliage', string> = {
  cut: '切花',
  potted: '盆栽',
  both: '切花/盆栽',
  foliage: '叶材',
}

/** 卡片花型 trait（排除色、香） */
const FLOWER_SHAPE_TRAIT_IDS = [
  'trait.cup_trumpet',
  'trait.cup_heart',
  'trait.high_cup',
  'trait.cup_rosette',
  'trait.apricot_cup',
  'trait.recurved_petal',
  'trait.spray_ball',
  'trait.multi_head',
  'trait.spray_huge',
  'trait.huge_flower',
  'trait.large_head',
  'trait.thick_petal',
] as const

/** catalog features → 卡片花型短标签 */
const CATALOG_FEATURE_SHAPE: Record<string, string> = {
  卷瓣: '卷瓣',
  花瓣反卷: '卷瓣',
  花大: '花大',
  多头: '多头',
  花量大: '花量大',
  重瓣: '重瓣',
  喇叭形: '喇叭形',
  团状: '团状',
  高杯: '高杯型',
  单瓣: '单瓣',
  复瓣: '重瓣',
  花型独特: '独特花型',
  球形: '球形',
  放射状: '放射瓣',
  佛焰苞: '佛焰苞',
}

/** 品种名 → 花型（catalog 特征不足时） */
const VARIETY_SHAPE_HINT: Record<string, string> = {
  多头康乃馨: '多头',
  重瓣百合: '重瓣',
  亚百合: '向上开放',
  铁炮百合: '喇叭形',
  双瓣郁金香: '重瓣',
  鹦鹉郁金香: '卷瓣',
  非洲菊: '放射瓣',
  乒乓菊: '球形',
  小菊: '碎瓣',
  洋甘菊: '碎瓣',
  烟花菊: '放射瓣',
  球菊: '球形',
  头花绣球: '团状',
  爆米花绣球: '团状',
  泰迪向日葵: '重瓣',
}

/** 种类默认花型（overlay / catalog 均无形状信息时） */
const KIND_FLOWER_SHAPE_DEFAULT: Partial<Record<string, string>> = {
  玫瑰: '高杯型',
  百合: '杯形',
  康乃馨: '层叠瓣',
  郁金香: '高脚杯',
  绣球: '团状',
  芍药: '重瓣',
  洋桔梗: '喇叭杯',
  马蹄莲: '佛焰苞',
  向日葵: '圆盘形',
  满天星: '细小花',
  风信子: '穗形',
  菊花: '放射瓣',
  洋牡丹: '重瓣',
  银莲花: '单瓣',
  翠珠: '小球形',
  蕾丝花: '伞形',
  紫罗兰: '穗形',
  勿忘我: '细碎',
}

/** 种类默认园艺群（overlay 无 horticulturalGroup 时） */
const KIND_HORTICULTURE_DEFAULT: Partial<Record<string, string>> = {
  玫瑰: '杂交茶香',
  百合: '切花百合',
  康乃馨: '切花康乃馨',
  郁金香: '单瓣郁金香',
  绣球: '大花绣球',
  芍药: '草本芍药',
  洋桔梗: '切花洋桔梗',
  菊花: '切花菊',
  马蹄莲: '切花马蹄莲',
  向日葵: '切花向日葵',
  洋牡丹: '切花洋牡丹',
  满天星: '切花满天星',
  风信子: '切花风信子',
  银莲花: '切花银莲花',
  翠珠: '切花配花',
  蕾丝花: '切花配花',
  紫罗兰: '切花紫罗兰',
  勿忘我: '切花勿忘我',
  配叶: '切花配叶',
  盆栽: '室内盆栽',
}

function resolveVaseLifeSource(item: FlowerWikiListItem): string {
  const variety = String(item.varietyName || '').trim()
  if (variety) {
    const overlay = getWikiVarietyOverlay(item.kindName, variety)
    if (overlay?.bloom?.vase) return overlay.bloom.vase.trim()
  }
  if (item.vaseLifePreview?.trim()) return item.vaseLifePreview.trim()
  return KIND_VASE_DEFAULT[item.kindName] || ''
}

/** 瓶插文案 → 花期长/中/短（不写具体天数） */
export function classifyWikiVaseLifeTier(
  text: string,
  plantForm: WikiPlantForm = 'cut',
): WikiVaseLifeTier | null {
  const source = String(text || '').trim()
  if (!source) return null

  if (
    plantForm === 'potted' ||
    /盆栽观赏|以盆栽|非瓶插|因品种而异/.test(source)
  ) {
    return 'non_cut'
  }

  const range = parseVaseLifeRange(source)
  if (!range) return null

  if (range.max >= 10) return 'long'
  if (range.max <= 5) return 'short'
  return 'medium'
}

function shortenHorticultureLabel(label: string): string {
  const trimmed = label.trim()
  if (!trimmed) return ''
  const beforeParen = trimmed.split('（')[0].split('(')[0].trim()
  return beforeParen || trimmed
}

function shortenFlowerShapeLabel(label: string): string {
  return label
    .trim()
    .replace(/花型$/g, '')
    .replace(/^切花/, '')
    .replace(/（.*?）/g, '')
    .trim()
}

function shapeFromCatalogFeatures(kindName: string, variety: string): string {
  const key = wikiEntryIdentityKey({ kindName, varietyName: variety })
  const features = WIKI_CATALOG_FEATURES[key] || []
  for (const tag of features) {
    const mapped = CATALOG_FEATURE_SHAPE[tag]
    if (mapped) return mapped
  }
  return VARIETY_SHAPE_HINT[variety] || ''
}

function shapeFromOverlay(kindName: string, variety: string): string {
  const overlay = getWikiVarietyOverlay(kindName, variety)
  if (!overlay) return ''

  const intro = overlay.atlas?.intro
  const flowerForm = intro?.morphology?.flowerForm || []
  for (const ref of flowerForm) {
    const label = shortenFlowerShapeLabel(resolveTraitLabel(ref))
    if (label) return label
  }

  const refs = overlay.atlas?.featureRefs || []
  for (const id of FLOWER_SHAPE_TRAIT_IDS) {
    if (refs.includes(id)) {
      const label = shortenFlowerShapeLabel(resolveTraitLabel(id))
      if (label) return label
    }
  }

  const petalNote = intro?.morphology?.petalCount || ''
  if (/锯齿/.test(petalNote)) return '层叠瓣'

  return ''
}

function resolveFlowerShapeLabel(item: FlowerWikiListItem): string {
  if (item.kindName === '配叶' || item.kindName === '盆栽') return ''

  const variety = String(item.varietyName || '').trim()
  if (!variety) return KIND_FLOWER_SHAPE_DEFAULT[item.kindName] || ''

  return (
    shapeFromOverlay(item.kindName, variety) ||
    shapeFromCatalogFeatures(item.kindName, variety) ||
    KIND_FLOWER_SHAPE_DEFAULT[item.kindName] ||
    ''
  )
}

function resolveHorticultureLabel(item: FlowerWikiListItem): string {
  const variety = String(item.varietyName || '').trim()
  const kind = String(item.kindName || '').trim()

  if (variety) {
    const overlay = getWikiVarietyOverlay(kind, variety)
    const intro = overlay?.atlas?.intro
    if (intro?.identity?.horticulturalGroup) {
      const fromBlock = resolveGroupLabel(intro.identity.horticulturalGroup)
      if (fromBlock) return shortenHorticultureLabel(fromBlock)
    }
    const cultivarGroup = overlay?.atlas?.cultivar?.horticulturalGroup
    if (cultivarGroup) return shortenHorticultureLabel(cultivarGroup)
  }

  return KIND_HORTICULTURE_DEFAULT[kind] || ''
}

function resolveRoseLilyVarietyTags(item: FlowerWikiListItem): WikiCardTag[] {
  const kind = String(item.kindName || '').trim()
  if (!VARIETY_TAG_KINDS.has(kind)) return []

  const variety = String(item.varietyName || '').trim()
  if (!variety) return []

  return [{ label: `${variety} · ${kind}`, kind: 'identity' }]
}

/** 玫瑰/百合品种卡片：种类已进 tag，不再用副标题 */
export function wikiCardUsesKindVarietyTags(item: FlowerWikiListItem): boolean {
  const kind = String(item.kindName || '').trim()
  if (!VARIETY_TAG_KINDS.has(kind)) return false
  return Boolean(String(item.varietyName || '').trim())
}

function resolvePlantForm(item: FlowerWikiListItem): WikiPlantForm {
  if (item.kindName === '盆栽') return 'potted'
  if (item.kindName === '配叶') return 'cut'
  return item.plantForm || 'cut'
}

function resolvePlantFormLabel(item: FlowerWikiListItem): string {
  if (item.kindName === '配叶') return PLANT_FORM_LABEL.foliage
  const form = resolvePlantForm(item)
  return PLANT_FORM_LABEL[form]
}

/** 形态/香气文案 → 浓香 / 淡香 / 无香 */
export function classifyWikiScentTier(text: string): WikiScentTier | null {
  const source = String(text || '').trim()
  if (!source) return null

  if (/无香|几乎无|极淡|不香|无明显|无气味|几乎闻不到/.test(source)) return 'none'
  if (/浓香|浓郁|强烈|清幽而持久|尤为明显|甜美而古典|香气明显|芬香/.test(source)) {
    return 'strong'
  }
  if (/淡|轻轻|清雅|清甜|不浓|不烈|微香|若有若无/.test(source)) return 'light'

  return null
}

function resolveScentTierFromOverlay(
  kindName: string,
  variety: string,
): WikiScentTier | null {
  if (!variety) return null

  const overlay = getWikiVarietyOverlay(kindName, variety)
  if (!overlay) return null

  for (const ref of overlay.atlas?.featureRefs || []) {
    const tier = SCENT_TRAIT_TIER[ref]
    if (tier) return tier
  }

  const scentText = overlay.atlas?.intro?.morphology?.scent
  if (scentText) {
    return classifyWikiScentTier(scentText)
  }

  return null
}

function resolveScentLabel(item: FlowerWikiListItem): string {
  if (item.kindName === '配叶' || item.kindName === '盆栽') return ''

  const variety = String(item.varietyName || '').trim()
  const fromOverlay = variety ? resolveScentTierFromOverlay(item.kindName, variety) : null
  const tier = fromOverlay || KIND_SCENT_DEFAULT[item.kindName] || null
  if (!tier) return ''

  return SCENT_TIER_LABEL[tier]
}

/** 百科列表卡片 tag（形态、种类/品种、花型、园艺分类、花期、香气） */
export function getWikiCardTags(item: FlowerWikiListItem): WikiCardTag[] {
  const tags: WikiCardTag[] = []

  tags.push({ label: resolvePlantFormLabel(item), kind: 'plant_form' })

  const roseLilyTags = resolveRoseLilyVarietyTags(item)
  if (roseLilyTags.length) {
    tags.push(...roseLilyTags)
  }

  const flowerShape = resolveFlowerShapeLabel(item)
  if (flowerShape) {
    tags.push({ label: flowerShape, kind: 'flower_form' })
  }

  const horticulture = resolveHorticultureLabel(item)
  if (horticulture) {
    tags.push({ label: horticulture, kind: 'horticulture' })
  }

  const vaseSource = resolveVaseLifeSource(item)
  const tier = classifyWikiVaseLifeTier(vaseSource, resolvePlantForm(item))
  if (tier) {
    let label = VASE_LIFE_TIER_LABEL[tier]
    if (tier === 'non_cut' && item.kindName === '盆栽') label = '盆栽观赏'
    tags.push({ label, kind: 'vase_life' })
  }

  const scent = resolveScentLabel(item)
  if (scent) {
    tags.push({ label: scent, kind: 'scent' })
  }

  const seen = new Set<string>()
  const displayTitle = getWikiDisplayName(item)
  const kind = String(item.kindName || '').trim()
  const variety = String(item.varietyName || '').trim()
  const fullLabel = variety && kind ? `${variety} · ${kind}` : displayTitle
  return tags.filter((tag) => {
    if (tag.kind === 'identity' && (tag.label === fullLabel || tag.label === displayTitle)) {
      return false
    }
    if (seen.has(tag.label)) return false
    seen.add(tag.label)
    return true
  })
}
