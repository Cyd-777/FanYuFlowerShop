/** L2 判定（与 audit-wiki-catalog-completeness-local.js 一致） */
function assessOverlayLevel(overlay) {
  if (!overlay) return { level: '-', missing: '无 overlay' }
  const missing = []
  const bloom = overlay.bloom || {}
  const atlas = overlay.atlas || {}
  const lang = overlay.language || {}
  const intro = atlas.intro

  if (!bloom.vase) missing.push('bloom.vase')
  if (!intro?.identity) missing.push('atlas.intro.identity')
  if (!lang.meaning) missing.push('language.meaning')
  if (!(lang.paragraphs?.length || lang.summary)) missing.push('language.body')

  const hasCare = overlay.careBaseRef || Object.keys(overlay.careVaseOverride || {}).length

  if (intro?.identity && lang.meaning && bloom.vase && (lang.paragraphs?.length || lang.summary)) {
    return { level: 'L2', missing: missing.length ? missing.join(', ') : '-' }
  }
  if (hasCare) {
    return { level: 'L1', missing: missing.length ? missing.join(', ') : '-' }
  }
  return { level: 'L0', missing: missing.join(', ') || '仅云库预期' }
}

module.exports = { assessOverlayLevel }
