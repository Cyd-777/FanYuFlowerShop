import { CLOUD_ENV_ID } from '@/config/env'

/**
 * 微信云开发初始化
 */

let inited = false

export function initCloud() {
  if (inited) return

  if (!wx.cloud) {
    throw new Error('当前基础库不支持云开发，请升级微信版本或开发者工具')
  }

  const options: WechatMiniprogram.ICloudConfig = {
    traceUser: true,
  }

  if (CLOUD_ENV_ID) {
    options.env = CLOUD_ENV_ID
  }

  wx.cloud.init(options)
  inited = true
}

export function getCloud() {
  if (!inited) {
    initCloud()
  }
  return wx.cloud
}

/** 云函数调用时显式指定环境，避免多环境/默认环境不一致 */
export function getCloudCallConfig(): WechatMiniprogram.Cloud.CallFunctionConfig | undefined {
  if (!CLOUD_ENV_ID) return undefined
  return { env: CLOUD_ENV_ID }
}

/** 解析云函数 callFunction 抛出的错误，便于排查 */
export function formatCloudError(err: unknown): string {
  if (!err) return '未知错误'
  const anyErr = err as { errMsg?: string; message?: string; errCode?: number }
  const parts = [
    anyErr.errMsg,
    anyErr.message,
    anyErr.errCode != null ? `errCode: ${anyErr.errCode}` : '',
  ].filter(Boolean)
  return parts.join(' | ') || String(err)
}

/** 解析云函数返回值（部分基础库会返回 JSON 字符串） */
export function parseCloudResult<T>(raw: unknown): T {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as T
    } catch {
      return raw as T
    }
  }
  return raw as T
}
