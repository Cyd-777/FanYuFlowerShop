/** 主包 tabBar 中购物车 Tab 的下标 */
const CART_TAB_INDEX = 3

export function updateCartTabBadge(count: number) {
  if (count <= 0) {
    wx.removeTabBarBadge({ index: CART_TAB_INDEX })
    return
  }
  wx.setTabBarBadge({
    index: CART_TAB_INDEX,
    text: count > 99 ? '99+' : String(count),
  })
}
