import { ref } from 'vue'
import { useDidShow, useLoad } from '@tarojs/taro'
import { isTabBarRoute, getCurrentPageRoute } from '@/config/pageNav'
import { prefetchOtherCustomerTabs } from '@/data/prefetch/routeP0'
import { usePullRefresh, type PullRefreshMode } from '@/composables/usePullRefresh'
import { registerAllPageSetups } from '@/data/registerPages'
import { resolvePageSetupFactory } from '@/data/pageRegistry'
import { normalizePageQuery } from '@/data/routeUtils'
import type { PageSetupResult } from '@/data/pageRegistry'

registerAllPageSetups()

const noopSetup: PageSetupResult & Record<string, unknown> = {
  ensure: async () => {},
  refreshOnShow: false,
  pullDownRefresh: false,
}

function resolvePullMode(page: PageSetupResult): PullRefreshMode | false {
  const flag = page.pullDownRefresh
  if (!flag) return false
  if (flag === 'content') return 'content'
  if (flag === 'page') return 'page'
  if (page.customHead) return 'content'
  return 'page'
}

/**
 * 方案 A：根据当前 route 查注册表，自动 ensure + 生命周期。
 * 页面 script 只需：`const page = usePageData()` 并解构所需字段。
 */
export function usePageData(routeKey?: string) {
  const factory = resolvePageSetupFactory(routeKey)
  const page = factory ? factory() : { ...noopSetup }
  const queryRef = ref<Record<string, string | undefined>>({})
  const ensuring = ref(false)

  async function refresh(force = false) {
    ensuring.value = true
    try {
      await page.ensure({ force, query: queryRef.value })
    } finally {
      ensuring.value = false
      if (isTabBarRoute(getCurrentPageRoute())) {
        prefetchOtherCustomerTabs()
      }
    }
  }

  useLoad((options) => {
    queryRef.value = normalizePageQuery(options as Record<string, string | undefined>)
    page.onLoad?.(queryRef.value)
    void refresh(false)
  })

  useDidShow(() => {
    const ctx = { force: false, query: queryRef.value }
    if (page.onShow) {
      void page.onShow(ctx)
    }
    if (page.refreshOnShow !== false) {
      void refresh(false)
    }
  })

  const pullMode = resolvePullMode(page)
  const pullRefresh =
    pullMode !== false
      ? usePullRefresh((force) => refresh(force), pullMode, {
          scrollTopRef: page.pullRefreshScrollTopRef,
        })
      : undefined

  return {
    ...page,
    ensuring,
    refresh,
    pullRefresh,
  }
}
