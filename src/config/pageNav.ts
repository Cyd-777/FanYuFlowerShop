import Taro from '@tarojs/taro'

/** overlay：虚化透明浮层，不占文档高度（Tab 页） */
/** spacer：带占位块，fixed 条 + 占位（子页） */
/** flow：文档流内嵌，随页面/scroll-view 滚动（百科 Tab） */
export type NavBarMode = 'overlay' | 'spacer' | 'flow'

export type NavBarBackground = 'transparent' | 'blur' | 'white'

/** 标题在 Head 中的对齐；center = 相对屏幕宽度居中（非 flex 剩余区） */
export type NavBarTitleAlign = 'center' | 'left'

export interface PageNavConfig {
  title?: string
  mode?: NavBarMode
  showBack?: boolean
  background?: NavBarBackground
  titleAlign?: NavBarTitleAlign
  /** @deprecated 使用 mode: 'overlay' */
  immersive?: boolean
}

/** TabBar 主包页面：默认 overlay（无体积 Head） */
export const TAB_BAR_ROUTES = new Set([
  'pages/home/index',
  'pages/category/index',
  'pages/wiki/index',
  'pages/cart/index',
  'pages/mine/index',
])

export const PAGE_NAV: Record<string, PageNavConfig> = {
  'pages/login/index': { title: '登录', showBack: false, mode: 'spacer' },
  'pages/home/index': { mode: 'overlay', background: 'transparent', title: '' },
  'pages/category/index': { title: '商城', background: 'blur' },
  'pages/wiki/index': { title: '花卉百科', background: 'blur', showBack: false },
  'pages/cart/index': { title: '购物车', background: 'blur' },
  'pages/mine/index': { mode: 'overlay', background: 'transparent', title: '' },
  'pages/invite/staff/index': { title: '商家邀请', showBack: true },
  'pages/invite/join/index': { title: '输入邀请码', showBack: true },

  'pagesCustomer/goods/detail': { title: '商品详情' },
  'pagesCustomer/goods/list': { title: '商品列表' },
  'pagesCustomer/search/index': { title: '搜索' },
  'pagesCustomer/customize/index': { title: '定制花束' },
  'pagesCustomer/customize/pick': { title: '选择商品' },
  'pagesCustomer/customize/preview': { title: '订单确认' },
  'pagesCustomer/order/confirm': { title: '确认订单' },
  'pagesCustomer/order/list': { title: '我的订单' },
  'pagesCustomer/order/detail': { title: '订单详情' },
  'pagesCustomer/member/index': { title: '会员中心' },
  'pagesCustomer/member/points': { title: '积分明细' },
  'pagesCustomer/member/level': { title: '会员等级' },
  'pagesCustomer/member/signin': { title: '每日签到' },
  'pagesCustomer/address/list': { title: '地址管理' },
  'pagesCustomer/address/edit': { title: '编辑地址' },
  'pagesCustomer/profile/edit': { title: '编辑资料' },
  'pagesCustomer/favorite/index': { title: '我的收藏' },
  'pagesCustomer/feedback/index': { title: 'Bug 反馈' },
  'pagesCustomer/other/index': { title: '关于我们' },
  'pagesCustomer/notify/list': { title: '消息通知' },
  'pagesCustomer/notify/send': { title: '发送通知' },
  'pagesCustomer/wiki/detail': { title: '' },
  'pagesCustomer/theme/index': { title: '专题活动' },

  'pagesMerchant/dashboard/index': { mode: 'overlay', background: 'transparent', title: '', showBack: false },
  'pagesMerchant/order/list': { title: '订单管理' },
  'pagesMerchant/order/detail': { title: '订单详情' },
  'pagesMerchant/goods/list': { title: '商品管理' },
  'pagesMerchant/goods/edit': { title: '' },
  'pagesMerchant/goods/stock-in': { title: '批量入库' },
  'pagesMerchant/goods/stock-in-import': { title: '进货单入库' },
  'pagesMerchant/goods/stock-out': { title: '批量出库' },
  'pagesMerchant/goods/warehouse-history': { title: '仓储历史' },
  'pagesMerchant/category/list': { title: '分类管理' },
  'pagesMerchant/category/edit': { title: '编辑分类' },
  'pagesMerchant/flower/picker': { title: '选择花卉' },
  'pagesMerchant/verify/index': { title: '扫码核销' },
  'pagesMerchant/staff/index': { title: '人员管理' },
  'pagesMerchant/staff/detail': { title: '工作人员信息' },
  'pagesMerchant/shop/setting': { title: '店铺设置' },
  'pagesMerchant/shop/sales-strategy/index': { title: '销售策略' },
  'pagesMerchant/shop/sales-strategy/edit': { title: '主题编辑' },
  'pagesMerchant/shop/goods-picker': { title: '选择折扣商品' },
  'pagesMerchant/asset/index': { title: '素材管理' },
  'pagesMerchant/wiki/index': { title: '智库维护' },
  'pagesMerchant/wiki/edit': { title: '词条编辑' },
  'pagesMerchant/wiki/care-reference': { title: '养护图示说明' },
}

const DEFAULT_NAV: PageNavConfig = {
  mode: 'spacer',
  background: 'white',
}

function resolveMode(config: PageNavConfig, isTab: boolean): NavBarMode {
  if (config.mode) return config.mode
  if (config.immersive === true) return 'overlay'
  if (config.immersive === false) return 'spacer'
  return isTab ? 'overlay' : 'spacer'
}

export function resolvePageNav(route: string): PageNavConfig & { mode: NavBarMode } {
  const config = PAGE_NAV[route] ?? {}
  const isTab = TAB_BAR_ROUTES.has(route)
  const mode = resolveMode(config, isTab)
  return {
    ...DEFAULT_NAV,
    ...config,
    mode,
    showBack: config.showBack ?? !isTab,
    background:
      config.background ??
      (mode === 'overlay' ? 'blur' : 'white'),
  }
}

export function getCurrentPageRoute(): string {
  const pages = Taro.getCurrentPages()
  const current = pages[pages.length - 1] as { route?: string } | undefined
  const route = current?.route ?? ''
  return route.startsWith('/') ? route.slice(1) : route
}

export function isTabBarRoute(route: string) {
  return TAB_BAR_ROUTES.has(route)
}
