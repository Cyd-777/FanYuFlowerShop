/** 身份码 QR 协议前缀 */
export const IDENTITY_QR_PREFIX = 'fanuy:identity:'

export function encodeIdentityQr(openid: string): string {
  return `${IDENTITY_QR_PREFIX}${openid}`
}

/** 从扫码结果或粘贴文本解析 OpenID */
export function parseIdentityQr(raw: string): string | null {
  const text = (raw || '').trim()
  if (!text) return null

  if (text.startsWith(IDENTITY_QR_PREFIX)) {
    return text.slice(IDENTITY_QR_PREFIX.length)
  }

  // 兼容直接输入 / 扫 OpenID 文本
  if (/^o[A-Za-z0-9_-]{20,}$/.test(text)) {
    return text
  }

  return null
}

export function normalizeOpenid(raw: string): string | null {
  return parseIdentityQr(raw)
}
