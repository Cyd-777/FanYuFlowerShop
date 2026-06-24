import Taro from '@tarojs/taro'
import { getCurrentPageRoute, isTabBarRoute } from '@/config/pageNav'

/** Tab 页全屏搜索：隐藏底部栏 */
export function hideTabBarForSearch() {
  if (!isTabBarRoute(getCurrentPageRoute())) return false
  Taro.hideTabBar({ animation: false }).catch(() => {})
  return true
}

export function showTabBarAfterSearch() {
  if (!isTabBarRoute(getCurrentPageRoute())) return
  Taro.showTabBar({ animation: false }).catch(() => {})
}
