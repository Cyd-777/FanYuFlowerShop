/**
 * 花卉身份解析 — 种类/品种 canonical 名单一入口。
 * 数据来自 shared/flower-identity.json（sync:cloud 复制到各 CF common/）。
 */
const path = require('path')

let identityData = null

function loadIdentityData() {
  if (identityData) return identityData
  try {
    identityData = require('./flowerIdentity.json')
  } catch {
    identityData = { legacyVarietyMap: {}, kindAbsorb: {} }
  }
  return identityData
}

function getLegacyVarietyMap() {
  return loadIdentityData().legacyVarietyMap || {}
}

function getKindAbsorbMap() {
  return loadIdentityData().kindAbsorb || {}
}

function absorbKindName(rawKindName) {
  const kind = String(rawKindName || '').trim()
  if (!kind) return ''
  return getKindAbsorbMap()[kind] || kind
}

function resolveCanonicalVarietyName(kindName, rawVarietyName, extraAliasMap = {}) {
  const kind = absorbKindName(kindName)
  const name = String(rawVarietyName || '').trim()
  if (!kind || !name) return name

  const legacyKey = `${kind}:${name}`
  const fromLegacy = getLegacyVarietyMap()[legacyKey] || extraAliasMap[legacyKey]
  if (fromLegacy) return fromLegacy

  return name
}

function buildVarietyIdentityKey(kindName, varietyName) {
  const kind = absorbKindName(kindName)
  const variety = resolveCanonicalVarietyName(kind, varietyName)
  return kind && variety ? `${kind}:${variety}` : ''
}

function slugifyIdentityPart(text) {
  return String(text || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w\u4e00-\u9fff_-]/g, '')
}

/** 稳定 kindId（展示名变更不影响关联） */
function resolveStableKindId(kindName) {
  const canonical = absorbKindName(kindName)
  return canonical ? `kind:${slugifyIdentityPart(canonical)}` : ''
}

/** 稳定 varietyId = kindId + variety slug */
function resolveStableVarietyId(kindName, varietyName, extraAliasMap = {}) {
  const kind = absorbKindName(kindName)
  const variety = resolveCanonicalVarietyName(kind, varietyName, extraAliasMap)
  const kindId = resolveStableKindId(kind)
  if (!kindId || !variety) return ''
  return `${kindId}:var:${slugifyIdentityPart(variety)}`
}

const WIKI_CATEGORY_PREFIX = 'wiki:'

/** 智库衍生分类 ID（稳定格式 wiki:kind:玫瑰；兼容旧 wiki:玫瑰） */
function buildWikiCategoryId(kindName) {
  const stableKindId = resolveStableKindId(kindName)
  return stableKindId ? `${WIKI_CATEGORY_PREFIX}${stableKindId}` : ''
}

function isWikiCategoryId(categoryId) {
  return String(categoryId || '').trim().startsWith(WIKI_CATEGORY_PREFIX)
}

/** 从 categoryId 解析 canonical 种类名（兼容 legacy / stable） */
function parseWikiKindNameFromCategoryId(categoryId) {
  const id = String(categoryId || '').trim()
  if (!isWikiCategoryId(id)) return ''
  const rest = id.slice(WIKI_CATEGORY_PREFIX.length)
  if (rest.startsWith('kind:')) return rest.slice('kind:'.length)
  return rest
}

/** 归一 wiki 分类 ID 便于比对（legacy 与 stable 等价） */
function normalizeWikiCategoryId(categoryId, canonicalKindName = '') {
  const parsed = parseWikiKindNameFromCategoryId(categoryId)
  const kind = canonicalKindName || parsed
  return kind ? buildWikiCategoryId(absorbKindName(kind)) : ''
}

module.exports = {
  getLegacyVarietyMap,
  getKindAbsorbMap,
  absorbKindName,
  resolveCanonicalVarietyName,
  buildVarietyIdentityKey,
  resolveStableKindId,
  resolveStableVarietyId,
  slugifyIdentityPart,
  WIKI_CATEGORY_PREFIX,
  buildWikiCategoryId,
  isWikiCategoryId,
  parseWikiKindNameFromCategoryId,
  normalizeWikiCategoryId,
}
