import { useMerchantGoods } from '@/composables/useMerchantGoods'
import { useMerchantCategories } from '@/composables/useMerchantCategories'
import type { PageEnsureContext } from '../types'
import type { PageSetupResult } from '../pageRegistry'

/** 商家商品列表：ensure 触发分类 + 商品加载 */
export function setupMerchantGoodsListPageData(): PageSetupResult & Record<string, unknown> {
  const merchant = useMerchantGoods()
  const { categories, loadCategories } = useMerchantCategories()

  async function ensure(ctx: PageEnsureContext) {
    await Promise.all([
      loadCategories({ force: ctx.force }),
      merchant.loadGoods({ force: ctx.force }),
    ])
  }

  return {
    ensure,
    refreshOnShow: true,
    pullDownRefresh: false,
    categories,
    loadCategories,
    ...merchant,
  }
}
