import { getBizNotifySubscribeTmplIds } from '@/config/subscribe'
import { fetchBizNotifySubscribeConfig } from './client'

let cachedTmplIds: string[] = getBizNotifySubscribeTmplIds()
let prefetchPromise: Promise<string[]> | null = null

export function setCachedSubscribeTmplIds(ids: string[]) {
  cachedTmplIds = ids.filter(Boolean)
}

export function getCachedSubscribeTmplIds(): string[] {
  return cachedTmplIds
}

/** 登录/订阅弹窗用：本地配置优先，其次 prefetch 缓存 */
export function resolveSubscribeTmplIds(): string[] {
  const local = getBizNotifySubscribeTmplIds()
  if (local.length) return local
  return getCachedSubscribeTmplIds()
}

export async function prefetchSubscribeTmplIds(): Promise<string[]> {
  if (prefetchPromise) return prefetchPromise
  prefetchPromise = (async () => {
    const local = getBizNotifySubscribeTmplIds()
    if (local.length) {
      setCachedSubscribeTmplIds(local)
      return local
    }
    try {
      const ids = await fetchBizNotifySubscribeConfig()
      if (ids.length) setCachedSubscribeTmplIds(ids)
    } catch (err) {
      console.warn('[subscribe] prefetch tmpl ids failed:', err)
    }
    return getCachedSubscribeTmplIds()
  })()
  return prefetchPromise
}

/**
 * 登录按钮 tap 回调内 **同步** 调起 wx.requestSubscribeMessage。
 * 须在用户点击后立刻调用本函数（不可先 await 再调）。
 */
export function requestSubscribeOnLoginTap(tmplIds?: string[]): Promise<string[]> {
  const ids = (tmplIds?.length ? tmplIds : resolveSubscribeTmplIds()).filter(Boolean)
  if (!ids.length) return Promise.resolve([])

  return new Promise((resolve) => {
    wx.requestSubscribeMessage({
      tmplIds: ids,
      success: (res) => {
        resolve(ids.filter((id) => res[id] === 'accept'))
      },
      fail: (err) => {
        console.warn('[subscribe] requestSubscribeMessage failed:', err)
        resolve([])
      },
    })
  })
}

/** 调起微信订阅授权窗（须在用户点击回调中同步调用） */
export function invokeBizNotifySubscribe(tmplIds?: string[]): Promise<string[]> {
  return requestSubscribeOnLoginTap(tmplIds)
}
