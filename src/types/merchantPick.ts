export const MERCHANT_GOODS_PICK_KEY = 'merchant_goods_pick_ctx'

export interface MerchantGoodsPickContext {
  ruleId: string
  selectedIds: string[]
  consumed?: boolean
}

export function readMerchantGoodsPick(): MerchantGoodsPickContext | null {
  const raw = wx.getStorageSync(MERCHANT_GOODS_PICK_KEY) as MerchantGoodsPickContext | ''
  if (!raw || typeof raw !== 'object' || !raw.ruleId) return null
  return {
    ruleId: String(raw.ruleId),
    selectedIds: Array.isArray(raw.selectedIds) ? [...raw.selectedIds] : [],
    consumed: raw.consumed === true,
  }
}

export function writeMerchantGoodsPick(ctx: MerchantGoodsPickContext) {
  wx.setStorageSync(MERCHANT_GOODS_PICK_KEY, ctx)
}

export function markMerchantGoodsPickConsumed() {
  const ctx = readMerchantGoodsPick()
  if (!ctx) return
  writeMerchantGoodsPick({ ...ctx, consumed: true })
}
