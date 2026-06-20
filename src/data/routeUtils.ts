/** 当前小程序页面 route，如 pages/home/index */
export function getCurrentRouteKey(): string {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as { route?: string } | undefined
  return page?.route || ''
}

export function normalizePageQuery(
  options?: Record<string, string | undefined>,
): Record<string, string | undefined> {
  if (!options) return {}
  const query: Record<string, string | undefined> = {}
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined) continue
    try {
      query[key] = decodeURIComponent(value)
    } catch {
      query[key] = value
    }
  }
  return query
}
