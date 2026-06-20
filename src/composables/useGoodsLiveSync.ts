import { useDidHide, useDidShow } from '@tarojs/taro'
import { goodsLiveSync, type GoodsLiveSyncRegistration } from '@/services/goodsLiveSync'

/**
 * 顾客端商品列表前台轮询：meta.goods 版本变化时局部 patch 或静默整表刷新。
 * 须在页面 setup（如 setupHomePageData）内调用。
 */
export function useGoodsLiveSync(options: GoodsLiveSyncRegistration) {
  let registrationId = 0

  useDidShow(() => {
    if (registrationId) {
      goodsLiveSync.unregister(registrationId)
    }
    registrationId = goodsLiveSync.register(options)
  })

  useDidHide(() => {
    if (!registrationId) return
    goodsLiveSync.unregister(registrationId)
    registrationId = 0
  })
}
