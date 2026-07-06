import flowerIdentity from '../../shared/flower-identity.json'

export const LEGACY_WIKI_VARIETY_MAP = flowerIdentity.legacyVarietyMap as Record<string, string>
export const KIND_ABSORB_MAP = flowerIdentity.kindAbsorb as Record<string, string>

export const WIKI_CATEGORY_PREFIX = 'wiki:'

export function buildWikiCategoryId(kindName: string): string {
  const stableKindId = resolveStableKindId(kindName)
  return stableKindId ? `${WIKI_CATEGORY_PREFIX}${stableKindId}` : ''
}

export function parseWikiKindNameFromCategoryId(categoryId: string): string {
  const id = String(categoryId || '').trim()
  if (!id.startsWith(WIKI_CATEGORY_PREFIX)) return ''
  const rest = id.slice(WIKI_CATEGORY_PREFIX.length)
  if (rest.startsWith('kind:')) return rest.slice('kind:'.length)
  return rest
}

export function normalizeWikiCategoryId(categoryId: string, canonicalKindName = ''): string {
  const parsed = parseWikiKindNameFromCategoryId(categoryId)
  const kind = canonicalKindName || parsed
  return kind ? buildWikiCategoryId(absorbKindName(kind)) : ''
}

export function absorbKindName(rawKindName: string): string {
  const kind = String(rawKindName || '').trim()
  if (!kind) return ''
  return KIND_ABSORB_MAP[kind] || kind
}

export function resolveCanonicalWikiVarietyName(
  kindName: string,
  rawVarietyName: string,
  extraAliasMap?: Record<string, string>,
): string {
  const kind = absorbKindName(kindName)
  const name = String(rawVarietyName || '').trim()
  if (!kind || !name) return name

  const legacyKey = `${kind}:${name}`
  const fromLegacy = LEGACY_WIKI_VARIETY_MAP[legacyKey] || extraAliasMap?.[legacyKey]
  if (fromLegacy) return fromLegacy

  return name
}

export function buildVarietyIdentityKey(kindName: string, varietyName: string): string {
  const kind = absorbKindName(kindName)
  const variety = resolveCanonicalWikiVarietyName(kind, varietyName)
  return kind && variety ? `${kind}:${variety}` : ''
}

function slugifyIdentityPart(text: string): string {
  return String(text || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w\u4e00-\u9fff_-]/g, '')
}

export function resolveStableKindId(kindName: string): string {
  const canonical = absorbKindName(kindName)
  return canonical ? `kind:${slugifyIdentityPart(canonical)}` : ''
}

export function resolveStableVarietyId(
  kindName: string,
  varietyName: string,
  extraAliasMap?: Record<string, string>,
): string {
  const kind = absorbKindName(kindName)
  const variety = resolveCanonicalWikiVarietyName(kind, varietyName, extraAliasMap)
  const kindId = resolveStableKindId(kind)
  if (!kindId || !variety) return ''
  return `${kindId}:var:${slugifyIdentityPart(variety)}`
}
