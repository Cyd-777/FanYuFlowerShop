export type WikiTab = 'atlas' | 'care' | 'language'

export const WIKI_TAB_CONFIG: {
  key: WikiTab
  label: string
  shortLabel: string
  icon: string
}[] = [
  { key: 'atlas', label: '花卉图鉴', shortLabel: '图鉴', icon: '📖' },
  { key: 'care', label: '怎么养', shortLabel: '怎么养', icon: '🌱' },
  { key: 'language', label: '花语百科', shortLabel: '花语', icon: '💬' },
]

/** 百科页左侧品类导航（顺序固定，与智库 kindName 对应） */
export const WIKI_KIND_SIDEBAR: { name: string; icon: string }[] = [
  { name: '玫瑰', icon: '🌹' },
  { name: '百合', icon: '🤍' },
  { name: '康乃馨', icon: '💗' },
  { name: '芍药', icon: '🌸' },
  { name: '菊花', icon: '🌼' },
  { name: '绣球', icon: '💠' },
  { name: '郁金香', icon: '🌷' },
  { name: '向日葵', icon: '🌻' },
  { name: '马蹄莲', icon: '🤍' },
  { name: '非洲菊', icon: '🌼' },
  { name: '洋桔梗', icon: '🪻' },
  { name: '满天星', icon: '✨' },
  { name: '勿忘我', icon: '💙' },
  { name: '紫罗兰', icon: '💜' },
  { name: '风信子', icon: '🔔' },
  { name: '蝴蝶兰', icon: '🦋' },
  { name: '洋牡丹', icon: '🌺' },
]

export const WIKI_KIND_TAB_ALL_LABEL = '全部'

export interface WikiKindTabItem {
  kindName: string | null
  label: string
  icon: string
}

/** 百科 Tab 栏：首项「全部」+ 侧边栏品类 */
export function getWikiKindTabs(): WikiKindTabItem[] {
  return [
    { kindName: null, label: WIKI_KIND_TAB_ALL_LABEL, icon: '' },
    ...WIKI_KIND_SIDEBAR.map((k) => ({
      kindName: k.name,
      label: k.name,
      icon: k.icon,
    })),
  ]
}

/** 智库不收录的种类（非真实花材，如早期演示用的组合花束模板） */
export const WIKI_EXCLUDED_KIND_NAMES = ['混搭花束'] as const

export function isExcludedWikiKind(kindName: string): boolean {
  const name = String(kindName || '').trim()
  return (WIKI_EXCLUDED_KIND_NAMES as readonly string[]).includes(name)
}

export function filterWikiCatalog(list: FlowerWikiListItem[]): FlowerWikiListItem[] {
  return dedupeWikiListItems(list.filter((item) => !isExcludedWikiKind(item.kindName)))
}

/** 词条业务主键：种类 + 品种名（空品种 = 品类级词条） */
export function wikiEntryIdentityKey(
  item: Pick<FlowerWikiListItem, 'kindName' | 'varietyName'>,
): string {
  const kind = String(item.kindName || '').trim()
  const variety = String(item.varietyName || '').trim()
  return `${kind}::${variety}`
}

function shouldPreferWikiListItem(
  candidate: FlowerWikiListItem,
  current: FlowerWikiListItem,
): boolean {
  const sortDiff = (Number(candidate.sort) || 0) - (Number(current.sort) || 0)
  if (sortDiff !== 0) return sortDiff > 0

  const candidateHasIds = Boolean(
    candidate.kindId && (!candidate.varietyName?.trim() || candidate.varietyId),
  )
  const currentHasIds = Boolean(
    current.kindId && (!current.varietyName?.trim() || current.varietyId),
  )
  if (candidateHasIds !== currentHasIds) return candidateHasIds

  return false
}

/** 合并云库重复词条（同名种类+品种保留 sort 更高、ID 更完整的一条） */
export function dedupeWikiListItems(list: FlowerWikiListItem[]): FlowerWikiListItem[] {
  const winners = new Map<string, FlowerWikiListItem>()

  for (const item of list) {
    const key = wikiEntryIdentityKey(item)
    const prev = winners.get(key)
    if (!prev || shouldPreferWikiListItem(item, prev)) {
      winners.set(key, item)
    }
  }

  const seen = new Set<string>()
  const flow: FlowerWikiListItem[] = []
  for (const item of list) {
    const key = wikiEntryIdentityKey(item)
    if (seen.has(key)) continue
    seen.add(key)
    const winner = winners.get(key)
    if (winner) flow.push(winner)
  }
  return flow
}

export function filterWikiVarietiesByKind(
  list: FlowerWikiListItem[],
  kindName: string,
): FlowerWikiListItem[] {
  const kind = String(kindName || '').trim()
  if (!kind) return []
  return list
    .filter((item) => item.kindName === kind && Boolean(item.varietyName?.trim()))
    .sort((a, b) => b.sort - a.sort)
}

/** 品类级词条（无 varietyName） */
export function findWikiKindOnlyEntry(
  list: FlowerWikiListItem[],
  kindName: string,
): FlowerWikiListItem | null {
  const kind = String(kindName || '').trim()
  if (!kind) return null
  return (
    list.find(
      (item) => item.kindName === kind && !String(item.varietyName || '').trim(),
    ) || null
  )
}

/** 某品类下：种类词条在前，品种词条在后 */
export function buildWikiKindGroup(
  list: FlowerWikiListItem[],
  kindName: string,
): FlowerWikiListItem[] {
  const kindEntry = findWikiKindOnlyEntry(list, kindName)
  const varieties = filterWikiVarietiesByKind(list, kindName)
  return kindEntry ? [kindEntry, ...varieties] : varieties
}

/**
 * 百科浏览流：
 * - 选中种类：仅该种类词条 + 其下品种
 * - 未选中：按侧边栏顺序依次展示各「种类 + 品种」，其余词条追加在末尾
 */
export function buildWikiBrowseFlow(
  catalog: FlowerWikiListItem[],
  kinds: { name: string; icon: string }[],
  selectedKindName?: string | null,
): FlowerWikiListItem[] {
  const selected = String(selectedKindName || '').trim()
  if (selected) {
    return buildWikiKindGroup(catalog, selected)
  }

  const usedIds = new Set<string>()
  const flow: FlowerWikiListItem[] = []

  for (const kind of kinds) {
    for (const item of buildWikiKindGroup(catalog, kind.name)) {
      if (usedIds.has(item._id)) continue
      usedIds.add(item._id)
      flow.push(item)
    }
  }

  const rest = catalog
    .filter((item) => !usedIds.has(item._id))
    .sort((a, b) => b.sort - a.sort)
  flow.push(...rest)

  return flow
}

/** 品类级词条：优先 kind-only，否则取该品类下 sort 最高的品种词条 */
export function findWikiKindEntry(
  list: FlowerWikiListItem[],
  kindName: string,
): FlowerWikiListItem | null {
  const kind = String(kindName || '').trim()
  if (!kind) return null
  const kindOnly = list.find(
    (item) => item.kindName === kind && !String(item.varietyName || '').trim(),
  )
  if (kindOnly) return kindOnly
  const varieties = list
    .filter((item) => item.kindName === kind && Boolean(String(item.varietyName || '').trim()))
    .sort((a, b) => b.sort - a.sort)
  return varieties[0] || null
}

/** 百科首页卡片摘要（图鉴 + 养护 + 花语综合预览） */
export function getWikiKindCardPreview(item: FlowerWikiListItem): string {
  return (
    item.atlasPreview ||
    item.vaseLifePreview ||
    item.carePreview ||
    item.languagePreview ||
    '暂无简介'
  )
}

/** 词条形态：鲜切花 / 盆栽 / 兼有 */
export type WikiPlantForm = 'cut' | 'potted' | 'both'

/** 顾客问法对应的可答属性（与 Tab 正交，用于问答路由） */
export type WikiIntent =
  | 'vase_life'
  | 'soil_bloom'
  | 'how_to_care'
  | 'water_change'
  | 'trim'
  | 'environment'
  | 'origin'
  | 'features'
  | 'meaning'
  | 'occasions'

/** 单条可答片段（由正文预提取，搜索时直接取用） */
export interface WikiAnswerSlot {
  intent: WikiIntent
  text: string
  note?: string
  sourcePath: string
  tab: WikiTab
  triggers?: string[]
}

export interface WikiAnswerSlots {
  items: WikiAnswerSlot[]
}

export const WIKI_INTENT_LABELS: Record<WikiIntent, string> = {
  vase_life: '能开多久',
  soil_bloom: '自然花期',
  how_to_care: '怎么养',
  water_change: '怎么换水',
  trim: '怎么修剪',
  environment: '摆放环境',
  origin: '产地',
  features: '形态特征',
  meaning: '花语',
  occasions: '适用场合',
}

export interface WikiColorMeaning {
  color: string
  meaning: string
}

/** 生物学分类（界 → 门 → 纲 → 目；科、属一并记录便于展示） */
export interface WikiTaxonomy {
  kingdom?: string
  phylum?: string
  /** 纲（避免使用 JS 保留字 class） */
  taxonomicClass?: string
  order?: string
  family?: string
  genus?: string
}

/** 学名与俗名 */
export interface WikiNames {
  scientificName?: string
  commonNames?: string[]
}

export const WIKI_TAXONOMY_LABELS: { key: keyof WikiTaxonomy; label: string }[] = [
  { key: 'kingdom', label: '界' },
  { key: 'phylum', label: '门' },
  { key: 'taxonomicClass', label: '纲' },
  { key: 'order', label: '目' },
  { key: 'family', label: '科' },
  { key: 'genus', label: '属' },
]

/** 图鉴正文（展示用，与旧版兼容） */
export interface WikiAtlas {
  summary?: string
  features?: string[]
  /** @deprecated 请用 bloom.soil；读取时作回退 */
  bloomSeason?: string
  origin?: string
}

/** 花期：瓶插天数 vs 土培自然花期 */
export interface WikiBloom {
  /** 插瓶能开（养）多久，如「约 5—10 天」 */
  vase?: string
  vaseNote?: string
  /** 土培自然花期，如「4—5 月」 */
  soil?: string
  soilNote?: string
}

/** 怎么养（插瓶 / 水养）— 顾客主路径 */
export interface WikiCareVase {
  summary?: string
  /** 能开多久（可与 bloom.vase 一致或展开） */
  vaseLife?: string
  vaseLifeNote?: string
  /** 怎么换水 */
  waterChange?: string
  trim?: string
  waterDepth?: string
  environment?: string
  tips?: string[]
}

/** 土培参考 — 补充块 */
export interface WikiCareSoil {
  summary?: string
  light?: string
  water?: string
  soil?: string
  temperature?: string
  tips?: string[]
}

/**
 * @deprecated 旧版养殖块；新词条用 careVase + careSoil。详情页读取时作回退。
 */
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

/** 搜索与业务规则用索引字段（内容可后填） */
export interface WikiSearchIndex {
  keywords: string[]
  aliases: string[]
  tags: string[]
  searchText: string
  /** 节日 / 场景（OA 进货提醒等） */
  occasions: string[]
  seasonMonths: number[]
  restockHints: string[]
  searchVersion: number
}

export function emptyWikiCareVase(): WikiCareVase {
  return {}
}

export function emptyWikiCareSoil(): WikiCareSoil {
  return {}
}

export function emptyWikiBloom(): WikiBloom {
  return {}
}

export function emptyWikiSearchIndex(): WikiSearchIndex {
  return {
    keywords: [],
    aliases: [],
    tags: [],
    searchText: '',
    occasions: [],
    seasonMonths: [],
    restockHints: [],
    searchVersion: 1,
  }
}

export interface FlowerWiki {
  _id: string
  kindId: string
  varietyId: string
  kindName: string
  varietyName: string
  icon: string
  coverImage: string
  plantForm: WikiPlantForm
  bloom: WikiBloom
  careVase: WikiCareVase
  careSoil: WikiCareSoil
  atlas: WikiAtlas
  /** 生物学分类 */
  taxonomy?: WikiTaxonomy
  /** 学名与俗名 */
  names?: WikiNames
  /** @deprecated 见 careVase / careSoil */
  careGuide: WikiCareGuide
  language: WikiLanguage
  keywords: string[]
  aliases: string[]
  tags: string[]
  searchText: string
  occasions: string[]
  seasonMonths: number[]
  restockHints: string[]
  searchVersion: number
  enabled: boolean
  sort: number
  /** 问答槽位（云函数 pickWiki 时生成，库内可不存） */
  answerSlots?: WikiAnswerSlots
  /** 本条可回答的意图列表 */
  answerIntents?: WikiIntent[]
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
  plantForm: WikiPlantForm
  atlasPreview: string
  carePreview: string
  languagePreview: string
  /** 列表展示：能开多久摘要 */
  vaseLifePreview: string
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
  if (tab === 'atlas') {
    return item.vaseLifePreview || item.atlasPreview
  }
  if (tab === 'care') return item.carePreview
  return item.languagePreview
}

/** 详情 · 图鉴 Tab：能开多久（优先新字段） */
export function getWikiVaseLifeDisplay(wiki: FlowerWiki) {
  return wiki.bloom?.vase || wiki.careVase?.vaseLife || ''
}

/** 详情 · 图鉴 Tab：土培自然花期 */
export function getWikiSoilBloomDisplay(wiki: FlowerWiki) {
  return wiki.bloom?.soil || wiki.atlas?.bloomSeason || ''
}

/** 图鉴 · 生物学分类一行展示 */
export function formatWikiTaxonomy(taxonomy?: WikiTaxonomy): string {
  if (!taxonomy) return ''
  return [
    taxonomy.kingdom,
    taxonomy.phylum,
    taxonomy.taxonomicClass,
    taxonomy.order,
    taxonomy.family,
    taxonomy.genus,
  ]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' · ')
}

export function formatWikiCommonNames(names?: WikiNames): string {
  if (!names?.commonNames?.length) return ''
  return names.commonNames.map((n) => n.trim()).filter(Boolean).join('、')
}

export function getWikiPlantFormLabel(form?: WikiPlantForm): string {
  if (form === 'potted') return '盆栽'
  if (form === 'both') return '鲜切 / 盆栽'
  return '鲜切花'
}

export function resolveWikiCareVase(wiki: FlowerWiki) {
  const c = wiki.careVase || {}
  const g = wiki.careGuide || {}
  return {
    summary: (c.summary || g.summary || '').trim(),
    vaseLife: (c.vaseLife || wiki.bloom?.vase || '').trim(),
    vaseLifeNote: (c.vaseLifeNote || wiki.bloom?.vaseNote || '').trim(),
    waterChange: (c.waterChange || '').trim(),
    trim: (c.trim || '').trim(),
    waterDepth: (c.waterDepth || '').trim(),
    environment: (c.environment || '').trim(),
    tips: (c.tips?.length ? c.tips : g.tips || []).filter(Boolean),
  }
}

export function resolveWikiCareSoil(wiki: FlowerWiki) {
  const c = wiki.careSoil || {}
  const g = wiki.careGuide || {}
  return {
    summary: (c.summary || '').trim(),
    light: (c.light || g.light || '').trim(),
    water: (c.water || g.water || '').trim(),
    soil: (c.soil || g.soil || '').trim(),
    temperature: (c.temperature || g.temperature || '').trim(),
    tips: (c.tips || []).filter(Boolean),
  }
}

export function resolveWikiLanguage(wiki: FlowerWiki) {
  const lang = wiki.language || {}
  const occasions = (lang.occasions || []).filter(Boolean)
  return {
    summary: lang.summary?.trim() || '',
    meaning: lang.meaning?.trim() || '',
    occasions: occasions.length ? occasions : (wiki.occasions || []).filter(Boolean),
    colorMeanings: (lang.colorMeanings || []).filter((item) => item.color || item.meaning),
  }
}

export function resolveWikiAtlas(wiki: FlowerWiki) {
  const atlas = wiki.atlas || {}
  return {
    summary: atlas.summary?.trim() || '',
    features: (atlas.features || []).filter(Boolean),
    vaseLife: getWikiVaseLifeDisplay(wiki).trim(),
    vaseNote: wiki.bloom?.vaseNote?.trim() || '',
    soilBloom: getWikiSoilBloomDisplay(wiki).trim(),
    soilNote: wiki.bloom?.soilNote?.trim() || '',
    origin: atlas.origin?.trim() || '',
    taxonomyRows: WIKI_TAXONOMY_LABELS.map(({ key, label }) => ({
      label,
      value: String(wiki.taxonomy?.[key] || '').trim(),
    })).filter((row) => row.value),
    taxonomyLine: formatWikiTaxonomy(wiki.taxonomy),
    scientificName: wiki.names?.scientificName?.trim() || '',
    commonNames: formatWikiCommonNames(wiki.names),
  }
}

/** 云端 pickWiki 已归一化；本地缓存旧数据在此补默认结构 */
export function normalizeFlowerWiki(raw: FlowerWiki): FlowerWiki {
  return {
    ...raw,
    plantForm: raw.plantForm === 'potted' || raw.plantForm === 'both' ? raw.plantForm : 'cut',
    bloom: { ...emptyWikiBloom(), ...(raw.bloom || {}) },
    careVase: { ...(raw.careVase || {}) },
    careSoil: { ...(raw.careSoil || {}) },
    atlas: { ...(raw.atlas || {}) },
    taxonomy: { ...(raw.taxonomy || {}) },
    names: {
      scientificName: raw.names?.scientificName || '',
      commonNames: Array.isArray(raw.names?.commonNames) ? raw.names.commonNames : [],
    },
    careGuide: { ...(raw.careGuide || {}) },
    language: {
      summary: raw.language?.summary || '',
      meaning: raw.language?.meaning || '',
      occasions: Array.isArray(raw.language?.occasions) ? raw.language.occasions : [],
      colorMeanings: Array.isArray(raw.language?.colorMeanings) ? raw.language.colorMeanings : [],
    },
    keywords: Array.isArray(raw.keywords) ? raw.keywords : [],
    aliases: Array.isArray(raw.aliases) ? raw.aliases : [],
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    occasions: Array.isArray(raw.occasions) ? raw.occasions : [],
    seasonMonths: Array.isArray(raw.seasonMonths) ? raw.seasonMonths : [],
    restockHints: Array.isArray(raw.restockHints) ? raw.restockHints : [],
    searchText: String(raw.searchText || ''),
    searchVersion: Number(raw.searchVersion) || 1,
    enabled: raw.enabled !== false,
    sort: Number(raw.sort) || 0,
  }
}

export function hasWikiCareVaseContent(wiki: FlowerWiki) {
  const c = resolveWikiCareVase(wiki)
  return !!(
    c.summary ||
    c.vaseLife ||
    c.vaseLifeNote ||
    c.waterChange ||
    c.trim ||
    c.waterDepth ||
    c.environment ||
    c.tips.length
  )
}

export function hasWikiCareSoilContent(wiki: FlowerWiki) {
  const c = resolveWikiCareSoil(wiki)
  return !!(
    c.summary ||
    c.light ||
    c.water ||
    c.soil ||
    c.temperature ||
    c.tips.length
  )
}
