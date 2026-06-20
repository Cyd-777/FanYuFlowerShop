import { ref } from 'vue'
import { navigateToWithFeedback } from '@/utils/router'
import {
  buildImportStockInSession,
  parsePurchaseOrderText,
  writeStockInSession,
} from '@/utils/stockInSession'
import type { PageEnsureContext } from '../types'
import type { PageSetupResult } from '../pageRegistry'
import { useMerchantGoods } from '@/composables/useMerchantGoods'

export function setupMerchantGoodsStockInImportPageData(): PageSetupResult & Record<string, unknown> {
  const merchant = useMerchantGoods()
  const orderText = ref('')
  const parsing = ref(false)

  async function ensure(ctx: PageEnsureContext) {
    await merchant.loadGoods({ force: ctx.force })
  }

  function parsePreview() {
    return parsePurchaseOrderText(orderText.value)
  }

  async function goStockInList() {
    const parsed = parsePreview()
    if (!parsed.length) {
      wx.showToast({
        title: '未识别到有效行，请检查格式',
        icon: 'none',
        duration: 2500,
      })
      return
    }

    parsing.value = true
    try {
      const session = buildImportStockInSession(parsed, merchant.catalogList.value)
      writeStockInSession(session)
      await navigateToWithFeedback({ url: '/pagesMerchant/goods/stock-in' })
    } catch (err) {
      wx.showToast({
        title: err instanceof Error ? err.message : '跳转失败',
        icon: 'none',
      })
    } finally {
      parsing.value = false
    }
  }

  return {
    ensure,
    refreshOnShow: false,
    pullDownRefresh: false,
    orderText,
    parsing,
    parsePreview,
    goStockInList,
  }
}
