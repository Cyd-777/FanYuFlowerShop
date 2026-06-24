import { showToast } from '@/utils/feedback'
import { ref } from 'vue'
import { submitStockIn } from '@/services/goods'
import type { StockInLine, StockInSession } from '@/types/stockIn'
import {
  clearStockInSession,
  readStockInSession,
  refreshStockInLinesFromCatalog,
  writeStockInSession,
} from '@/utils/stockInSession'
import type { PageEnsureContext } from '../types'
import type { PageSetupResult } from '../pageRegistry'
import { useMerchantGoods } from '@/composables/useMerchantGoods'

export function setupMerchantGoodsStockInPageData(): PageSetupResult & Record<string, unknown> {
  const merchant = useMerchantGoods()
  const session = ref<StockInSession | null>(null)
  const lines = ref<StockInLine[]>([])
  const submitting = ref(false)

  async function ensure(ctx: PageEnsureContext) {
    await merchant.loadGoods({ force: ctx.force })
    reloadSession()
  }

  function reloadSession() {
    refreshStockInLinesFromCatalog(merchant.catalogList.value)
    const current = readStockInSession()
    session.value = current
    lines.value = current?.lines ? [...current.lines] : []
    wx.setNavigationBarTitle({
      title: current?.mode === 'import' ? '进货单入库' : '批量入库',
    })
  }

  function persistLines() {
    if (!session.value) return
    session.value = { ...session.value, lines: lines.value }
    writeStockInSession(session.value)
  }

  function setQuantity(lineKey: string, quantity: number) {
    const line = lines.value.find((item) => item.lineKey === lineKey)
    if (!line || !line.goodsId) return
    line.quantity = Math.max(0, quantity)
    persistLines()
  }

  function bumpQuantity(lineKey: string, delta: number) {
    const line = lines.value.find((item) => item.lineKey === lineKey)
    if (!line || !line.goodsId) return
    setQuantity(lineKey, line.quantity + delta)
  }

  async function submit() {
    const items = lines.value
      .filter((line) => line.goodsId && line.quantity > 0)
      .map((line) => ({ goodsId: line.goodsId as string, delta: line.quantity }))

    if (!items.length) {
      showToast({ title: '请设置入库数量', icon: 'none' })
      return
    }

    submitting.value = true
    try {
      await submitStockIn(items)
      clearStockInSession()
      showToast({ title: '入库成功', icon: 'success' })
      setTimeout(() => {
        wx.reLaunch({ url: '/pagesMerchant/goods/list' })
      }, 800)
    } catch (err) {
      showToast({
        title: err instanceof Error ? err.message : '提交失败',
        icon: 'none',
      })
    } finally {
      submitting.value = false
    }
  }

  return {
    ensure,
    refreshOnShow: true,
    pullDownRefresh: false,
    session,
    lines,
    submitting,
    reloadSession,
    setQuantity,
    bumpQuantity,
    submit,
    catalogList: merchant.catalogList,
    loadGoods: merchant.loadGoods,
  }
}
