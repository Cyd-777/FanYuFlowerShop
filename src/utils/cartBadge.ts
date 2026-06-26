import Taro from '@tarojs/taro'

/** 主包 tabBar 中购物车 Tab 的下标 */
const CART_TAB_INDEX = 3

const RETRY_DELAYS_MS = [0, 50, 200]

function applyCartTabBadge(count: number) {
  try {
    if (count <= 0) {
      void Taro.removeTabBarBadge({ index: CART_TAB_INDEX })
      return
    }
    void Taro.setTabBarBadge({
      index: CART_TAB_INDEX,
      text: count > 99 ? '99+' : String(count),
    })
  } catch (err) {
    console.warn('[cartBadge] update failed:', err)
  }
}

/** 写入 Tab 角标；分包页加购后 TabBar 可能晚一拍渲染，短间隔重试 */
export function updateCartTabBadge(count: number) {
  RETRY_DELAYS_MS.forEach((delay) => {
    if (delay === 0) {
      applyCartTabBadge(count)
      return
    }
    setTimeout(() => applyCartTabBadge(count), delay)
  })
}
