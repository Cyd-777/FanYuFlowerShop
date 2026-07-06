import { showToast } from '@/utils/feedback'
import { verifyPickupOrder } from '@/modules/order'
import type { Order } from '@/types/order'

export interface PickupVerifyScanResult {
  success: boolean
  message: string
  orderId?: string
  order?: Order
}

/** 解析取货码 QR：fyfs:pickup|{orderId}|{token} */
export function parsePickupQrContent(raw: string): { orderId: string; token: string } | null {
  const text = raw.trim()
  if (!text) return null
  const parts = text.split('|')
  if (parts.length < 3 || parts[0] !== 'fyfs:pickup') return null
  const orderId = parts[1]?.trim()
  const token = parts[2]?.trim()
  if (!orderId || !token) return null
  return { orderId, token }
}

/** 调起扫码并核销自提订单；可选 expectedOrderId 校验订单匹配 */
export async function scanAndVerifyPickup(options?: {
  expectedOrderId?: string
}): Promise<PickupVerifyScanResult> {
  try {
    const res = await wx.scanCode({ scanType: ['qrCode'] })
    const raw = (res.result || '').trim()
    if (!raw) {
      const message = '无法识别的订单码'
      showToast({ title: message, icon: 'none' })
      return { success: false, message }
    }

    const parsed = parsePickupQrContent(raw)
    if (!parsed) {
      const message = '订单码格式无效'
      showToast({ title: message, icon: 'none' })
      return {
        success: false,
        message: `扫码内容: ${raw.slice(0, 40)}${raw.length > 40 ? '…' : ''}`,
      }
    }

    if (options?.expectedOrderId && parsed.orderId !== options.expectedOrderId) {
      const message = '订单码与当前订单不匹配'
      showToast({ title: message, icon: 'none' })
      return { success: false, message, orderId: parsed.orderId }
    }

    const order = await verifyPickupOrder(parsed.orderId, parsed.token)
    showToast({ title: '核销成功', icon: 'success' })
    return {
      success: true,
      message: '订单已核销完成',
      orderId: parsed.orderId,
      order,
    }
  } catch (err) {
    if ((err as { errMsg?: string }).errMsg?.includes('cancel')) {
      return { success: false, message: '' }
    }
    const message = err instanceof Error ? err.message : '核销失败'
    showToast({ title: message, icon: 'none' })
    return { success: false, message }
  }
}
