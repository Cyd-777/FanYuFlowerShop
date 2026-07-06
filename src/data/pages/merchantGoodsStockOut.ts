import { showToast } from '@/utils/feedback'
import { ref } from 'vue'
import { submitStockOut } from '@/modules/goods'
import type { StockOutLine, StockOutSession } from '@/types/stockOut'
import {
  clearStockOutSession,
  readStockOutSession,
  refreshStockOutLinesFromCatalog,
  writeStockOutSession,
} from '@/utils/stockOutSession'
import type { PageEnsureContext } from '../types'
import type { PageSetupResult } from '../pageRegistry'
import { useMerchantGoods } from '@/composables/useMerchantGoods'

export function setupMerchantGoodsStockOutPageData(): PageSetupResult & Record<string, unknown> {
  const merchant = useMerchantGoods()
  const session = ref<StockOutSession | null>(null)
  const lines = ref<StockOutLine[]>([])
  const submitting = ref(false)

  async function ensure(ctx: PageEnsureContext) {
    await merchant.loadGoods({ force: ctx.force })
    reloadSession()
  }

  function reloadSession() {
    refreshStockOutLinesFromCatalog(merchant.catalogList.value)
    const current = readStockOutSession()
    session.value = current
    lines.value = current?.lines ? [...current.lines] : []
    wx.setNavigationBarTitle({ title: '批量出库' })
  }

  function persistLines() {
    if (!session.value) return
    session.value = { ...session.value, lines: lines.value }
    writeStockOutSession(session.value)
  }

  function maxQuantity(line: StockOutLine) {
    return Math.max(0, Number(line.currentStock) || 0)
  }

  function setQuantity(lineKey: string, quantity: number) {
    const line = lines.value.find((item) => item.lineKey === lineKey)
    if (!line) return
    line.quantity = Math.min(maxQuantity(line), Math.max(0, quantity))
    persistLines()
  }

  function bumpQuantity(lineKey: string, delta: number) {
    const line = lines.value.find((item) => item.lineKey === lineKey)
    if (!line) return
    setQuantity(lineKey, line.quantity + delta)
  }

  async function submit() {
    const items = lines.value
      .filter((line) => line.goodsId && line.quantity > 0)
      .map((line) => ({ goodsId: line.goodsId, delta: line.quantity }))

    if (!items.length) {
      showToast({ title: '请设置出库数量', icon: 'none' })
      return
    }

    submitting.value = true
    try {
      await submitStockOut(items)
      clearStockOutSession()
      showToast({ title: '出库成功', icon: 'success' })
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
    maxQuantity,
    catalogList: merchant.catalogList,
    loadGoods: merchant.loadGoods,
  }
}
