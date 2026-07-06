import type { WikiAtlasDistinguish } from '@/types/wiki'
import type { WikiBlockId } from '@/types/wikiBlocks'
import {
  defaultCareBaseRef,
  listCareBaseBlockOptions,
  listGroupBlockOptions,
  listTaxonomyBlockOptions,
  WIKI_OCCASION_OPTIONS,
} from '@/utils/wikiBlockCatalog'
import {
  getWikiBlockRegistry,
  resolveCareVaseBlock,
  resolveGroupLabel,
  resolveRegionLabel,
  resolveTraitLabel,
} from '@/utils/wikiBlockRegistry'
import {
  joinLines,
  type WikiArticleEditForm,
  type WikiColorMeaningRow,
} from '@/utils/wikiMerchantForm'

export type WikiSmartPasteFieldKey =
  | 'scientificName'
  | 'commonNamesText'
  | 'breeder'
  | 'introducedYear'
  | 'namingNote'
  | 'breedingOrigin'
  | 'productionRegions'
  | 'horticulturalGroup'
  | 'taxonomyRef'
  | 'flowerForm'
  | 'featureRefs'
  | 'petalCount'
  | 'bloomDiameterCm'
  | 'color'
  | 'stem'
  | 'foliage'
  | 'scent'
  | 'bloomVase'
  | 'bloomVaseNote'
  | 'bloomSoil'
  | 'careSummary'
  | 'careWaterChange'
  | 'careTrim'
  | 'careWaterDepth'
  | 'careTipsText'
  | 'languageMeaning'
  | 'languageParagraphsText'
  | 'languageCaution'
  | 'aliasesText'
  | 'tagsText'
  | 'occasions'
  | 'colorMeanings'
  | 'distinguishFrom'
  | 'introBody'
  | 'careBaseRef'

export type WikiSmartPasteConfidence = 'high' | 'medium' | 'low'

export interface WikiSmartPasteParsed {
  fields: Partial<Record<WikiSmartPasteFieldKey, unknown>>
}

export interface WikiSmartPasteMatch {
  key: WikiSmartPasteFieldKey
  label: string
  parsedDisplay: string
  currentDisplay: string
  parsedValue: unknown
  confidence: WikiSmartPasteConfidence
  changed: boolean
  selected: boolean
}

const FIELD_LABELS: Record<WikiSmartPasteFieldKey, string> = {
  scientificName: '学名',
  commonNamesText: '俗名',
  breeder: '育种者',
  introducedYear: '推出年代',
  namingNote: '命名说明',
  breedingOrigin: '育种地',
  productionRegions: '主产区',
  horticulturalGroup: '园艺分类',
  taxonomyRef: '生物学分类',
  flowerForm: '花型',
  featureRefs: '特征 chip',
  petalCount: '瓣数',
  bloomDiameterCm: '花径',
  color: '色泽',
  stem: '茎',
  foliage: '叶',
  scent: '香气',
  bloomVase: '瓶插天数',
  bloomVaseNote: '花期说明',
  bloomSoil: '土培花期',
  careSummary: '养护摘要',
  careWaterChange: '换水',
  careTrim: '修剪',
  careWaterDepth: '水深',
  careTipsText: '养护 tips',
  languageMeaning: '核心花语',
  languageParagraphsText: '花语正文',
  languageCaution: '送花注意',
  aliasesText: '别称',
  tagsText: '标签',
  occasions: '适用场合',
  colorMeanings: '色彩寓意',
  distinguishFrom: '易混辨识',
  introBody: '介绍长文',
  careBaseRef: '养护底稿（公共块）',
}

const TRAIT_HINTS: Array<{ pattern: RegExp; id: WikiBlockId }> = [
  { pattern: /高杯|杯状|卷心/, id: 'trait.cup_heart' },
  { pattern: /卷边|反卷|卷瓣/, id: 'trait.recurved_petal' },
  { pattern: /丝绒/, id: 'trait.velvet_texture' },
  { pattern: /玫红|丝绒感/, id: 'trait.velvet_magenta' },
  { pattern: /团状|花球|毛绒|重瓣/, id: 'trait.spray_ball' },
  { pattern: /大花|花径\s*\d+\s*cm/i, id: 'trait.huge_flower' },
  { pattern: /淡香|清香|几乎无香/, id: 'trait.gentle_scent' },
  { pattern: /浓香/, id: 'trait.strong_scent' },
  { pattern: /正红|经典红/, id: 'trait.classic_red' },
  { pattern: /金黄|明黄/, id: 'trait.yellow_gold' },
]

const REGION_HINTS: Array<{ pattern: RegExp; id: WikiBlockId }> = [
  { pattern: /云南/, id: 'region.yunnan' },
  { pattern: /哥伦比亚/, id: 'region.colombia' },
]

const GROUP_HINTS: Array<{ pattern: RegExp; id: WikiBlockId }> = [
  { pattern: /杂交茶香|Hybrid Tea/i, id: 'group.hybrid_tea' },
  { pattern: /切花向日葵/, id: 'group.sunflower_cut' },
  { pattern: /大花绣球/, id: 'group.hydrangea_mophead' },
  { pattern: /草本芍药/, id: 'group.herbaceous_peony' },
  { pattern: /单瓣郁金香/, id: 'group.tulip_single' },
]

function normalizePasteText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/百度(?:百科|知道|一下)|百度百科|词条|编辑|播报|讨论|收藏|分享/g, ' ')
    .replace(/举报|展开(?:全部)?|收起|查看更多|相关视频/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function extractSection(text: string, titles: string[]): string {
  const titlePattern = titles.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const re = new RegExp(
    `(?:^|\\n)\\s*(?:#{1,3}\\s*)?(?:${titlePattern})\\s*[：:\\n]\\s*([\\s\\S]*?)(?=\\n\\s*(?:#{1,3}\\s*)?(?:介绍|图鉴|品种|形态|养护|怎么养|换水|修剪|花语|寓意|送花|适用|产地|特征|易混|瓶插|花期)|$)`,
    'i',
  )
  const match = text.match(re)
  return match?.[1]?.trim() || ''
}

function firstMatch(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const m = text.match(pattern)
    if (m?.[1]?.trim()) return m[1].trim()
  }
  return ''
}

function matchBlockIds(
  text: string,
  options: { prefix: string; resolveLabel: (id: WikiBlockId) => string },
): WikiBlockId[] {
  const registry = getWikiBlockRegistry()
  const hits: WikiBlockId[] = []
  const seen = new Set<string>()
  for (const id of Object.keys(registry)) {
    if (!id.startsWith(`${options.prefix}.`)) continue
    const label = options.resolveLabel(id as WikiBlockId)
    if (label && text.includes(label) && !seen.has(id)) {
      seen.add(id)
      hits.push(id as WikiBlockId)
    }
  }
  return hits
}

function matchTraitRefs(text: string): WikiBlockId[] {
  const fromLabels = matchBlockIds(text, { prefix: 'trait', resolveLabel: resolveTraitLabel })
  const seen = new Set(fromLabels)
  for (const hint of TRAIT_HINTS) {
    if (hint.pattern.test(text) && !seen.has(hint.id)) {
      seen.add(hint.id)
      fromLabels.push(hint.id)
    }
  }
  return fromLabels
}

function matchRegions(text: string): WikiBlockId[] {
  const fromLabels = matchBlockIds(text, { prefix: 'region', resolveLabel: resolveRegionLabel })
  const seen = new Set(fromLabels)
  for (const hint of REGION_HINTS) {
    if (hint.pattern.test(text) && !seen.has(hint.id)) {
      seen.add(hint.id)
      fromLabels.push(hint.id)
    }
  }
  return fromLabels
}

function matchCareBaseRef(text: string, kindName: string): WikiBlockId | '' {
  const careSection = extractSection(text, ['养护', '怎么养', '养护方式', '瓶插养护', '日常养护', '换水'])
  if (!careSection && !/养护底稿/.test(text)) return ''

  const explicit = firstMatch(text, [/养护底稿[：:\s]*([^。；\n]{1,16})/])
  const kindHint = (explicit || kindName).trim()
  const byKind = kindHint ? defaultCareBaseRef(kindHint) : ''
  if (byKind) return byKind

  for (const opt of listCareBaseBlockOptions()) {
    if (opt.label && text.includes(opt.label)) return opt.id as WikiBlockId
  }
  return kindName ? defaultCareBaseRef(kindName) : ''
}

function matchGroupRef(text: string): WikiBlockId | '' {
  for (const hint of GROUP_HINTS) {
    if (hint.pattern.test(text)) return hint.id
  }
  for (const opt of listGroupBlockOptions()) {
    const shortLabel = opt.label.split('（')[0]
    if (shortLabel && text.includes(shortLabel)) return opt.id as WikiBlockId
  }
  return ''
}

function matchTaxonomyRef(text: string, kindName: string): WikiBlockId | '' {
  if (kindName) {
    const byKind = listTaxonomyBlockOptions().find((opt) => opt.label.includes(kindName))
    if (byKind) return byKind.id as WikiBlockId
  }
  for (const opt of listTaxonomyBlockOptions()) {
    if (text.includes(opt.label)) return opt.id as WikiBlockId
  }
  return ''
}

function extractOccasions(text: string): string[] {
  return WIKI_OCCASION_OPTIONS.filter((item) => text.includes(item))
}

function extractColorMeanings(text: string): WikiColorMeaningRow[] {
  const rows: WikiColorMeaningRow[] = []
  const re = /([红橙黄绿青蓝紫白粉香槟金][色]?)[：:，,\s]+([^。；\n]{4,40})/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    rows.push({ color: m[1].replace(/色$/, '') + '色', meaning: m[2].trim() })
  }
  return rows.slice(0, 4)
}

function extractDistinguish(text: string): WikiAtlasDistinguish[] {
  const section = extractSection(text, ['易混', '辨别', '区分', '对比'])
  if (!section) return []
  const rows: WikiAtlasDistinguish[] = []
  for (const line of section.split(/\n+/)) {
    const m = line.match(/^(.{2,12})[：:—\-]\s*(.+)$/)
    if (m) rows.push({ name: m[1].trim(), difference: m[2].trim() })
  }
  return rows.slice(0, 4)
}

function extractEnglishNames(text: string): string[] {
  const names: string[] = []
  const quoted = text.matchAll(/[''""]([A-Za-z][A-Za-z0-9\s'-]{1,40})[''""]/g)
  for (const m of quoted) {
    if (m[1]) names.push(m[1].trim())
  }
  const paren = text.matchAll(/[（(]([A-Za-z][A-Za-z0-9\s'-]{1,40})[)）]/g)
  for (const m of paren) {
    if (m[1] && !names.includes(m[1].trim())) names.push(m[1].trim())
  }
  return names.slice(0, 5)
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/\n/g, '').trim())
    .filter((p) => p.length >= 12)
}

/** 从搜索引擎 / 百科粘贴文本识别词条字段 */
export function parseWikiSmartPaste(raw: string, kindName = ''): WikiSmartPasteParsed {
  const text = normalizePasteText(raw)
  if (!text) return { fields: {} }

  const introSection = extractSection(text, ['介绍', '图鉴', '品种介绍', '品种背景', '概述']) || text.slice(0, 1200)
  const atlasSection = extractSection(text, ['图鉴', '形态', '品种特征'])
  const introAndAtlas = [introSection, atlasSection].filter(Boolean).join('\n\n') || introSection
  const careSection = extractSection(text, ['养护', '怎么养', '养护方式', '瓶插养护', '日常养护', '换水'])
  const languageSection = extractSection(text, ['花语', '寓意', '象征', '送花物语', '情感表达'])
  const bloomSection = extractSection(text, ['花期', '瓶插', '能开多久', '开放天数']) || introAndAtlas
  const searchSection = extractSection(text, ['搜索', '别称', '标签'])

  const fields: WikiSmartPasteParsed['fields'] = {}

  const scientificName = firstMatch(text, [
    /学名[：:\s]*([A-Za-z][A-Za-z0-9\s×x.'\-]{2,60})/i,
    /([A-Za-z]+(?:\s×\s*[A-Za-z]+)?\s*'[^']+')/,
    /([A-Za-z]+\s+[a-z]+(?:\s+var\.|\s+')[^。，\n]{0,40})/,
  ])
  if (scientificName) fields.scientificName = scientificName

  const englishNames = extractEnglishNames(text)
  if (englishNames.length) fields.commonNamesText = englishNames.join('，')

  const breeder = firstMatch(introAndAtlas, [
    /由\s*([^，。；\n]{2,24}(?:公司|集团|研究院|育种))/,
    /(?:育种(?:者|商|单位))[：:\s]*([^，。；\n]{2,24})/,
    /((?:荷兰|法国|日本|以色列|厄瓜多尔|哥伦比亚)[^，。；\n]{0,12}(?:公司|育种))/,
  ])
  if (breeder) fields.breeder = breeder

  const introducedYear = firstMatch(introAndAtlas, [
    /(19\d{2}\s*年)/,
    /(20\d{2}\s*年(?:前后)?)/,
    /(\d{4}\s*年代(?:起|前后)?)/,
    /(约?\s*\d{4}\s*年前后)/,
  ])
  if (introducedYear) fields.introducedYear = introducedYear.replace(/\s+/g, '')

  const breedingOrigin = firstMatch(introAndAtlas, [
    /(?:育(?:种)?地|原产地)[：:\s]*([^，。；\n]{2,12})/,
    /(荷兰|厄瓜多尔|哥伦比亚|云南|中国|法国|日本)/,
  ])
  if (breedingOrigin) fields.breedingOrigin = breedingOrigin

  const petalCount = firstMatch(introAndAtlas, [
    /(\d+\s*[至到\-—~]\s*\d+\s*枚(?:瓣)?)/,
    /(花瓣(?:数)?(?:约)?\s*\d+[^。，\n]{0,16})/,
    /(多层重瓣[^。，\n]{0,12})/,
  ])
  if (petalCount) fields.petalCount = petalCount

  const bloomDiameterCm = firstMatch(introAndAtlas, [
    /花径(?:约)?\s*(\d+\s*[至到\-—~]\s*\d+)\s*(?:cm|厘米)?/i,
    /(直径(?:约)?\s*\d+\s*[至到\-—~]\s*\d+\s*(?:cm|厘米)?)/i,
  ])
  if (bloomDiameterCm) fields.bloomDiameterCm = bloomDiameterCm.replace(/[^\d至到\-—~\s]/g, '').trim()

  const color = firstMatch(introAndAtlas, [
    /((?:纯正|浓郁|明亮|柔和)?[^，。；\n]{0,8}(?:红|玫红|粉|白|黄|香槟|紫|蓝|绿|金|橙)[色]?[^，。；\n]{0,20}(?:色调|色泽|颜色|外观))/,
    /(色泽[：:\s]*[^。；\n]{6,80})/,
  ])
  if (color) fields.color = color.replace(/^色泽[：:\s]*/, '')

  const stem = firstMatch(introAndAtlas, [/((?:茎干|花茎)[^。；\n]{4,60})/, /(茎[^。；\n]{4,40})/])
  if (stem) fields.stem = stem

  const foliage = firstMatch(introAndAtlas, [/(叶[^。；\n]{4,40})/])
  if (foliage) fields.foliage = foliage

  const scent = firstMatch(introAndAtlas, [
    /((?:带有?|散发)?(?:淡淡|轻微|浓郁)?[^。；\n]{0,6}(?:香|香气|芬芳)[^。；\n]{0,20})/,
    /(几乎无香)/,
  ])
  if (scent) fields.scent = scent

  const bloomVase = firstMatch(bloomSection, [
    /(约?\s*\d+\s*[—\-~至到]\s*\d+\s*天)/,
    /(瓶插[^。；\n]{0,16}?\d+\s*[—\-~至到]\s*\d+\s*天)/,
  ])
  if (bloomVase) fields.bloomVase = bloomVase.replace(/^[^约]*?(约)/, '$1')

  const bloomSoil = firstMatch(text, [/(自然花期[：:\s]*[^。；\n]{2,20})/, /(土培[^。；\n]{2,20})/])
  if (bloomSoil) fields.bloomSoil = bloomSoil

  const bloomVaseNote = firstMatch(bloomSection, [
    /(夏季[^。；\n]{0,20})/,
    /(冬季[^。；\n]{0,20})/,
    /(养护(?:得)?当[^。；\n]{0,24})/,
  ])
  if (bloomVaseNote) fields.bloomVaseNote = bloomVaseNote

  if (careSection) {
    const careSummary = firstMatch(careSection, [/^([^。；\n]{12,120})/])
    if (careSummary) fields.careSummary = careSummary

    const waterChange = firstMatch(careSection, [
      /(换水[^。；\n]{4,80})/,
      /(每日换水[^。；\n]{0,40})/,
    ])
    if (waterChange) fields.careWaterChange = waterChange

    const trim = firstMatch(careSection, [/(斜剪[^。；\n]{4,60})/, /(修剪[^。；\n]{4,60})/])
    if (trim) fields.careTrim = trim

    const waterDepth = firstMatch(careSection, [
      /(水位[^。；\n]{4,40})/,
      /(花瓶[^。；\n]{0,12}?\d+\s*\/\s*\d+[^。；\n]{0,20})/,
    ])
    if (waterDepth) fields.careWaterDepth = waterDepth

    const tips = careSection
      .split(/[。；\n]/)
      .map((line) => line.trim())
      .filter((line) => /^(避免|注意|忌|勿|建议|可)/.test(line) && line.length >= 6)
    if (tips.length) fields.careTipsText = tips.slice(0, 5)
  }

  const languageMeaning = firstMatch(languageSection || text, [
    /花语[：:\s]*([^。；\n]{4,80})/,
    /寓意[：:\s]*([^。；\n]{4,80})/,
    /象征[：:\s]*([^。；\n]{4,80})/,
  ])
  if (languageMeaning) fields.languageMeaning = languageMeaning

  const langParas = splitParagraphs(languageSection)
  if (langParas.length) fields.languageParagraphsText = langParas.join('\n\n')

  const caution = firstMatch(languageSection || text, [
    /(送花(?:时|前)?注意[^。；\n]{4,80})/,
    /(注意[：:\s][^。；\n]{6,80})/,
  ])
  if (caution) fields.languageCaution = caution

  const introParas = splitParagraphs(introSection)
  if (introParas.length >= 2) fields.introBody = introParas.join('\n\n')

  const namingNote = firstMatch(introAndAtlas, [
    /(品种名[^。；\n]{4,80})/,
    /(又称[^。；\n]{4,60})/,
    /(致敬[^。；\n]{4,60})/,
  ])
  if (namingNote) fields.namingNote = namingNote

  const regions = matchRegions(text)
  if (regions.length) fields.productionRegions = regions

  const traitRefs = matchTraitRefs(text)
  if (traitRefs.length) {
    fields.featureRefs = traitRefs
    fields.flowerForm = traitRefs.slice(0, 2)
  }

  const group = matchGroupRef(introAndAtlas)
  if (group) fields.horticulturalGroup = group

  const taxonomy = matchTaxonomyRef(text, kindName)
  if (taxonomy) fields.taxonomyRef = taxonomy

  const occasions = extractOccasions(languageSection || text)
  if (occasions.length) fields.occasions = occasions

  const colorMeanings = extractColorMeanings(languageSection || text)
  if (colorMeanings.length) fields.colorMeanings = colorMeanings

  const distinguishFrom = extractDistinguish(text)
  if (distinguishFrom.length) fields.distinguishFrom = distinguishFrom

  const careBase = matchCareBaseRef(text, kindName)
  if (careBase) fields.careBaseRef = careBase

  const aliasesFromSearch = firstMatch(searchSection, [/别称[：:\s]*([^。；\n]+)/])
  if (aliasesFromSearch) {
    fields.aliasesText = aliasesFromSearch
  } else if (englishNames.length) {
    fields.aliasesText = englishNames.join('，')
  }

  const tagsFromSearch = firstMatch(searchSection, [/标签[：:\s]*([^。；\n]+)/])
  if (tagsFromSearch) {
    fields.tagsText = tagsFromSearch
  } else {
    const tagCandidates = traitRefs.map(resolveTraitLabel).filter(Boolean)
    if (tagCandidates.length) fields.tagsText = tagCandidates.join('，')
  }

  return { fields }
}

function displayFieldValue(key: WikiSmartPasteFieldKey, value: unknown): string {
  if (value == null) return ''
  if (key === 'productionRegions' && Array.isArray(value)) {
    return (value as WikiBlockId[]).map(resolveRegionLabel).filter(Boolean).join('、')
  }
  if ((key === 'featureRefs' || key === 'flowerForm') && Array.isArray(value)) {
    return (value as WikiBlockId[]).map(resolveTraitLabel).filter(Boolean).join('、')
  }
  if (key === 'horticulturalGroup' || key === 'taxonomyRef' || key === 'careBaseRef') {
    const id = String(value || '')
    if (id.startsWith('care.')) {
      const care = resolveCareVaseBlock(id as WikiBlockId)
      return care?.summary?.slice(0, 40) || id.replace(/^care\./, '').replace(/\.vase_base$/, '')
    }
    if (id.startsWith('group.')) return resolveGroupLabel(id as WikiBlockId) || id
    if (id.startsWith('taxonomy.')) {
      const opt = listTaxonomyBlockOptions().find((item) => item.id === id)
      return opt?.label || id
    }
    return id
  }
  if (key === 'occasions' && Array.isArray(value)) return value.join('、')
  if (key === 'colorMeanings' && Array.isArray(value)) {
    return (value as WikiColorMeaningRow[]).map((r) => `${r.color}：${r.meaning}`).join('；')
  }
  if (key === 'distinguishFrom' && Array.isArray(value)) {
    return (value as WikiAtlasDistinguish[]).map((r) => `${r.name}—${r.difference}`).join('；')
  }
  if (key === 'careTipsText' && Array.isArray(value)) return joinLines(value as string[])
  if (typeof value === 'string') return value
  return String(value)
}

function readFormField(form: WikiArticleEditForm, key: WikiSmartPasteFieldKey): unknown {
  if (key === 'introBody') {
    return form.namingNote || form.color || ''
  }
  return (form as Record<string, unknown>)[key]
}

function formatFormField(form: WikiArticleEditForm, key: WikiSmartPasteFieldKey): string {
  return displayFieldValue(key, readFormField(form, key))
}

function valuesEqual(key: WikiSmartPasteFieldKey, a: unknown, b: unknown): boolean {
  return displayFieldValue(key, a) === displayFieldValue(key, b)
}

/** 识别结果与当前表单对照 */
export function compareWikiSmartPaste(
  parsed: WikiSmartPasteParsed,
  form: WikiArticleEditForm,
): WikiSmartPasteMatch[] {
  const matches: WikiSmartPasteMatch[] = []

  for (const key of Object.keys(parsed.fields) as WikiSmartPasteFieldKey[]) {
    const parsedValue = parsed.fields[key]
    if (parsedValue == null || parsedValue === '') continue
    if (Array.isArray(parsedValue) && !parsedValue.length) continue

    const currentValue = readFormField(form, key)
    const parsedDisplay = displayFieldValue(key, parsedValue)
    const currentDisplay = formatFormField(form, key)
    const changed = !valuesEqual(key, parsedValue, currentValue)

    let confidence: WikiSmartPasteConfidence = 'medium'
    if (['scientificName', 'bloomVase', 'languageMeaning'].includes(key)) confidence = 'high'
    if (['taxonomyRef', 'horticulturalGroup', 'careBaseRef', 'featureRefs', 'productionRegions'].includes(key)) {
      confidence = 'medium'
    }
    if (['tagsText', 'introBody', 'scent'].includes(key)) confidence = 'low'

    matches.push({
      key,
      label: FIELD_LABELS[key] || key,
      parsedDisplay: parsedDisplay.slice(0, 200),
      currentDisplay: currentDisplay.slice(0, 200) || '（空）',
      parsedValue,
      confidence,
      changed,
      selected: changed && parsedDisplay.length > 0,
    })
  }

  return matches.sort((a, b) => {
    if (a.selected !== b.selected) return a.selected ? -1 : 1
    const rank = { high: 0, medium: 1, low: 2 }
    return rank[a.confidence] - rank[b.confidence]
  })
}

/** 将勾选项写入表单（仅覆盖选中字段） */
export function applyWikiSmartPasteMatches(
  form: WikiArticleEditForm,
  matches: WikiSmartPasteMatch[],
): number {
  let applied = 0
  for (const match of matches) {
    if (!match.selected || !match.parsedDisplay) continue
    const key = match.key
    const value = match.parsedValue

    if (key === 'introBody' && typeof value === 'string') {
      if (!form.namingNote.trim()) form.namingNote = value.slice(0, 280)
      else if (!form.color.trim()) form.color = value.slice(0, 120)
      applied += 1
      continue
    }

    if (key === 'productionRegions' && Array.isArray(value)) {
      form.productionRegions = [...new Set([...form.productionRegions, ...(value as WikiBlockId[])])]
      applied += 1
      continue
    }

    if (key === 'featureRefs' && Array.isArray(value)) {
      form.featureRefs = value as WikiBlockId[]
      applied += 1
      continue
    }

    if (key === 'flowerForm' && Array.isArray(value)) {
      form.flowerForm = value as WikiBlockId[]
      applied += 1
      continue
    }

    if (key === 'occasions' && Array.isArray(value)) {
      form.occasions = [...new Set([...form.occasions, ...(value as string[])])]
      applied += 1
      continue
    }

    if (key === 'colorMeanings' && Array.isArray(value)) {
      form.colorMeanings = value as WikiColorMeaningRow[]
      applied += 1
      continue
    }

    if (key === 'distinguishFrom' && Array.isArray(value)) {
      form.distinguishFrom = value as WikiAtlasDistinguish[]
      applied += 1
      continue
    }

    if (key === 'careTipsText' && Array.isArray(value)) {
      form.careTipsText = joinLines(value as string[])
      applied += 1
      continue
    }

    if (key === 'languageParagraphsText' && typeof value === 'string') {
      form.languageParagraphsText = value
      applied += 1
      continue
    }

    if (typeof value === 'string') {
      ;(form as Record<string, unknown>)[key] = value
      applied += 1
    }
  }
  return applied
}

export function summarizeWikiSmartPaste(matches: WikiSmartPasteMatch[]) {
  return {
    recognized: matches.length,
    changed: matches.filter((m) => m.changed).length,
    selected: matches.filter((m) => m.selected).length,
  }
}
