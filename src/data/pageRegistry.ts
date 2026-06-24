import type { PageEnsureContext } from './types'

export interface PageSetupResult {
  /** P0 数据加载（Repository + 调度器） */
  ensure: (ctx: PageEnsureContext) => Promise<void>
  /** 解析路由参数（如 id、tab、role） */
  onLoad?: (query: Record<string, string | undefined>) => void
  /** useDidShow 是否再次 ensure，默认 true */
  refreshOnShow?: boolean
  /** useDidShow 额外回调（不触发 ensure，如收藏态刷新） */
  onShow?: (ctx: PageEnsureContext) => void | Promise<void>
  /** 内容区 scroll-view 下拉（Head 不随动），由页面 bind 到 scroll-view */
  contentPullRefresh?: ReturnType<typeof useContentPullRefresh>
  /** 页面级原生下拉（触发后立即 stop 复位） */
  pullDownRefresh?: boolean | 'page' | 'content'
}

export type PageSetupFactory = () => PageSetupResult & Record<string, unknown>

/** route → 页面 setup 工厂（集中配置） */
export const PAGE_SETUP_REGISTRY: Record<string, PageSetupFactory> = {}

export function registerPageSetup(routeKey: string, factory: PageSetupFactory) {
  PAGE_SETUP_REGISTRY[routeKey] = factory
}

export function resolvePageSetupFactory(routeKey?: string): PageSetupFactory | null {
  const key = routeKey || getCurrentRouteKeyFromPages()
  if (!key) return null
  return PAGE_SETUP_REGISTRY[key] ?? null
}

function getCurrentRouteKeyFromPages(): string {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as { route?: string } | undefined
  return page?.route || ''
}
