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
