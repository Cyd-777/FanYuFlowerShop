import { useDidShow } from '@tarojs/taro'
import { useCartStore } from '@/stores/cart'

/** Tab 页 onShow 时同步购物车角标（从分包加购返回后无需再切购物车 Tab） */
export function useCartTabBadgeSync() {
  const cartStore = useCartStore()

  function sync() {
    cartStore.refreshBadge()
  }

  useDidShow(sync)
  sync()
}
