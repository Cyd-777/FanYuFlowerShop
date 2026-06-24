const USER_ID_PATTERN = /^u_\d+_[a-z0-9]+$/

export function isUserId(value: string): boolean {
  return USER_ID_PATTERN.test(String(value || '').trim())
}

export function sanitizeUserId(value: string): string {
  const v = String(value || '').trim()
  return isUserId(v) ? v : ''
}

export function maskUserId(value: string): string {
  const v = String(value || '').trim()
  if (!isUserId(v)) return ''
  if (v.length <= 12) return v
  return `${v.slice(0, 6)}...${v.slice(-4)}`
}
