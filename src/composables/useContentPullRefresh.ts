import { ref } from 'vue'
import { hidePullRefreshLoading, showPullRefreshLoading } from '@/utils/feedback'

/**
 * 内容区 scroll-view 下拉刷新：触发后立即复位 refresher，后台 SWR + 顶栏 loading。
 * 用于 Head 固定、仅内容区可拉动的页面（如商城右侧列表）。
 */
export function useContentPullRefresh(refresh: (force?: boolean) => Promise<void>) {
  const refresherTriggered = ref(false)

  async function onRefresherRefresh() {
    refresherTriggered.value = false
    showPullRefreshLoading()
    try {
      await refresh(true)
    } finally {
      hidePullRefreshLoading()
    }
  }

  return {
    refresherTriggered,
    onRefresherRefresh,
  }
}

/** 页面级原生下拉：触发后立即 stop，避免整页卡住到加载结束才弹回 */
export function runPagePullRefresh(
  refresh: (force?: boolean) => Promise<void>,
  stopPullDownRefresh: () => void,
) {
  stopPullDownRefresh()
  showPullRefreshLoading()
  void refresh(true).finally(() => {
    hidePullRefreshLoading()
  })
}
