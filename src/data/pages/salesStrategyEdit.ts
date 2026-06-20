import { ref } from 'vue'
import { useShopStore } from '@/stores/shop'
import { useMerchantGoods } from '@/composables/useMerchantGoods'
import { getShopThemePreset } from '@/types/shopTheme'
import type { ShopThemeId } from '@/types/shopTheme'
import type { PageEnsureContext } from '../types'
import type { PageSetupResult } from '../pageRegistry'

/** 销售策略编辑：ensure 拉店铺配置 + 商家商品目录（供折扣选品展示名称） */
export function setupSalesStrategyEditPageData(): PageSetupResult & Record<string, unknown> {
  const shopStore = useShopStore()
  const merchant = useMerchantGoods()
  const themeId = ref<ShopThemeId>('default')
  let shopHydrated = false

  function onLoad(query: Record<string, string | undefined>) {
    const raw = query.themeId as ShopThemeId | undefined
    if (raw) themeId.value = raw
    const preset = getShopThemePreset(themeId.value)
    wx.setNavigationBarTitle({ title: `${preset.name}主题` })
  }

  async function ensure(ctx: PageEnsureContext) {
    if (!shopHydrated || ctx.force) {
      await shopStore.hydrate({ force: true })
      shopHydrated = true
    }
    await merchant.loadGoods({ force: ctx.force })
  }

  return {
    ensure,
    onLoad,
    refreshOnShow: true,
    pullDownRefresh: false,
    shopStore,
    themeId,
    ...merchant,
  }
}
