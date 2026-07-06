import { asWikiArticleParagraphs } from '@/utils/wikiArticleBody'
import { composeAtlasIntroParagraphs, composeAtlasIntroSegments } from '@/utils/wikiCompose'
import { parseVaseLifeDays } from '@/utils/wikiVaseLife'
import { getWikiVarietyOverlay } from '@/data/wiki/varieties'
import type { WikiAtlasIntro } from '@/types/wikiBlocks'

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

/** 百科页左侧品类导航默认图标 */
export const WIKI_KIND_DEFAULT_ICON = '🌷'

/** 从智库列表动态构建品类导航（按 sort 降序，同分按中文名） */
export function buildWikiKindSidebar(
  catalog: FlowerWikiListItem[],
  options?: { skipCatalogFilter?: boolean },
): { name: string; icon: string }[] {
  const filtered = options?.skipCatalogFilter ? catalog : filterWikiCatalog(catalog)
  const kindMap = new Map<string, { icon: string; sort: number }>()

  for (const item of filtered) {
    const name = String(item.kindName || '').trim()
    if (!name) continue
    const sort = Number(item.sort) || 0
    const isKindOnly = !String(item.varietyName || '').trim()
    const existing = kindMap.get(name)
    if (!existing) {
      kindMap.set(name, {
        icon: String(item.icon || '').trim() || WIKI_KIND_DEFAULT_ICON,
        sort,
      })
      continue
    }
    existing.sort = Math.max(existing.sort, sort)
    if (isKindOnly && String(item.icon || '').trim()) {
      existing.icon = String(item.icon).trim()
    }
  }

  return [...kindMap.entries()]
    .sort((a, b) => b[1].sort - a[1].sort || a[0].localeCompare(b[0], 'zh-CN'))
    .map(([name, meta]) => ({ name, icon: meta.icon }))
}

export const WIKI_KIND_TAB_ALL_LABEL = '全部'

export interface WikiKindTabItem {
  kindName: string | null
  label: string
  icon: string
}

/** 百科 Tab 栏：首项「全部」+ 动态品类 */
export function getWikiKindTabs(kinds: { name: string; icon: string }[]): WikiKindTabItem[] {
  return [
    { kindName: null, label: WIKI_KIND_TAB_ALL_LABEL, icon: '' },
    ...kinds.map((k) => ({
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

export interface WikiKindBrowseGroup {
  kindName: string
  icon: string
  items: FlowerWikiListItem[]
}

/**
 * 百科/智库维护：按品类折叠展示。
 * 侧边栏 sort 顺序、种类词条在前品种在后、去重，仅保留有词条的分组。
 */
export function buildWikiGroupedBrowseFlow(
  catalog: FlowerWikiListItem[],
  options?: { forMerchant?: boolean },
): WikiKindBrowseGroup[] {
  const filtered = options?.forMerchant
    ? dedupeWikiListItems(catalog)
    : filterWikiCatalog(catalog)
  const kinds = buildWikiKindSidebar(filtered, {
    skipCatalogFilter: options?.forMerchant,
  })
  const flow = buildWikiBrowseFlow(filtered, kinds, null)

  const kindMap = new Map<string, WikiKindBrowseGroup>()
  for (const kind of kinds) {
    kindMap.set(kind.name, { kindName: kind.name, icon: kind.icon, items: [] })
  }
  for (const item of flow) {
    const key = String(item.kindName || '').trim()
    if (!key) continue
    if (!kindMap.has(key)) {
      kindMap.set(key, {
        kindName: key,
        icon: String(item.icon || '').trim() || WIKI_KIND_DEFAULT_ICON,
        items: [],
      })
    }
    kindMap.get(key)!.items.push(item)
  }

  const result: WikiKindBrowseGroup[] = []
  for (const kind of kinds) {
    const group = kindMap.get(kind.name)
    if (group && group.items.length > 0) result.push(group)
    kindMap.delete(kind.name)
  }
  for (const [, group] of kindMap) {
    if (group.items.length > 0) result.push(group)
  }
  return result
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

/** 百科首页卡片摘要：优先与详情图鉴 intro 同源（overlay 首段），否则回退云列表 preview */
export function getWikiKindCardPreview(item: FlowerWikiListItem): string {
  const kind = String(item.kindName || '').trim()
  const variety = String(item.varietyName || '').trim()

  if (variety) {
    const overlay = getWikiVarietyOverlay(kind, variety)
    const intro = overlay?.atlas?.intro
    if (intro?.identity) {
      const first = composeAtlasIntroParagraphs(
        intro,
        getWikiDisplayName(item),
        overlay?.atlas?.distinguishFrom || [],
      )[0]?.trim()
      if (first) return first
    }
  }

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

/** 图鉴展示用：仅目、科、属 */
export const WIKI_TAXONOMY_LABELS: { key: keyof WikiTaxonomy; label: string }[] = [
  { key: 'order', label: '目' },
  { key: 'family', label: '科' },
  { key: 'genus', label: '属' },
]

export type WikiIntroMarkerKind =
  | 'taxonomy'
  | 'commonNames'
  | 'scientificName'
  | 'feature'
  | 'group'
  | 'region'

export type WikiIntroSegment =
  | { kind: 'text'; text: string; source?: string }
  | { kind: 'break' }
  | {
      kind: 'marker'
      type: Exclude<WikiIntroMarkerKind, 'commonNames'>
      value: string
      source?: string
    }
  | { kind: 'marker'; type: 'commonNames'; values: string[]; source?: string }

/** 图鉴 · 品种背景（结构化，可与 paragraphs 拼装成长文） */
export interface WikiAtlasCultivar {
  horticulturalGroup?: string
  breeder?: string
  introducedYear?: string
  namingNote?: string
}

/** 易混品种辨识 */
export interface WikiAtlasDistinguish {
  name: string
  difference: string
}

/** 图鉴正文（展示用，与旧版兼容） */
export interface WikiAtlas {
  /** @deprecated 请用 paragraphs；读取时作回退并整段展示 */
  summary?: string
  /** 科普正文段落（例文规模；可由 atlas.intro 前端 compose 生成） */
  paragraphs?: string[]
  /** 结构化简介（云库或内置 overlay；渲染时 compose 为 paragraphs） */
  intro?: WikiAtlasIntro
  /** 由 intro compose 的带标记正文（优先于 paragraphs 渲染） */
  introSegments?: WikiIntroSegment[]
  /** 特征 chip · 公共块编码 */
  featureRefs?: string[]
  features?: string[]
  /** @deprecated 请用 bloom.soil；读取时作回退 */
  bloomSeason?: string
  origin?: string
  cultivar?: WikiAtlasCultivar
  productionRegions?: string[]
  distinguishFrom?: WikiAtlasDistinguish[]
}

/** 瓶插期 · 分季说明 */
export interface WikiBloomSeasonSpan {
  season: string
  days: string
  note?: string
}

/** 花期：瓶插天数 vs 土培自然花期 */
export interface WikiBloom {
  /** 插瓶能开（养）多久，如「约 5—10 天」 */
  vase?: string
  vaseNote?: string
  vaseBySeason?: WikiBloomSeasonSpan[]
  /** 土培自然花期，如「4—5 月」 */
  soil?: string
  soilNote?: string
}

/** 养护 · 摆放环境（词条化） */
export interface WikiCareEnvironment {
  light?: string
  airflow?: string
  placement?: string
  /** 需避开的因素，如乙烯水果、暖气直吹 */
  avoid?: string[]
}

/** 收到花后 · 醒花 */
export interface WikiCareWakeUp {
  summary?: string
  steps?: string[]
  trim?: string
  trimPosition?: string
  waterDepth?: string
  headClearance?: string
  duration?: string
  environment?: string
}

/** 养护 · 急救 */
export interface WikiCareEmergency {
  title?: string
  steps?: string[]
}

/** 切花常见现象 · 成因与预防（非重大损失，重在告知用户怎么防） */
export interface WikiCareCommonIssue {
  title: string
  cause: string
  prevention: string
}

/** 怎么养（插瓶 / 水养）— 顾客主路径 */
export interface WikiCareVase {
  summary?: string
  /** 能开多久（可与 bloom.vase 一致或展开） */
  vaseLife?: string
  vaseLifeNote?: string
  /** 收到后醒花（与日常养护分开） */
  wakeUp?: WikiCareWakeUp
  /** 怎么换水 */
  waterChange?: string
  trim?: string
  /** 修剪位置：切口相对水位、去叶范围等 */
  trimPosition?: string
  waterDepth?: string
  /** 字符串（旧）或结构化环境词条 */
  environment?: string | WikiCareEnvironment
  /** 保鲜剂、84 等 */
  additives?: string
  emergency?: WikiCareEmergency
  /** 切花易得现象：成因 + 预防 */
  commonIssues?: WikiCareCommonIssue[]
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

/** 花语 · 搭配建议 */
export interface WikiLanguagePairing {
  style: string
  flowers: string[]
  note?: string
}

export interface WikiLanguage {
  /** @deprecated 请用 paragraphs；读取时作回退 */
  summary?: string
  /** 花语正文段落（例文规模） */
  paragraphs?: string[]
  meaning?: string
  occasions?: string[]
  colorMeanings?: WikiColorMeaning[]
  pairing?: WikiLanguagePairing[]
  /** 送花前注意 */
  caution?: string
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
  /** 种类养护底稿块编码（云库；前端 overlay 同名字段） */
  careBaseRef?: string
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
  /** 语言/花语 */
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
  /** 别称（如 紫阳花、八仙花 → 归并到 kindName） */
  aliases?: string[]
}

export function wikiKindLabel(item: Pick<FlowerWikiListItem, 'kindName'>): string {
  return String(item.kindName || '').trim()
}

export function wikiVarietyLabel(item: Pick<FlowerWikiListItem, 'varietyName'>): string {
  return String(item.varietyName || '').trim()
}

/** 列表/卡片主标题：有品种用品种名，否则用种类名 */
export function getWikiDisplayName(item: Pick<FlowerWikiListItem, 'kindName' | 'varietyName'>): string {
  const variety = wikiVarietyLabel(item)
  const kind = wikiKindLabel(item)
  return variety || kind
}

/** 管理/素材等需区分类种时的完整标签：「品种 · 种类」 */
export function getWikiFullLabel(item: Pick<FlowerWikiListItem, 'kindName' | 'varietyName'>): string {
  const variety = wikiVarietyLabel(item)
  const kind = wikiKindLabel(item)
  if (variety && kind && variety !== kind) return `${variety} · ${kind}`
  return variety || kind
}

export function getWikiSubtitle(item: Pick<FlowerWikiListItem, 'kindName' | 'varietyName'>): string {
  const variety = wikiVarietyLabel(item)
  const kind = wikiKindLabel(item)
  if (variety && kind) return kind
  return '花卉品类'
}

/** 商品关联花材的展示名（详情 tag、推荐分类等） */
export function getGoodsFlowerDisplayLabel(goods: {
  flowerKindName?: string
  flowerVarietyName?: string
}): string {
  const variety = String(goods.flowerVarietyName || '').trim()
  const kind = String(goods.flowerKindName || '').trim()
  if (variety && kind && variety !== kind) return `${variety} · ${kind}`
  return variety || kind
}

export function getGoodsFlowerKindLabel(goods: { flowerKindName?: string }): string {
  return String(goods.flowerKindName || '').trim()
}

export function getGoodsFlowerVarietyLabel(goods: { flowerVarietyName?: string }): string {
  return String(goods.flowerVarietyName || '').trim()
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
  return WIKI_TAXONOMY_LABELS.map(({ key }) => String(taxonomy[key] || '').trim())
    .filter(Boolean)
    .join(' · ')
}

/** 形态特征词 + 搜索标签（去重） */
export function getWikiFeatureKeywords(wiki: FlowerWiki): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of [...(wiki.atlas?.features || []), ...(wiki.tags || [])]) {
    const text = String(raw || '').trim()
    if (!text) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(text)
  }
  return out
}

function wikiIntroClosingLine(summary: string): string {
  const text = summary.trim()
  if (!text) return '在鲜切花应用中具有广泛的栽培与流通价值。'
  const sentence = text.split(/[。！？]/).map((part) => part.trim()).find(Boolean) || text
  return sentence.endsWith('。') ? sentence : `${sentence}。`
}

/** 科普体简介（分类 / 名称 / 特征以文档式强调呈现） */
export function buildWikiAtlasIntroSegments(wiki: FlowerWiki): WikiIntroSegment[] {
  const segments: WikiIntroSegment[] = []
  const displayName = getWikiDisplayName(wiki)
  const taxonomyLine = formatWikiTaxonomy(wiki.taxonomy)
  const scientificName = wiki.names?.scientificName?.trim() || ''
  const summary = wiki.atlas?.summary?.trim() || ''
  const features = (wiki.atlas?.features || [])
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 4)

  segments.push({ kind: 'text', text: displayName })
  if (scientificName) {
    segments.push({ kind: 'text', text: '（' })
    segments.push({ kind: 'marker', type: 'scientificName', value: scientificName })
    segments.push({ kind: 'text', text: '）' })
  }
  segments.push({ kind: 'text', text: '隶属于' })
  if (taxonomyLine) {
    segments.push({ kind: 'marker', type: 'taxonomy', value: taxonomyLine })
  } else {
    segments.push({ kind: 'text', text: '常见栽培花卉类群' })
  }
  segments.push({ kind: 'text', text: '。' })

  const commons = (wiki.names?.commonNames || []).map((n) => n.trim()).filter(Boolean)
  const aliasNames = commons.filter((name) => name !== displayName).slice(0, 4)
  if (aliasNames.length) {
    segments.push({ kind: 'text', text: '常见名称包括' })
    segments.push({ kind: 'marker', type: 'commonNames', values: aliasNames })
    segments.push({ kind: 'text', text: '等。' })
  }

  if (features.length) {
    segments.push({ kind: 'text', text: '植株典型特征为' })
    features.forEach((feature, index) => {
      if (index > 0) segments.push({ kind: 'text', text: '、' })
      segments.push({ kind: 'marker', type: 'feature', value: feature })
    })
    segments.push({ kind: 'text', text: '。' })
  }

  segments.push({ kind: 'text', text: wikiIntroClosingLine(summary) })
  return segments
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

const DEFAULT_VASE_TRIM = '斜剪 45° 增加吸水面积'
const DEFAULT_VASE_TRIM_POSITION =
  '切口保持在水面以上；去除浸水叶片，仅保留花头附近健康叶'

function inferTrimNoteFromTips(tips: string[]): string {
  for (const tip of tips) {
    const text = String(tip || '').trim()
    if (/斜剪|剪根|修根|剪茎|修剪|十字剪|平剪|烫茎/.test(text)) return text
  }
  return ''
}

function inferDefaultWaterDepth(waterChange: string): string {
  const text = String(waterChange || '').trim()
  if (/浅水|水位不宜过深|少量|见干见湿/.test(text)) {
    return '浅水养护，水深约花瓶 1/4，没过茎部切口 1—2 cm'
  }
  return '水深约花瓶 1/3，没过茎部切口 2—3 cm'
}

function shouldDefaultCutVaseTrim(wiki: FlowerWiki, summary: string, waterChange: string): boolean {
  if (wiki.plantForm === 'potted') return false
  const intro = `${summary} ${waterChange}`.trim()
  if (/以盆栽|盆栽观赏为主/.test(intro) && !/切花|瓶插/.test(intro)) return false
  return !!intro
}

export function resolveWikiCareVase(wiki: FlowerWiki) {
  const c = wiki.careVase || {}
  const g = wiki.careGuide || {}
  const summary = (c.summary || g.summary || '').trim()
  const waterChange = (c.waterChange || '').trim()
  const tips = (c.tips?.length ? c.tips : g.tips || []).filter(Boolean)
  const allowDefaultTrim = shouldDefaultCutVaseTrim(wiki, summary, waterChange)
  const wakeUp = normalizeWikiCareWakeUp(c.wakeUp)

  let trim = (c.trim || '').trim() || inferTrimNoteFromTips(tips)
  if (!trim && allowDefaultTrim) trim = DEFAULT_VASE_TRIM

  let trimPosition = (c.trimPosition || '').trim()
  if (!trimPosition && allowDefaultTrim) trimPosition = DEFAULT_VASE_TRIM_POSITION

  let waterDepth = (c.waterDepth || '').trim()
  if (!waterDepth && allowDefaultTrim) waterDepth = inferDefaultWaterDepth(waterChange)

  return {
    summary,
    vaseLife: (c.vaseLife || wiki.bloom?.vase || '').trim(),
    vaseLifeNote: (c.vaseLifeNote || wiki.bloom?.vaseNote || '').trim(),
    wakeUp,
    waterChange,
    trim,
    trimPosition,
    waterDepth,
    environment: normalizeWikiCareEnvironment(c.environment),
    additives: (c.additives || '').trim(),
    emergency: normalizeWikiCareEmergency(c.emergency),
    commonIssues: normalizeWikiCareCommonIssues(c.commonIssues),
    tips,
  }
}

function normalizeWikiCareCommonIssues(raw?: WikiCareCommonIssue[]) {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => ({
      title: String(item?.title || '').trim(),
      cause: String(item?.cause || '').trim(),
      prevention: String(item?.prevention || '').trim(),
    }))
    .filter((item) => item.title && (item.cause || item.prevention))
}

function normalizeWikiCareWakeUp(raw?: WikiCareWakeUp) {
  if (!raw || typeof raw !== 'object') {
    return {
      summary: '',
      steps: [] as string[],
      trim: '',
      trimPosition: '',
      waterDepth: '',
      headClearance: '',
      duration: '',
      environment: '',
    }
  }
  return {
    summary: String(raw.summary || '').trim(),
    steps: (raw.steps || []).map((item) => String(item || '').trim()).filter(Boolean),
    trim: String(raw.trim || '').trim(),
    trimPosition: String(raw.trimPosition || '').trim(),
    waterDepth: String(raw.waterDepth || '').trim(),
    headClearance: String(raw.headClearance || '').trim(),
    duration: String(raw.duration || '').trim(),
    environment: String(raw.environment || '').trim(),
  }
}

function normalizeWikiCareEmergency(raw?: WikiCareEmergency) {
  if (!raw || typeof raw !== 'object') {
    return { title: '', steps: [] as string[] }
  }
  return {
    title: String(raw.title || '').trim(),
    steps: (raw.steps || []).map((item) => String(item || '').trim()).filter(Boolean),
  }
}

/** 环境字段：兼容旧版字符串 */
export function normalizeWikiCareEnvironment(
  environment?: string | WikiCareEnvironment,
): WikiCareEnvironment {
  if (!environment) return {}
  if (typeof environment === 'string') {
    const text = environment.trim()
    return text ? { placement: text } : {}
  }
  return {
    light: String(environment.light || '').trim(),
    airflow: String(environment.airflow || '').trim(),
    placement: String(environment.placement || '').trim(),
    avoid: (environment.avoid || []).map((item) => String(item || '').trim()).filter(Boolean),
  }
}

export function environmentToLegacyText(environment: WikiCareEnvironment): string {
  return [environment.light, environment.airflow, environment.placement, ...(environment.avoid || [])]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join('；')
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
  const paragraphs = asWikiArticleParagraphs(
    lang.paragraphs,
    lang.paragraphs?.length ? undefined : lang.summary,
  )
  const pairing = (lang.pairing || [])
    .map((item) => ({
      style: String(item?.style || '').trim(),
      flowers: (item?.flowers || []).map((f) => String(f || '').trim()).filter(Boolean),
      note: String(item?.note || '').trim(),
    }))
    .filter((item) => item.style || item.flowers.length)
  return {
    summary: lang.summary?.trim() || '',
    paragraphs,
    meaning: lang.meaning?.trim() || '',
    occasions: occasions.length ? occasions : (wiki.occasions || []).filter(Boolean),
    colorMeanings: (lang.colorMeanings || []).filter((item) => item.color || item.meaning),
    pairing,
    caution: lang.caution?.trim() || '',
  }
}

export function resolveWikiAtlas(wiki: FlowerWiki) {
  const atlas = wiki.atlas || {}
  const scientificName = wiki.names?.scientificName?.trim() || ''
  const commonNames = formatWikiCommonNames(wiki.names)
  const entryLabel = getWikiFullLabel(wiki)
  const features = (atlas.features || []).map((item) => String(item || '').trim()).filter(Boolean)
  const paragraphs = asWikiArticleParagraphs(atlas.paragraphs, atlas.summary)
  const distinguishFrom = (atlas.distinguishFrom || [])
    .map((item) => ({
      name: String(item?.name || '').trim(),
      difference: String(item?.difference || '').trim(),
    }))
    .filter((item) => item.name && item.difference)
  let introSegments: WikiIntroSegment[] = []
  if (atlas.intro?.identity) {
    introSegments = composeAtlasIntroSegments(
      atlas.intro,
      getWikiDisplayName(wiki),
      distinguishFrom,
      wiki.names,
    )
  } else if (!paragraphs.length && !atlas.intro) {
    introSegments = buildWikiAtlasIntroSegments(wiki)
  }
  const hasArticleBody = paragraphs.length > 0 && !introSegments.length
  const vaseLife = getWikiVaseLifeDisplay(wiki).trim()
  const vaseLifeDays = parseVaseLifeDays(vaseLife)
  const cultivar = atlas.cultivar || {}
  const productionRegions = (atlas.productionRegions || [])
    .map((item) => String(item || '').trim())
    .filter(Boolean)
  const vaseBySeason = (wiki.bloom?.vaseBySeason || [])
    .map((item) => ({
      season: String(item?.season || '').trim(),
      days: String(item?.days || '').trim(),
      note: String(item?.note || '').trim(),
    }))
    .filter((item) => item.season && item.days)

  return {
    summary: atlas.summary?.trim() || '',
    paragraphs,
    hasArticleBody,
    features,
    introSegments,
    vaseLife,
    vaseLifeDays,
    vaseNote: wiki.bloom?.vaseNote?.trim() || '',
    vaseBySeason,
    soilBloom: getWikiSoilBloomDisplay(wiki).trim(),
    soilNote: wiki.bloom?.soilNote?.trim() || '',
    origin: atlas.origin?.trim() || '',
    cultivar: {
      horticulturalGroup: String(cultivar.horticulturalGroup || '').trim(),
      breeder: String(cultivar.breeder || '').trim(),
      introducedYear: String(cultivar.introducedYear || '').trim(),
      namingNote: String(cultivar.namingNote || '').trim(),
    },
    productionRegions,
    distinguishFrom,
    taxonomyRows: WIKI_TAXONOMY_LABELS.map(({ key, label }) => ({
      label,
      value: String(wiki.taxonomy?.[key] || '').trim(),
    })).filter((row) => row.value),
    taxonomyLine: formatWikiTaxonomy(wiki.taxonomy),
    entryLabel,
    scientificName,
    commonNames,
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
      paragraphs: Array.isArray(raw.language?.paragraphs) ? raw.language.paragraphs : [],
      meaning: raw.language?.meaning || '',
      occasions: Array.isArray(raw.language?.occasions) ? raw.language.occasions : [],
      colorMeanings: Array.isArray(raw.language?.colorMeanings) ? raw.language.colorMeanings : [],
      pairing: Array.isArray(raw.language?.pairing) ? raw.language.pairing : [],
      caution: raw.language?.caution || '',
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
  const wake = c.wakeUp
  return !!(
    c.summary ||
    c.vaseLife ||
    c.vaseLifeNote ||
    wake.summary ||
    wake.steps.length ||
    wake.trim ||
    wake.waterDepth ||
    c.waterChange ||
    c.trim ||
    c.trimPosition ||
    c.waterDepth ||
    environmentToLegacyText(c.environment) ||
    c.additives ||
    c.emergency.title ||
    c.emergency.steps.length ||
    c.commonIssues.length ||
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
