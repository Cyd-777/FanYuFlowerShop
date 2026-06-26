import Taro from '@tarojs/taro'
import { getCurrentPageRoute, isTabBarRoute } from '@/config/pageNav'
import { updateCartTabBadge } from '@/utils/cartBadge'
import { STORAGE_KEYS } from '@/utils/constants'

function readCartTotalCount(): number {
  const raw = Taro.getStorageSync(STORAGE_KEYS.Cart)
  if (!Array.isArray(raw)) return 0
  return raw.reduce((sum, line) => sum + (Number(line?.count) || 0), 0)
}

/** Tab 页全屏搜索：隐藏底部栏 */
export function hideTabBarForSearch() {
  if (!isTabBarRoute(getCurrentPageRoute())) return false
  Taro.hideTabBar({ animation: false }).catch(() => {})
  return true
}

export function showTabBarAfterSearch() {
  if (!isTabBarRoute(getCurrentPageRoute())) return
  Taro.showTabBar({ animation: false }).catch(() => {})
  updateCartTabBadge(readCartTotalCount())
}
