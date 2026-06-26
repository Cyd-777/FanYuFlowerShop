import type { Ref } from 'vue'
import type { usePullRefresh } from '@/composables/usePullRefresh'
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
  /** 页面使用 AppNavBar 等自定义 Head */
  customHead?: boolean
  /**
   * 下拉刷新：true / 'page' = 整页原生；'content' = scroll-view 内手势下拉（无原生 refresher）。
   * 有 customHead 且 disableScroll 时自动走 content。
   */
  pullDownRefresh?: boolean | 'page' | 'content'
  /** content 模式：刷新前清空的 scroll-top（百科 Head 收起） */
  pullRefreshScrollTopRef?: Ref<number | undefined>
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

export type PagePullRefresh = ReturnType<typeof usePullRefresh>
