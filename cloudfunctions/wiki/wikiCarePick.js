/**
 * 智库养护 / 图鉴 / 花语字段合并（doc ← article ← profile）
 */

function asStringArray(value) {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item).trim()).filter(Boolean)
}

function mergeStringArrays(primary, fallback) {
  const merged = [...asStringArray(primary), ...asStringArray(fallback)]
  const seen = new Set()
  return merged.filter((item) => {
    const key = item.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function pickEnvironment(raw, base) {
  const rawObj =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : null
  const baseObj =
    base && typeof base === 'object' && !Array.isArray(base) ? base : null
  if (rawObj || baseObj) {
    return {
      light: String(rawObj?.light || baseObj?.light || '').trim(),
      airflow: String(rawObj?.airflow || baseObj?.airflow || '').trim(),
      placement: String(rawObj?.placement || baseObj?.placement || '').trim(),
      avoid: mergeStringArrays(rawObj?.avoid, baseObj?.avoid),
    }
  }
  return String(raw || base || '').trim()
}

function pickWakeUp(raw, base) {
  const r = raw && typeof raw === 'object' ? raw : {}
  const b = base && typeof base === 'object' ? base : {}
  return {
    summary: String(r.summary || b.summary || '').trim(),
    steps: asStringArray(r.steps?.length ? r.steps : b.steps),
    trim: String(r.trim || b.trim || '').trim(),
    trimPosition: String(r.trimPosition || b.trimPosition || '').trim(),
    waterDepth: String(r.waterDepth || b.waterDepth || '').trim(),
    headClearance: String(r.headClearance || b.headClearance || '').trim(),
    duration: String(r.duration || b.duration || '').trim(),
    environment: String(r.environment || b.environment || '').trim(),
  }
}

function pickEmergency(raw, base) {
  const r = raw && typeof raw === 'object' ? raw : {}
  const b = base && typeof base === 'object' ? base : {}
  return {
    title: String(r.title || b.title || '').trim(),
    steps: asStringArray(r.steps?.length ? r.steps : b.steps),
  }
}

function pickCareVaseSection(raw, base) {
  const r = raw && typeof raw === 'object' ? raw : {}
  const b = base && typeof base === 'object' ? base : {}
  const wakeUp = pickWakeUp(r.wakeUp, b.wakeUp)
  const emergency = pickEmergency(r.emergency, b.emergency)
  const environment = pickEnvironment(r.environment, b.environment)
  const hasWakeUp = Object.values(wakeUp).some((v) => (Array.isArray(v) ? v.length : v))
  const hasEmergency = emergency.title || emergency.steps.length
  const out = {
    summary: String(r.summary || b.summary || '').trim(),
    vaseLife: String(r.vaseLife || b.vaseLife || '').trim(),
    vaseLifeNote: String(r.vaseLifeNote || b.vaseLifeNote || '').trim(),
    waterChange: String(r.waterChange || b.waterChange || '').trim(),
    trim: String(r.trim || b.trim || '').trim(),
    trimPosition: String(r.trimPosition || b.trimPosition || '').trim(),
    waterDepth: String(r.waterDepth || b.waterDepth || '').trim(),
    additives: String(r.additives || b.additives || '').trim(),
    tips: mergeStringArrays(r.tips, b.tips),
    environment,
  }
  if (hasWakeUp) out.wakeUp = wakeUp
  if (hasEmergency) out.emergency = emergency
  return out
}

function pickAtlasSection(raw, base) {
  const r = raw && typeof raw === 'object' ? raw : {}
  const b = base && typeof base === 'object' ? base : {}
  const cultivarRaw = r.cultivar || b.cultivar || {}
  const distinguishFrom = (r.distinguishFrom?.length ? r.distinguishFrom : b.distinguishFrom || [])
    .map((item) => ({
      name: String(item?.name || '').trim(),
      difference: String(item?.difference || '').trim(),
    }))
    .filter((item) => item.name && item.difference)
  const cultivar = {
    horticulturalGroup: String(cultivarRaw.horticulturalGroup || '').trim(),
    breeder: String(cultivarRaw.breeder || '').trim(),
    introducedYear: String(cultivarRaw.introducedYear || '').trim(),
    namingNote: String(cultivarRaw.namingNote || '').trim(),
  }
  const hasCultivar = Object.values(cultivar).some(Boolean)
  const out = {
    summary: String(r.summary || b.summary || '').trim(),
    paragraphs: asStringArray(r.paragraphs?.length ? r.paragraphs : b.paragraphs),
    features: asStringArray(r.features?.length ? r.features : b.features),
    bloomSeason: String(r.bloomSeason || b.bloomSeason || '').trim(),
    origin: String(r.origin || b.origin || '').trim(),
    productionRegions: asStringArray(
      r.productionRegions?.length ? r.productionRegions : b.productionRegions,
    ),
    distinguishFrom,
  }
  if (hasCultivar) out.cultivar = cultivar
  return out
}

function pickLanguageSection(raw, base) {
  const r = raw && typeof raw === 'object' ? raw : {}
  const b = base && typeof base === 'object' ? base : {}
  const pairing = (r.pairing?.length ? r.pairing : b.pairing || [])
    .map((item) => ({
      style: String(item?.style || '').trim(),
      flowers: asStringArray(item?.flowers),
      note: String(item?.note || '').trim(),
    }))
    .filter((item) => item.style || item.flowers.length)
  return {
    summary: String(r.summary || b.summary || '').trim(),
    paragraphs: asStringArray(r.paragraphs?.length ? r.paragraphs : b.paragraphs),
    meaning: String(r.meaning || b.meaning || '').trim(),
    occasions: asStringArray(r.occasions?.length ? r.occasions : b.occasions),
    colorMeanings: Array.isArray(r.colorMeanings)
      ? r.colorMeanings
      : Array.isArray(b.colorMeanings)
        ? b.colorMeanings
        : [],
    pairing,
    caution: String(r.caution || b.caution || '').trim(),
  }
}

function pickBloomSection(raw, base) {
  const r = raw && typeof raw === 'object' ? raw : {}
  const b = base && typeof base === 'object' ? base : {}
  const vaseBySeason = (r.vaseBySeason?.length ? r.vaseBySeason : b.vaseBySeason || [])
    .map((item) => ({
      season: String(item?.season || '').trim(),
      days: String(item?.days || '').trim(),
      note: String(item?.note || '').trim(),
    }))
    .filter((item) => item.season && item.days)
  const out = {
    vase: String(r.vase || b.vase || '').trim(),
    vaseNote: String(r.vaseNote || b.vaseNote || '').trim(),
    soil: String(r.soil || b.soil || '').trim(),
    soilNote: String(r.soilNote || b.soilNote || '').trim(),
  }
  if (vaseBySeason.length) out.vaseBySeason = vaseBySeason
  return out
}

function careEnvironmentText(environment) {
  if (!environment) return ''
  if (typeof environment === 'string') return environment.trim()
  return [
    environment.light,
    environment.airflow,
    environment.placement,
    ...(environment.avoid || []),
  ]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join('；')
}

module.exports = {
  asStringArray,
  pickEnvironment,
  pickWakeUp,
  pickEmergency,
  pickCareVaseSection,
  pickAtlasSection,
  pickLanguageSection,
  pickBloomSection,
  careEnvironmentText,
}
