const WIKI_COLOR_HEX: Record<string, string> = {
  红: '#e53935',
  粉: '#f48fb1',
  白: '#f5f5f5',
  香槟: '#d4c4a8',
  黄: '#fdd835',
  紫: '#9c27b0',
  绿: '#66bb6a',
  橙: '#ff9800',
  蓝: '#42a5f5',
  黑: '#424242',
  金: '#ffb300',
  银: '#b0bec5',
}

const WIKI_OCCASION_ICON: Record<string, string> = {
  情人节: '💕',
  表白: '💌',
  纪念日: '🎁',
  婚礼: '💒',
  开业贺礼: '🎊',
  长辈祝寿: '🎂',
  节庆装饰: '🏮',
  法式花束: '💐',
  探病慰问: '🌿',
  毕业: '🎓',
  生日: '🎂',
}

export function resolveWikiColorHex(color: string): string {
  const name = String(color || '').trim()
  if (!name) return '#bdbdbd'
  for (const [key, hex] of Object.entries(WIKI_COLOR_HEX)) {
    if (name.includes(key)) return hex
  }
  return '#bdbdbd'
}

export function resolveWikiOccasionIcon(occasion: string): string {
  const text = String(occasion || '').trim()
  if (!text) return '✨'
  return WIKI_OCCASION_ICON[text] || '✨'
}

export function formatWikiColorLabel(color: string): string {
  const name = String(color || '').trim()
  if (!name) return ''
  return name.endsWith('色') ? name : `${name}色`
}

export function isLightWikiColor(hex: string): boolean {
  return hex === '#f5f5f5' || hex === '#d4c4a8' || hex === '#fdd835' || hex === '#ffb300'
}
