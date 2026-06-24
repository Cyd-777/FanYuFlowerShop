import { useDidHide, useDidShow } from '@tarojs/taro'
import { goodsLiveSync, type GoodsLiveSyncRegistration } from '@/services/goodsLiveSync'

/**
 * 顾客端商品列表：注册 patch 回调，并启停前台定时轮询（20s）。
 * 浏览手势（useGoodsBrowseRefresh）在轮询空档内补充触发，仍走 meta 版本对齐。
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
