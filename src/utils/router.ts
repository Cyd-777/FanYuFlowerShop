/**
 * 路由跳转封装
 * 根据 Taro 环境使用 navigateTo / switchTab 等
 */

type NavigateOptions = {
  url: string
}

/** 非 TabBar 页面跳转 */
export function navigateTo(opt: NavigateOptions) {
  return new Promise<void>((resolve, reject) => {
    wx.navigateTo({ ...opt, success: () => resolve(), fail: reject })
  })
}

/** TabBar 页面切换 */
export function switchTab(opt: NavigateOptions) {
  return new Promise<void>((resolve, reject) => {
    wx.switchTab({ ...opt, success: () => resolve(), fail: reject })
  })
}

/** 重定向（替换当前页） */
export function redirectTo(opt: NavigateOptions) {
  return new Promise<void>((resolve, reject) => {
    wx.redirectTo({ ...opt, success: () => resolve(), fail: reject })
  })
}

/** 返回上一页 */
export function navigateBack(delta = 1) {
  wx.navigateBack({ delta })
}
