/**
 * 微信云开发初始化
 */

let inited = false

export function initCloud() {
  if (inited) return
  wx.cloud.init({
    env: 'your-env-id', // TODO: 替换为实际云环境 ID
    traceUser: true,
  })
  inited = true
}

export function getCloud() {
  return wx.cloud
}
