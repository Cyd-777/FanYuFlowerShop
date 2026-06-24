import { showToast } from '@/utils/feedback'
import { prefetchNavigateTarget, prefetchTabTarget } from '@/data/prefetch/routeP0'
/**
 * 路由跳转封装
 * 根据 Taro 环境使用 navigateTo / switchTab 等
 */

type NavigateOptions = {
  url: string
}

/** 非 TabBar 页面跳转 */
export function navigateTo(opt: NavigateOptions) {
  prefetchNavigateTarget(opt.url)
  return new Promise<void>((resolve, reject) => {
    wx.navigateTo({ ...opt, success: () => resolve(), fail: reject })
  })
}

/** 跳转失败时 Toast 提示（便于排查未编译新页面等问题） */
export async function navigateToWithFeedback(opt: NavigateOptions, fallback = '页面跳转失败') {
  try {
    await navigateTo(opt)
  } catch (err) {
    const errMsg =
      err && typeof err === 'object' && 'errMsg' in err
        ? String((err as { errMsg: string }).errMsg)
        : ''
    const hint = errMsg.includes('not found') || errMsg.includes('不存在')
      ? '页面未注册，请重新编译小程序'
      : errMsg || fallback
    showToast({ title: hint.slice(0, 28), icon: 'none', duration: 2800 })
    console.error('[router] navigateTo failed:', opt.url, err)
  }
}

/** TabBar 页面切换 */
export function switchTab(opt: NavigateOptions) {
  prefetchTabTarget(opt.url)
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
