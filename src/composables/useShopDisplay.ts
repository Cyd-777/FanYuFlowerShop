import { useDidShow } from '@tarojs/taro'
import { useShopStore } from '@/stores/shop'
import { initCloudDatabase } from '@/services/initDb'

/** 页面展示时从云端同步店铺配置，并更新导航栏标题 */
export function useShopDisplay(options?: { navTitle?: boolean; initDb?: boolean }) {
  const shopStore = useShopStore()

  useDidShow(() => {
    void (async () => {
      if (options?.initDb) {
        try {
          await initCloudDatabase()
        } catch (err) {
          console.error('[initDb] failed:', err)
        }
      }

      await shopStore.hydrate()

      if (options?.navTitle !== false) {
        wx.setNavigationBarTitle({ title: shopStore.shopName })
      }
    })()
  })

  return shopStore
}
