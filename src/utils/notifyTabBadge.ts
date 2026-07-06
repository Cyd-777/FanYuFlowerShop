import Taro from '@tarojs/taro'
import { getCurrentPageRoute, isTabBarRoute } from '@/config/pageNav'

/** 主包 tabBar 中「我的」Tab 下标 */
export const MINE_TAB_INDEX = 4

const RETRY_DELAYS_MS = [0, 50, 200]

const DEFAULT_MINE_ICONS = {
  iconPath: 'images/tab/mine.png',
  selectedIconPath: 'images/tab/mine-active.png',
}

/** 未读时 Tab icon — 铃兰造型（见 src/images/tab/README.md · generate:tab-icons） */
const NOTIFY_MINE_ICONS = {
  iconPath: 'images/tab/mine-notify.png',
  selectedIconPath: 'images/tab/mine-notify-active.png',
}

/** 未读通知：Tab 角标 + 「我的」icon 切为消息样式（顾客与商家均适用） */
export function updateNotifyTabBadge(count: number, _isMerchant?: boolean) {
  RETRY_DELAYS_MS.forEach((delay) => {
    if (delay === 0) {
      applyNotifyTabBadge(count)
      return
    }
    setTimeout(() => applyNotifyTabBadge(count), delay)
  })
}

function applyNotifyTabBadge(count: number) {
  if (!isTabBarRoute(getCurrentPageRoute())) return

  try {
    void Taro.setTabBarItem({
      index: MINE_TAB_INDEX,
      ...(count > 0 ? NOTIFY_MINE_ICONS : DEFAULT_MINE_ICONS),
    }).catch(() => {})

    if (count <= 0) {
      void Taro.removeTabBarBadge({ index: MINE_TAB_INDEX }).catch(() => {})
      return
    }

    void Taro.setTabBarBadge({
      index: MINE_TAB_INDEX,
      text: count > 99 ? '99+' : String(count),
    }).catch(() => {})
  } catch (err) {
    console.warn('[notifyTabBadge] update failed:', err)
  }
}
