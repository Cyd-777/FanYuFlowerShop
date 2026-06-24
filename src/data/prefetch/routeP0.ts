import { isTabBarRoute, getCurrentPageRoute } from '@/config/pageNav'
import {
  categoriesRepository,
  goodsRepository,
  wikiRepository,
} from '@/data/repository'
import { cacheSyncScheduler } from '@/data/scheduler/CacheSyncScheduler'
import { prefetchHomeP0Chain } from './homeFirstScreen'

function normalizeRoutePath(urlOrPath: string) {
  const raw = urlOrPath.split('?')[0].trim()
  const path = raw.startsWith('/') ? raw.slice(1) : raw
  return path
}

function parseQuery(url: string): Record<string, string> {
  const queryIndex = url.indexOf('?')
  if (queryIndex < 0) return {}
  const search = url.slice(queryIndex + 1)
  const out: Record<string, string> = {}
  for (const part of search.split('&')) {
    if (!part) continue
    const eq = part.indexOf('=')
    const key = decodeURIComponent(eq >= 0 ? part.slice(0, eq) : part)
    const val = decodeURIComponent(eq >= 0 ? part.slice(eq + 1) : '')
    if (key) out[key] = val
  }
  return out
}

/** 停留在某 Tab 时，拉满预取其余顾客 Tab 的 P0 包 */
export function prefetchOtherCustomerTabs(excludeRoute?: string) {
  const current = excludeRoute || getCurrentPageRoute()
  if (!isTabBarRoute(current)) return

  void (async () => {
    const tasks: Promise<unknown>[] = []

    if (current !== 'pages/home/index') {
      tasks.push(
        prefetchHomeP0Chain().catch((err) => {
          console.warn('[prefetch] home P0 warm failed:', err)
        }),
      )
    }

    if (current !== 'pages/category/index') {
      tasks.push(categoriesRepository.ensurePublicList({}))
      tasks.push(goodsRepository.ensurePublicList({}))
    }

    if (current !== 'pages/wiki/index') {
      tasks.push(
        wikiRepository.ensurePublicList({}).then(({ data }) => {
          wikiRepository.afterListLoaded(data)
        }),
      )
    }

    await Promise.allSettled(tasks)
    cacheSyncScheduler.kickIdleWorkerNow()
  })()
}

/** 点击跳转前预取目标页 P0（detail / 列表 / 搜索） */
export function prefetchNavigateTarget(url: string) {
  const path = normalizeRoutePath(url)
  const query = parseQuery(url)

  if (path === 'pagesCustomer/goods/detail' && query.id) {
    void goodsRepository.ensurePublicDetail(query.id).catch((err) => {
      console.warn('[prefetch] goods detail failed:', query.id, err)
    })
    return
  }

  if (path === 'pagesCustomer/wiki/detail' && query.id) {
    void wikiRepository.ensureDetail(query.id).catch((err) => {
      console.warn('[prefetch] wiki detail failed:', query.id, err)
    })
    return
  }

  if (path === 'pagesCustomer/goods/list' || path === 'pagesCustomer/search/index') {
    void categoriesRepository.ensurePublicList({}).catch(() => {})
    void goodsRepository.ensurePublicList({}).catch(() => {})
    void wikiRepository.ensurePublicList({}).catch(() => {})
    return
  }

  if (path === 'pages/category/index') {
    void categoriesRepository.ensurePublicList({}).catch(() => {})
    void goodsRepository.ensurePublicList({}).catch(() => {})
    return
  }

  if (path === 'pages/wiki/index') {
    void wikiRepository.ensurePublicList({}).catch(() => {})
    return
  }

  if (path === 'pages/home/index') {
    void prefetchHomeP0Chain().catch(() => {})
  }
}

/** Tab 切换前预取目标 Tab P0 */
export function prefetchTabTarget(url: string) {
  prefetchNavigateTarget(url)
  if (normalizeRoutePath(url) === 'pages/home/index') {
    void prefetchHomeP0Chain().catch(() => {})
  }
}
