import type { WikiArticleEditForm } from '@/utils/wikiMerchantForm'

export type WikiExternalPrefillField =
  | keyof WikiArticleEditForm
  | 'taxonomyHint'
  | 'coverImageUrl'

export interface WikiExternalPrefillSuggestion {
  field: WikiExternalPrefillField
  label: string
  value: string
  source: 'wikipedia' | 'gbif'
  confidence: 'high' | 'medium' | 'low'
}

export interface WikiExternalPrefillResult {
  success: boolean
  errMsg?: string
  query?: string
  suggestions?: WikiExternalPrefillSuggestion[]
  wikipedia?: { title?: string; extract?: string; thumbnail?: string; pageUrl?: string } | null
  gbif?: { scientificName?: string; taxonomyLine?: string } | null
}

const FORM_FIELDS = new Set<keyof WikiArticleEditForm>([
  'scientificName',
  'commonNamesText',
  'namingNote',
  'aliasesText',
  'breedingOrigin',
  'breeder',
  'introducedYear',
  'color',
  'scent',
  'careSummary',
  'languageMeaning',
  'languageParagraphsText',
])

export function applyExternalPrefillSuggestions(
  form: WikiArticleEditForm,
  suggestions: WikiExternalPrefillSuggestion[],
  selectedFields: Set<string>,
): WikiArticleEditForm {
  const next = { ...form }
  for (const item of suggestions) {
    if (!selectedFields.has(item.field)) continue
    if (item.field === 'taxonomyHint' || item.field === 'coverImageUrl') continue
    if (!FORM_FIELDS.has(item.field as keyof WikiArticleEditForm)) continue
    const key = item.field as keyof WikiArticleEditForm
    const raw = String(item.value || '').trim()
    if (!raw) continue
    ;(next as Record<string, unknown>)[key] = raw
  }
  return next
}

export function mergeListField(existing: string, incoming: string): string {
  const parts = `${existing},${incoming}`
    .split(/[,，、]/)
    .map((s) => s.trim())
    .filter(Boolean)
  return [...new Set(parts)].join('，')
}
